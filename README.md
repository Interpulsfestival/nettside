# interpuls.no

Statisk flersidig nettside for Interpuls. Publiseres automatisk av Netlify ved hver endring på `main`.

- `index.html`, `program/`, `medvirkende/`, `bilder/`, `presse/`, `om/`, `partnere/`, `kontakt/` – ferdig rendrede sider (norsk)
- `en/` – de samme sidene på engelsk
- `css/site.css`, `js/site.js`, `fonts/` – felles stil, skript (lys/mørk, meny, lysbilde, skjema, GoatCounter-hendelser) og fonter
- `img/` – bilder
- `sitemap.xml`, `netlify.toml`, `404.html` – genereres sammen med sidene

Sidene **genereres** fra kildefila (prototypen med alt innhold i `T`, `PROGRAM`, `PEOPLE` osv.), som ikke ligger i dette offentlige repoet.
Ikke rediger HTML-filene for hånd – endre kilden og bygg på nytt. Bygget stopper hvis upubliserte 2027-data havner i utdataene.
