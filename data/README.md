# Skarp data

`wines.json` finns redan här och innehåller Systembolagets vinsortiment.
Hämta om det med:

```
node scripts/import-systembolaget.mjs
```

## Var datan kommer ifrån

Systembolaget stängde sin officiella produkt-API. Den öppna spegling som
återstår hämtar samma data och publicerar den vidare:

- <https://susbolaget.emrik.org/v1/products> (uppdateras 03:00 varje natt)
- <https://github.com/C4illin/systembolaget-data>

Det är en **tredjepartskälla**, inte Systembolaget själva.

Importen tar bort elva varor som Systembolaget filar under Vin > Aperitifer men
som är starksprit — Arak Jabalna 45 %, Fenjiu 53 %, Evan Williams 32,5 %. De är
inte vin, och med dem i filen påstod sidhuvudet fler viner än appen kunde visa.

## Vad som saknas

Speglingen serverar bara produkter. Två filer fattas, och de är precis de två
som skulle göra butiksfiltret skarpt i stället för uppskattat:

| Fil | Läge | Följd |
| --- | --- | --- |
| `wines.json` | **finns** | 14 377 viner, 4 981 producenter |
| `stores.json` | saknas | 84 inbyggda butiker används i stället |
| `stock.json` | saknas | lagret uppskattas ur sortimentsklassen |

Utan `stock.json` härleds butikslagret ur varje vins sortimentsklass — fast
sortiment i nästan varje butik, tillfälligt i ett fåtal, och beställnings-
sortiment i ingen alls. Tre av fyra viner är beställningsvaror. Fördelningen
är stabil mellan sidladdningar men den är en gissning, och vinsidan säger det
rakt ut. Se `src/lib/estimateStock.ts`.

Båda filerna kräver en API-nyckel från Systembolaget för att hämtas skarpt.

## Bara Sverige

Importen är Systembolagets katalog. Norge, Finland och USA kör vidare på
demosortimentet — deras butiker säljer inte det här sortimentet, och att visa
det hade varit ett löfte appen inte kan hålla.

## wines

Fältnamnen matchas skiftlägesokänsligt, och flera alias accepteras per fält.
Minimikravet är `productId` och `productNameBold`; allt annat gör bara appen
bättre.

| Fält | Alias som också fungerar | Används till |
| --- | --- | --- |
| `productId` | `id`, `nr` | Nyckel mot lagerfilen |
| `productNumber` | `productNumberShort`, `Varnummer` | Varunummer i butik |
| `productNameBold` | `Namn`, `name` | Vinets namn |
| `productNameThin` | `Namn2` | Underrubrik |
| `categoryLevel2` | `category`, `Varugrupp` | Rött/vitt/mousserande |
| `categoryLevel3` | `style` | Stil, t.ex. "Fylliga & Kryddiga" |
| `country`, `originLevel1`, `originLevel2` | `Ursprungsland`, `Ursprung` | Ursprung |
| `producerName` | `Producent` | Producent |
| `vintage` | `Årgång` | Årgång |
| `grapes` | `grapeVarieties`, `Druvor` | Druvor (array eller kommaseparerat) |
| `price`, `volume`, `alcoholPercentage` | `Pris`, `Volym`, `Alkoholhalt` | Pris, volym, alkohol |
| `tasteClockBody` m.fl. | `Fyllighet`, `Strävhet`, `Fruktsyra`, `Sötma`, `Fatkaraktär` | Smakklocka och matmatchning |
| `taste`, `usage` | `Smak`, `Användning` | Smaknot och serveringsförslag |
| `assortment` | `Sortiment` | FS / TSE / BS / BS-L |
| `isOrganic`, `isSustainableChoice`, `isVegan` | `Ekologisk`, `Hållbartval` | Märkningsfilter |

**Viktigast för matmatchningen:** smakklockorna och `usage`. Utan smakklocka
skattas fylligheten ur alkoholhalt och färg, vilket fungerar men blir trubbigare.

## stores

Kräver `siteId` samt koordinater. Koordinaterna får ligga antingen direkt på
raden (`latitude`/`longitude`) eller nästlade under `position` (`lat`/`long`),
vilket är formatet Systembolagets butiks-API använder.

| Fält | Alias | Används till |
| --- | --- | --- |
| `siteId` | `storeId`, `Nr` | Nyckel mot lagerfilen |
| `displayName` | `alias`, `Namn` | Butiksnamn |
| `streetAddress`, `postalCode`, `city`, `county` | `Address1`, `Postnr`, `Ort`, `Län` | Adress |
| `position.lat` / `latitude` | `lat` | Karta och avståndsberäkning |
| `position.long` / `longitude` | `lon`, `long` | Karta och avståndsberäkning |
| `openingHours[]` | `openHours` | Öppet/stängt-status |

## stock

En rad per kombination av butik och vara. Det här är filen som gör hela
butiksfiltret möjligt.

```json
[
  { "siteId": "0101", "productId": "12345", "quantity": 6 },
  { "siteId": "0101", "productId": "67890" }
]
```

`quantity` är valfritt. `siteId` måste finnas i `stores.json` och `productId`
i `wines.json` — annars räknas raden bort, och appen loggar hur många rader
som föll bort i webbläsarkonsolen.
