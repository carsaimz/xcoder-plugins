# Inspector (XCoder plugin)

DevTools-grade inspection for **any** page, inside XCoder:

- **Elements** — the live DOM as an expandable tree (tap the chevron to open nodes; long-press / context tap a node to see its box, computed styles and outer HTML).
- **Console** — captured `console.log/warn/error/info/debug`, page errors and unhandled rejections, plus a **run JS** input evaluated in the inspected page.
- **Network** — every `fetch`/XHR request with method, status, timing and content-type, filterable by type (xhr/js/css/img/font/doc).
- **Search** — find nodes with a CSS selector (`.btn`, `#app`, `div a`) and jump/highlight them.
- **Storage** (new in 1.1.0) — Application-tab parity: `localStorage`, `sessionStorage` and cookies of the inspected page, with per-entry value preview (tap), copy and delete (entries are deleted *inside* the page; HttpOnly cookies cannot be read or removed from JS).

## How it works

A hidden WebView session loads the page with a capture hook injected at **document-start**, so console and network recording starts before page scripts run. Nothing leaves the device.

## Português

**Inspector**: inspecção estilo DevTools de qualquer página — árvore de elementos (DOM), consola capturada (com «executar JS» na página), rede (fetch/XHR com estado/tempo/filtros), procura por seletor CSS com destaque e **Armazenamento** (localStorage, sessionStorage e cookies, com pré-visualização, cópia e eliminação por entrada).

## What's new

### 1.1.0
- **Storage tab** — localStorage / sessionStorage / cookies with value preview, copy and per-entry delete.

### 1.0.0
- Initial release on the Xcoder Marketplace — the former core tool, now an installable plugin.

---

Requires XCoder ≥ 1.8.43 (plugin API `webInspector`).
