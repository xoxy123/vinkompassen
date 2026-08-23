# Importera skarp Systembolagsdata

Lägg filerna här och ladda om appen. Ingen kod behöver ändras — hittas
`wines.json` (eller `wines.csv`) används den i stället för demosortimentet.

```
public/data/wines.json    sortimentet
public/data/stores.json   butikerna
public/data/stock.json    vilka varor som finns i vilken butik
```

JSON eller CSV går lika bra. CSV får använda komma, semikolon eller tabb som
avgränsare — parsern gissar rätt själv.

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
