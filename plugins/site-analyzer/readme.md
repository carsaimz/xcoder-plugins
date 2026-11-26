# Site Analyzer (XCoder plugin)

Descobre **o que foi usado para construir qualquer site**: frameworks, linguagens, servidores, CDNs, CMSs, analytics, fontes, widgets… com a **evidência** de cada correspondência (o cabeçalho ou o trecho de HTML que disparou a deteção), aba de detalhes (meta + cabeçalhos da resposta) e relatório copiável.

## Usage

- Sidebar: toque no ícone **Site Analyzer** (telescope) na barra lateral.
- Command palette: `Site Analyzer: open`.
- Cole um endereço (ex.: `exemplo.com`) e toque na lupa.
- «Versão renderizada» carrega a página numa WebView interna e analisa o **DOM final** — resolve sites SPA e bloqueios de bot/cors.

110+ assinaturas de deteção, 100% offline (nada é enviado para terceiros).

## Português

**Analisador de sites**: deteta a stack de qualquer site e mostra a evidência de cada deteção, detalhes (meta + cabeçalhos) e um relatório copiável. O botão «Versão renderizada» analisa o DOM final via WebView interna.

---

Requires XCoder ≥ 1.8.43 (plugin API `techDetect`, `webScraper`, `webInspector`).
