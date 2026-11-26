(function () {
        "use strict";
        var xcoder = window.xcoder;
        if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

        var PLUGIN_ID = "xcoder.scraper";
        var CSS_ID = PLUGIN_ID.replace(/\./g, "-") + "-css";
        var PAGE_ID = "plugin-scraper";

        var page = null;
        var root = null;
        var $url = null;
        var $status = null;
        var $source = null;
        var $assets = null;
        var $secrets = null;
        var $badgeAssets = null;
        var $badgeSecrets = null;
        var $beautifyLabel = null;
        var busy = false;
        var activeTab = "source";
        var showingBeautified = false;
        var source = null; // { mode, text, url }
        var assets = null;
        var secrets = null;
        var endpoints = null;

        function t(key, fallback) {
                try {
                        return (window.strings && window.strings[key]) || fallback;
                } catch (e) {
                        return fallback;
                }
        }

        function normalizeAddress(value) {
                var url = String(value || "").trim();
                if (!url) return null;
                if (/^https?:\/\//i.test(url)) return url;
                if (/^localhost(:\d+)?(\/|$)/i.test(url) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(url)) {
                        return "http://" + url;
                }
                return "https://" + url;
        }

        function el(tag, className, text) {
                var node = document.createElement(tag);
                if (className) node.className = className;
                if (text != null) node.textContent = text;
                return node;
        }

        function icon(name) {
                return el("span", "icon codicon-" + name);
        }

        function injectStyle() {
                if (document.getElementById(CSS_ID)) return;
                var css = [
                        ".xsc-tool{flex:1;width:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;font-size:14px;}",
                        ".xsc-urlbar{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--hairline,var(--border-color));}",
                        ".xsc-urlbar input{flex:1;min-width:0;padding:10px 12px;border-radius:var(--radius-sm,8px);border:1px solid var(--hairline,var(--border-color));background:var(--surface-2,var(--primary-color));color:var(--primary-text-color);font-size:14px;outline:none;}",
                        ".xsc-urlbar .icon{padding:8px;opacity:.8;}",
                        ".xsc-status{padding:7px 12px;font-size:12.5px;opacity:.75;border-bottom:1px solid var(--hairline,var(--border-color));min-height:18px;}",
                        ".xsc-tabs{display:flex;gap:4px;padding:8px 10px 0;}",
                        ".xsc-tab{display:flex;align-items:center;gap:6px;padding:8px 12px;border:none;background:none;color:var(--primary-text-color);opacity:.6;font-size:13px;border-bottom:2px solid transparent;}",
                        ".xsc-tab.active{opacity:1;border-bottom-color:var(--primary-color,#4f8cff);}",
                        ".xsc-tab .xsc-badge{background:var(--primary-color,#4f8cff);color:#fff;border-radius:var(--radius-full,999px);font-size:11px;padding:1px 7px;}",
                        ".xsc-panel{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;padding:10px 12px 24px;}",
                        ".xsc-panel.hidden{display:none;}",
                        ".xsc-actions{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;}",
                        ".xsc-btn{display:flex;align-items:center;gap:6px;padding:9px 14px;border-radius:var(--radius-sm,8px);border:1px solid var(--hairline,var(--border-color));background:var(--surface-1,var(--secondary-color));color:var(--primary-text-color);font-size:13px;}",
                        ".xsc-btn:active{background:var(--surface-active,var(--active-color));}",
                        ".xsc-source{background:var(--surface-2,var(--primary-color));border:1px solid var(--hairline,var(--border-color));border-radius:var(--radius-sm,8px);padding:12px;font-size:12px;white-space:pre-wrap;word-break:break-word;color:var(--primary-text-color);font-family:monospace;margin:0;}",
                        ".xsc-group{margin-bottom:14px;}",
                        ".xsc-group h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;opacity:.55;margin:0 0 6px;}",
                        ".xsc-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface-1,var(--secondary-color));border:1px solid var(--hairline,var(--border-color));border-radius:var(--radius-sm,8px);margin-bottom:6px;font-size:12.5px;}",
                        ".xsc-item-kind{opacity:.5;font-size:11px;text-transform:uppercase;flex:0 0 auto;}",
                        ".xsc-item-name{flex:1;word-break:break-all;}",
                        ".xsc-item-link{color:var(--primary-color,#4f8cff);font-size:11.5px;flex:0 0 auto;text-decoration:none;}",
                        ".xsc-secret{background:var(--surface-1,var(--secondary-color));border:1px solid var(--hairline,var(--border-color));border-radius:var(--radius-sm,8px);padding:8px 10px;margin-bottom:6px;font-size:12.5px;word-break:break-all;}",
                        ".xsc-secret-kind{color:#e2b341;font-weight:600;}",
                        ".xsc-secret-val{font-family:monospace;font-size:11.5px;opacity:.85;}",
                        ".xsc-empty{padding:24px 12px;opacity:.5;text-align:center;font-size:13px;}",
                        ".xsc-hint{font-size:12px;opacity:.6;margin:0 0 12px;}",
                ].join("\n");
                var style = document.createElement("style");
                style.id = CSS_ID;
                style.textContent = css;
                document.head.appendChild(style);
        }

        function setStatus(text, busyNow) {
                if (!$status) return;
                $status.textContent = text;
                $status.dataset.busy = busyNow ? "1" : "";
        }

        function makeTab(name, iconName, label) {
                var tab = el("button", "xsc-tab" + (name === activeTab ? " active" : ""));
                tab.type = "button";
                tab.dataset.tab = name;
                tab.appendChild(icon(iconName));
                tab.appendChild(document.createTextNode(label));
                var badge = el("span", "xsc-badge hidden");
                badge.dataset.badge = name;
                tab.appendChild(badge);
                tab.addEventListener("click", function () {
                        switchTab(name);
                });
                return tab;
        }

        function switchTab(tab) {
                activeTab = tab;
                if (!root) return;
                root.querySelectorAll(".xsc-tab").forEach(function ($tab) {
                        $tab.classList.toggle("active", $tab.dataset.tab === tab);
                });
                root.querySelectorAll(".xsc-panel").forEach(function ($panel) {
                        $panel.classList.toggle("hidden", $panel.dataset.panel !== tab);
                });
        }

        function refreshBadges() {
                if (!root) return;
                root.querySelectorAll("[data-badge]").forEach(function ($badge) {
                        var name = $badge.dataset.badge;
                        var count =
                        name === "assets"
                                ? assets && assets.all
                                        ? assets.all.length
                                        : 0
                                : name === "secrets"
                                        ? (secrets ? secrets.length : 0) +
                                                (endpoints
                                                        ? (endpoints.urls || []).length + (endpoints.apiPaths || []).length
                                                        : 0)
                                        : 0;
                        $badge.textContent = count ? String(count) : "";
                        $badge.classList.toggle("hidden", !count);
                });
        }

        function buildRoot() {
                root = el("div", "container xsc-tool");

                var urlbar = el("div", "xsc-urlbar");
                $url = el("input");
                $url.type = "url";
                $url.placeholder = "https://exemplo.com";
                $url.spellcheck = false;
                $url.setAttribute("enterkeyhint", "go");
                $url.addEventListener("keydown", function (e) {
                        if (e.key === "Enter") scrape();
                });
                var go = icon("search");
                go.setAttribute("role", "button");
                go.addEventListener("click", function () {
                        scrape();
                });
                urlbar.appendChild($url);
                urlbar.appendChild(go);

                $status = el("div", "xsc-status", t("scraper idle", "Introduza um endereço para obter o código"));

                var tabs = el("div", "xsc-tabs");
                tabs.appendChild(makeTab("source", "file-code", t("scraper source", "Fonte")));
                var tabAssets = makeTab("assets", "json", t("scraper assets", "Recursos"));
                $badgeAssets = tabAssets.querySelector("[data-badge]");
                tabs.appendChild(tabAssets);
                var tabSecrets = makeTab("secrets", "key", t("scraper secrets", "Segredos"));
                $badgeSecrets = tabSecrets.querySelector("[data-badge]");
                tabs.appendChild(tabSecrets);

                var sourcePanel = el("div", "xsc-panel");
                sourcePanel.dataset.panel = "source";
                var srcActions = el("div", "xsc-actions");
                var copyBtn = el("button", "xsc-btn");
                copyBtn.type = "button";
                copyBtn.appendChild(icon("copy"));
                copyBtn.appendChild(document.createTextNode(t("scraper copy", "Copiar")));
                copyBtn.addEventListener("click", copySource);
                var beautifyBtn = el("button", "xsc-btn");
                beautifyBtn.type = "button";
                beautifyBtn.appendChild(icon("wand"));
                $beautifyLabel = document.createTextNode(t("scraper beautify", "Embelezar"));
                beautifyBtn.appendChild($beautifyLabel);
                beautifyBtn.addEventListener("click", toggleBeautified);
                var saveBtn = el("button", "xsc-btn");
                saveBtn.type = "button";
                saveBtn.appendChild(icon("save"));
                saveBtn.appendChild(document.createTextNode(t("scraper save", "Guardar")));
                saveBtn.addEventListener("click", saveSource);
                var openBtn = el("button", "xsc-btn");
                openBtn.type = "button";
                openBtn.appendChild(icon("go-to-file"));
                openBtn.appendChild(document.createTextNode(t("scraper open editor", "Abrir no editor")));
                openBtn.addEventListener("click", openInEditor);
                srcActions.appendChild(copyBtn);
                srcActions.appendChild(beautifyBtn);
                srcActions.appendChild(saveBtn);
                srcActions.appendChild(openBtn);
                sourcePanel.appendChild(srcActions);
                sourcePanel.appendChild(el("p", "xsc-hint", t("scraper hint", "Fonte bruta via HTTP nativo → fetch → WebView renderizada; embelezamento local.")));
                $source = el("pre", "xsc-source");
                sourcePanel.appendChild($source);

                var assetsPanel = el("div", "xsc-panel hidden");
                assetsPanel.dataset.panel = "assets";
                $assets = el("div", "xsc-assets-out");
                assetsPanel.appendChild($assets);

                var secretsPanel = el("div", "xsc-panel hidden");
                secretsPanel.dataset.panel = "secrets";
                $secrets = el("div", "xsc-secrets-out");
                secretsPanel.appendChild($secrets);

                root.appendChild(urlbar);
                root.appendChild($status);
                root.appendChild(tabs);
                root.appendChild(sourcePanel);
                root.appendChild(assetsPanel);
                root.appendChild(secretsPanel);
        }

        // ----------------------------------------------------------- mini beautify

        function beautifyHtml(code) {
                var out = [];
                var depth = 0;
                var UNIT = "  ";
                var tokens = String(code || "")
                        .replace(/>\s*</g, ">\n<")
                        .split("\n");
                for (var i = 0; i < tokens.length; i++) {
                        var line = tokens[i].trim();
                        if (!line) continue;
                        if (/^<\/(div|section|article|header|footer|main|nav|ul|ol|li|table|thead|tbody|tr|td|th|form|fieldset|details|summary|select|option|body|html|head|script|style|template|aside|figure|video|audio|button|label|a|h[1-6]|p|span|blockquote|pre|dl|dt|dd|iframe|svg|path|title|meta)\b/i.test(line)) {
                                depth = Math.max(0, depth - 1);
                        }
                        out.push(UNIT.repeat(depth) + line);
                        var isOpenTag = /^<(?!\/)[a-z!]/i.test(line);
                        var isVoid = /\/>$/.test(line) || /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(line);
                        var isDocType = /^<!/i.test(line);
                        var closesInline = line.indexOf("</") > 0 && isOpenTag;
                        if (isOpenTag && !isVoid && !isDocType && !closesInline) depth++;
                }
                return out.join("\n");
        }

        function beautifyCss(code) {
                var formatted = String(code || "")
                        .replace(/\s*{\s*/g, " {\n  ")
                        .replace(/;\s*/g, ";\n  ")
                        .replace(/\s*}\s*/g, "\n}\n")
                        .replace(/\n\s*\n/g, "\n")
                        .replace(/\/\*+/g, "\n/*");
                return formatted;
        }

        function beautifyJs(code) {
                var out = [];
                var depth = 0;
                var UNIT = "  ";
                var lines = String(code || "").replace(/;{2,}/g, ";").replace(/\r/g, "").split(/(?<=[;{}])\s*/);
                for (var i = 0; i < lines.length; i++) {
                        var line = lines[i].trim();
                        if (!line) continue;
                        var closing = /^[}\)\]]/.test(line);
                        if (closing) depth = Math.max(0, depth - 1);
                        out.push(UNIT.repeat(Math.min(depth, 40)) + line);
                        var opens = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
                        if (opens > 0) depth += opens;
                        else if (opens < 0 && !closing) depth = Math.max(0, depth + opens);
                }
                return out.join("\n");
        }

        function guessLanguage(code) {
                var head = String(code || "").slice(0, 2000).toLowerCase();
                if (/^\s*<\?xml|<!doctype html|<html[\s>]/i.test(head)) return "html";
                if (/^\s*[.#@a-z][\w-]*\s*\{/m.test(head) && !/function|=>|var |const /i.test(head)) return "css";
                if (/function|=>|var |const |let |window\.|document\./i.test(head)) return "js";
                return "html";
        }

        function beautify(code) {
                var lang = guessLanguage(code);
                try {
                        if (lang === "css") return beautifyCss(code);
                        if (lang === "js") return beautifyJs(code);
                        return beautifyHtml(code);
                } catch (e) {
                        return code;
                }
        }

        // -------------------------------------------------------------- fetch flow

        function scrape() {
                var target = normalizeAddress($url && $url.value);
                if (!target || busy) {
                        if (!target) setStatus(t("scraper idle", "Introduza um endereço para obter o código"));
                        return;
                }
                var webScraper = xcoder.require("webScraper");
                var webInspector = xcoder.require("webInspector");
                busy = true;
                source = null;
                assets = null;
                secrets = null;
                endpoints = null;
                showingBeautified = false;
                if ($beautifyLabel) $beautifyLabel.textContent = t("scraper beautify", "Embelezar");
                renderSource();
                renderAssets();
                renderSecrets();
                refreshBadges();
                setStatus(t("scraper fetching", "A obter") + " " + target + " …", true);

                var chain = webScraper
                        .httpFetchDetailed(target, { timeoutMs: 30000 })
                        .then(function (res) {
                                return {
                                        mode: "raw",
                                        text: String(res.text || ""),
                                        url: res.url || target,
                                        note: "HTTP " + res.status,
                                };
                        })
                        .catch(function (rawError) {
                                setStatus(t("scraper fallback fetch", "HTTP falhou — a tentar fetch…"), true);
                                return fetch(target, { credentials: "omit" })
                                        .then(function (res) {
                                                return res.text().then(function (text) {
                                                        return { mode: "raw", text: text, url: target, note: "fetch " + res.status };
                                                });
                                        })
                                        .catch(function () {
                                                setStatus(t("scraper fallback rendered", "A carregar a versão renderizada…"), true);
                                                return webInspector.fetchRenderedHtml(target, { timeoutMs: 25000 }).then(function (rendered) {
                                                        return { mode: "rendered", text: rendered.html || "", url: rendered.url || target, note: "WebView" };
                                                });
                                        });
                                // rawError intentionally shadowed by outer handlers
                        });

                chain
                        .then(function (result) {
                                source = result;
                                try {
                                        assets = webScraper.extractAssets(result.text, result.url);
                                        secrets = webScraper.findSecrets(result.text);
                                        endpoints = webScraper.findEndpoints(result.text);
                                } catch (e) {
                                        console.error(e);
                                }
                                renderSource();
                                renderAssets();
                                renderSecrets();
                                refreshBadges();
                                setStatus(t("scraper done", "Código obtido") + " — " + result.note);
                        })
                        .catch(function (error) {
                                setStatus(t("scraper failed", "Falha ao obter o site") + ": " + ((error && error.message) || error));
                        })
                        .finally(function () {
                                busy = false;
                        });
        }

        // ---------------------------------------------------------------- render

        function renderSource() {
                if (!$source) return;
                if (!source) {
                        $source.textContent = "";
                        return;
                }
                var text = showingBeautified ? beautify(source.text) : source.text;
                var MAX = 120000;
                $source.textContent =
                        text.length > MAX
                                ? text.slice(0, MAX) + "\n\n… " + t("scraper truncated", "truncado na pré-visualização — usar Copiar/Guardar para o código completo")
                                : text;
        }

        function renderAssets() {
                if (!$assets) return;
                if (!assets || !assets.all || !assets.all.length) {
                        $assets.replaceChildren(el("div", "xsc-empty", t("scraper no assets", "Sem recursos — obtenha um site primeiro")));
                        return;
                }
                var out = el("div");
                var byKind = {};
                assets.all.forEach(function (asset) {
                        var kind = String(asset.type || "other");
                        (byKind[kind] = byKind[kind] || []).push(asset);
                });
                Object.keys(byKind).forEach(function (kind) {
                        var list = byKind[kind] || [];
                        if (!list.length) return;
                        var group = el("section", "xsc-group");
                        group.appendChild(el("h3", null, kind + " (" + list.length + ")"));
                        list.slice(0, 200).forEach(function (asset) {
                                var row = el("div", "xsc-item");
                                row.appendChild(el("span", "xsc-item-name", String(asset.name || asset.url || "")));
                                var link = el("a", "xsc-item-link", t("scraper open", "abrir"));
                                link.href = String(asset.url || "#");
                                link.target = "_blank";
                                link.rel = "noopener noreferrer";
                                row.appendChild(link);
                                group.appendChild(row);
                        });
                        out.appendChild(group);
                });
                $assets.replaceChildren(out);
        }

        function renderSecrets() {
                if (!$secrets) return;
                var noSecrets = !secrets || !secrets.length;
                var urls = endpoints ? endpoints.urls || [] : [];
                var apiPaths = endpoints ? endpoints.apiPaths || [] : [];
                var noEndpoints = !urls.length && !apiPaths.length;
                if (noSecrets && noEndpoints) {
                        $secrets.replaceChildren(el("div", "xsc-empty", t("scraper no secrets", "Nada encontrado — obtenha um site primeiro")));
                        return;
                }
                var out = el("div");
                if (noSecrets === false) {
                        var group = el("section", "xsc-group");
                        group.appendChild(el("h3", null, t("scraper secrets found", "Segredos expostos") + " (" + secrets.length + ")"));
                        secrets.slice(0, 100).forEach(function (secret) {
                                var box = el("div", "xsc-secret");
                                box.appendChild(el("div", "xsc-secret-kind", String(secret.kind || secret.type || "secret")));
                                box.appendChild(el("div", "xsc-secret-val", String(secret.masked || secret.value || secret.match || "")));
                                group.appendChild(box);
                        });
                        out.appendChild(group);
                }
                if (noEndpoints === false) {
                        var group2 = el("section", "xsc-group");
                        group2.appendChild(el("h3", null, t("scraper endpoints", "Endpoints / APIs") + " (" + (urls.length + apiPaths.length) + ")"));
                        urls.slice(0, 80).forEach(function (endpoint) {
                                var box = el("div", "xsc-secret");
                                box.appendChild(el("div", "xsc-secret-val", String(endpoint.value || endpoint.match || endpoint.url || endpoint)));
                                group2.appendChild(box);
                        });
                        apiPaths.slice(0, 40).forEach(function (endpoint) {
                                var box = el("div", "xsc-secret");
                                box.appendChild(el("div", "xsc-secret-val", String(endpoint.value || endpoint.match || endpoint.url || endpoint)));
                                group2.appendChild(box);
                        });
                        out.appendChild(group2);
                }
                $secrets.replaceChildren(out);
        }

        // ----------------------------------------------------------------- actions

        function copySource() {
                if (!source || !source.text) {
                        xcoder.require("toast")(t("scraper nothing", "Obtenha um site primeiro"), 2500);
                        return;
                }
                xcoder
                        .require("clipboard")
                        .copyText(source.text)
                        .then(function () {
                                xcoder.require("toast")(t("scraper copied", "Código copiado"), 2000);
                        })
                        .catch(function () {
                                xcoder.require("toast")(t("scraper copy failed", "Não foi possível copiar"), 2500);
                        });
        }

        function toggleBeautified() {
                if (!source || !source.text) {
                        xcoder.require("toast")(t("scraper nothing", "Obtenha um site primeiro"), 2500);
                        return;
                }
                showingBeautified = !showingBeautified;
                if ($beautifyLabel) {
                        $beautifyLabel.textContent = showingBeautified ? t("scraper raw", "Bruto") : t("scraper beautify", "Embelezar");
                }
                setStatus(t("scraper beautifying", "A embelezar…"), true);
                // paint the status BEFORE the (synchronous, main-thread) formatting
                setTimeout(function () {
                        renderSource();
                        setStatus(showingBeautified ? t("scraper beautified", "Embelezado") : t("scraper raw shown", "Fonte bruta"));
                }, 30);
        }

        function saveSource(openAfter) {
                if (!source || !source.text) {
                        xcoder.require("toast")(t("scraper nothing", "Obtenha um site primeiro"), 2500);
                        return Promise.resolve();
                }
                var fs = xcoder.require("fsOperation");
                var Url = xcoder.require("Url");
                var downloadManager = xcoder.require("downloadManager");
                var host = "site";
                try {
                        host = new URL(source.url).host.replace(/[^\w.-]/g, "_") || "site";
                } catch (e) {}
                var dir = Url.join(downloadManager.defaultDownloadDir(), host);
                var name = source.mode === "rendered" ? "index-rendered.html" : "index.html";
                var defaultPath = Url.join(dir, name);

                var finish = function (path) {
                        if (!path) return Promise.resolve();
                        return downloadManager
                                .ensureDirDeep(Url.dirname(path))
                                .then(function () {
                                        var fileFs = fs(path);
                                        return fileFs.exists().then(function (exists) {
                                                if (exists) return fileFs.writeFile(source.text);
                                                return fs(Url.dirname(path)).createFile(Url.basename(path), source.text);
                                        });
                                })
                                .then(function () {
                                        xcoder.require("toast")(t("scraper saved", "Guardado") + ": " + path, 2500);
                                        if (openAfter) {
                                                try {
                                                        new xcoder.EditorFile(path, { render: true });
                                                } catch (e) {
                                                        console.error(e);
                                                }
                                        }
                                })
                                .catch(function (error) {
                                        xcoder.require("toast")(String((error && error.message) || error), 3000);
                                });
                };

                return xcoder
                        .require("prompt")(t("scraper save as", "Guardar como"), defaultPath, "text")
                        .then(finish)
                        .catch(function () {});
        }

        function openInEditor() {
                if (!source || !source.text) {
                        xcoder.require("toast")(t("scraper nothing", "Obtenha um site primeiro"), 2500);
                        return;
                }
                var fs = xcoder.require("fsOperation");
                var Url = xcoder.require("Url");
                var downloadManager = xcoder.require("downloadManager");
                var host = "site";
                try {
                        host = new URL(source.url).host.replace(/[^\w.-]/g, "_") || "site";
                } catch (e) {}
                var dir = Url.join(downloadManager.defaultDownloadDir(), host);
                var name = source.mode === "rendered" ? "index-rendered.html" : "index.html";
                var path = Url.join(dir, name);
                downloadManager
                        .ensureDirDeep(dir)
                        .then(function () {
                                var fileFs = fs(path);
                                return fileFs.exists().then(function (exists) {
                                        if (exists) return fileFs.writeFile(source.text);
                                        return fs(dir).createFile(name, source.text);
                                });
                        })
                        .then(function () {
                                try {
                                        new xcoder.EditorFile(path, { render: true });
                                } catch (e) {
                                        xcoder.require("toast")(path, 2500);
                                }
                        })
                        .catch(function (error) {
                                xcoder.require("toast")(String((error && error.message) || error), 3000);
                        });
        }

        // -------------------------------------------------------------- open page

        function openPage() {
                if (page && page.isConnected) return page;
                injectStyle();
                if (!root) buildRoot();
                var strings = window.strings || {};
                var Page = xcoder.require("page");
                var close = el("span", "icon close xsc-close");
                close.setAttribute("role", "button");
                close.addEventListener("click", function () {
                        if (page) page.hide();
                });
                page = Page(strings["scraper"] || "Scraper", { tail: close });
                page.append(root);
                app.append(page);
                page.onhide = function () {
                        window.actionStack.remove(PAGE_ID);
                        page = null;
                };
                window.actionStack.push({
                        id: PAGE_ID,
                        action: function () {
                                if (page) page.hide();
                        },
                });
                return page;
        }

        function openWith(url) {
                openPage();
                if (!$url) return;
                $url.value = url;
                activeTab = "source";
                switchTab("source");
                scrape();
        }

        xcoder.setPluginInit(PLUGIN_ID, function () {
                var strings = window.strings || {};
                var title = strings["scraper"] || "Scraper";

                injectStyle();

                xcoder.addCommand({
                        name: "scraper:open",
                        description: (strings["scraper cmd desc"] || "Fetch a site's source, assets and exposed secrets") + " (" + title + ")",
                        exec: function () {
                                openPage();
                                return true;
                        },
                });

                xcoder.sidebarApps.add(
                        "cod:globe",
                        "plugin-scraper",
                        title,
                        function () {},
                        false,
                        function () {
                                openPage();
                        },
                        { launcher: true },
                );

                xcoder.setPluginUnmount(PLUGIN_ID, function () {
                        xcoder.removeCommand("scraper:open");
                        xcoder.sidebarApps.remove("plugin-scraper");
                        var style = document.getElementById(CSS_ID);
                        if (style) style.remove();
                        page = null;
                        root = null;
                        source = null;
                        assets = null;
                        secrets = null;
                        endpoints = null;
                        busy = false;
                });
        });
})();
