/*
 * Service worker.
 *
 * Syftet är inte snabbhet utan täckning: källarplanet på ett Systembolag har
 * sällan mottagning, och en app som säger "kunde inte ansluta" när man står
 * framför hyllan är värdelös just när den behövs.
 *
 * Strategi per resurstyp:
 *   - navigering: nät först, cache som reserv. Nytt innehåll vinner när det
 *     går, men appen startar alltid.
 *   - byggda tillgångar: cache först. De är innehållshashade, så en träff kan
 *     aldrig vara inaktuell.
 *   - typsnitt: cache först med lång livslängd.
 *
 * Ingen förhandscachning av en filnamnslista — filnamnen är hashade och listan
 * hade behövt genereras vid bygget. I stället fylls cachen på under första
 * besöket, vilket räcker: man hinner alltid använda appen en gång med täckning
 * innan man står i butiken.
 */

const VERSION = 'vk-3'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const FONTS = `${VERSION}-fonts`
const DATA = `${VERSION}-data`
const KEEP = new Set([SHELL, ASSETS, FONTS, DATA])

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

/**
 * Cache först, men hämta om i bakgrunden.
 *
 * Sortimentet är elva megabyte och uppdateras en gång i dygnet. Nät först
 * hade betytt elva megabyte vid varje sidladdning för data som nästan alltid
 * är oförändrad; cache först utan uppdatering hade betytt att priser och nya
 * viner aldrig kom fram. Den här ger sidan datan direkt ur cachen och byter
 * ut den tyst till nästa gång appen öppnas.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)

  const uppdatering = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  if (hit) return hit
  const färsk = await uppdatering
  if (färsk) return färsk
  throw new Error('sortimentet saknas i cachen och nätet svarar inte')
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put('./index.html', response.clone())
    return response
  } catch {
    // Hash-routing betyder att varje vy ligger i samma dokument, så
    // index.html räcker som reserv för alla sökvägar.
    const cached = (await cache.match('./index.html')) ?? (await cache.match('./'))
    if (cached) return cached
    throw new Error('offline utan cachad app')
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.origin === self.location.origin && /\/assets\/|\.(png|svg|webmanifest|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSETS))
    return
  }

  // Sortimentet. Det här är filen appen inte kan vara utan — utan den finns
  // inga viner att visa, och då hjälper det inte att skalet startar.
  if (url.origin === self.location.origin && url.pathname.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(request, DATA))
    return
  }

  // Skanningsmotorn: wasm och språkdata, runt 5 MB som hämtas första gången
  // någon skannar. De ändras bara när Tesseract uppdateras, så cache först är
  // rätt — och det är skillnaden mellan att skanna i en källare med täckning
  // och att skanna i en källare utan.
  if (url.origin === self.location.origin && url.pathname.includes('/ocr/')) {
    event.respondWith(cacheFirst(request, ASSETS))
    return
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONTS))
  }
})
