# interpuls.no

Statisk flersidig nettside for Interpuls. Publiseres automatisk av Netlify ved hver endring på `main`.

- `index.html`, `program/`, `medvirkende/`, `bilder/`, `presse/`, `om/`, `partnere/`, `kontakt/`: ferdig rendrede sider (norsk)
- `en/`: de samme sidene på engelsk
- `css/site.css`, `js/site.js`, `fonts/`: felles stil, skript og fonter
- `img/`: originalbilder. `img/r/`: AVIF/WebP-varianter i flere bredder (generert)
- `sitemap.xml`, `netlify.toml`, `404.html`: genereres sammen med sidene
- `tools/`: generatoren (inneholder ingen innholdsdata)

## Bygge på nytt

Alt innhold (tekster, program, medvirkende osv.) ligger i kildefila: prototypen i Claude-artefaktet,
med objektene `T`, `PROGRAM`, `PEOPLE` osv. **Kildefila skal aldri legges i dette offentlige repoet**,
fordi den inneholder upubliserte program. Last den ned til en mappe utenfor repoet.

Krever Node 18+ og Python 3 med Pillow (`pip install pillow`).

```bash
tools/build.sh ../kilde.html
```

Skriptet bygger alle sidene, lager bildevarianter og kopierer resultatet inn i repoet.
Bygget stopper hvis upubliserte 2027-data havner i utdataene. Se over med
`node tools/serve.mjs . img 8080` og `git status` før du committer.

Ikke rediger HTML-filene for hånd; de overskrives ved neste bygg.

- **Alt-tekster**: håndskrevne bildebeskrivelser legges i `tools/alt-overrides.json` (norsk, engelsk).
- **Programslipp 2027**: `tools/build.sh ../kilde.html --released`. Da lages `/program/2027`, én side per konsert
  (`/program/2027/<konsert>`), `/medvirkende/2027`, og `/program` og `/medvirkende` sender til 2027.
