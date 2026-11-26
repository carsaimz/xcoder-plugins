# Inspector (XCoder plugin)

DevTools-grade inspection for **any** page, inside XCoder:

- **Elements** — the live DOM as an expandable tree (tap the chevron to open nodes; long-press / context tap a node to see its box, computed styles and outer HTML).
- **Console** — captured `console.log/warn/error/info/debug`, page errors and unhandled rejections, plus a **run JS** input evaluated in the inspected page.
- **Network** — every `fetch`/XHR request with method, status, timing and content-type, filterable by type (xhr/js/css/img/font/doc).
- **Search** — find nodes with a CSS selector (`.btn`, `#app`, `div a`) and jump/highlight them.

## How it works

A hidden WebView session loads the page with a capture hook injected at **document-start**, so console and network recording starts before page scripts run. Nothing leaves the device.

## Português

**Inspector**: inspecção estilo DevTools de qualquer página — árvore de elementos (DOM), consola capturada (com «executar JS» na página), rede (fetch/XHR com estado/tempo/filtros) e procura por seletor CSS com destaque.

---

Requires XCoder ≥ 1.8.43 (plugin API `webInspector`).
