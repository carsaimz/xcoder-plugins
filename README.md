# Xcoder Plugin Marketplace

Official plugin marketplace registry for **Xcoder** — the open-source code
editor for Android (an Acode fork). This repository holds the plugin index
(`plugins.json`) and every installable package (`plugins/<id>/plugin.zip`).

Repositório oficial do marketplace de plugins do **Xcoder**. Ele guarda o
índice de plugins (`plugins.json`) e os pacotes instaláveis
(`plugins/<id>/plugin.zip`).

## How it works | Como funciona

1. Xcoder fetches `plugins.json` from this repo (via jsDelivr, falling back
   to raw.githubusercontent.com).
2. The list is cached on the device, so the marketplace still works offline.
3. Installing a plugin downloads its `plugin.zip` and unpacks it locally.
4. If a plugin is missing from the remote list, the bundled fallback registry
   shipped inside the app keeps the marketplace populated.

O Xcoder busca o `plugins.json` deste repositório (jsDelivr, com fallback
para raw.githubusercontent.com), cacheia no dispositivo e instala os pacotes
localmente. O app ainda inclui uma cópia embutida da lista para uso offline.

## Submitting a plugin | Como submeter um plugin

1. Fork this repository | Faça um fork deste repositório.
2. Create `plugins/<your-plugin>/` containing:
   - `plugin.zip` — a zip with `plugin.json`, `main.js`, `icon.png` and an
     optional `readme.md` at the root of the archive;
   - `icon.png` — 128x128 icon (also added to the registry entry).
3. Add an entry to `plugins.json` with at least: `id`, `name`, `version`,
   `description` (markdown), `author`, `source` (direct zip URL),
   `icon` and `keywords`.
4. Open a pull request. Approved entries receive the `author_verified` badge
   after review. | Abra um pull request; entradas aprovadas recebem o selo
   `author_verified` após revisão.

## Plugin API

Plugins run inside the editor webview and use the global `xcoder` API:

```js
xcoder.setPluginInit("my.plugin", function (baseUrl, $page, options) {
  xcoder.addCommand({
    name: "my.plugin:action",
    description: "What the command does",
    exec(view) { /* view is a CodeMirror 6 EditorView */ },
  });
  xcoder.setPluginUnmount("my.plugin", function () {
    xcoder.removeCommand("my.plugin:action");
  });
});
```

Useful modules via `xcoder.require(...)`:

| Module | Description |
| --- | --- |
| `toast` | Show toast notifications |
| `select` / `prompt` / `alert` / `confirm` | Dialogs |
| `fs` | File system operations |
| `commands` | Command registry helpers |
| `@codemirror/*` | Full CodeMirror 6 modules |

## License

Registry metadata and bundled plugins: MIT. Each third-party plugin keeps
its own license.
