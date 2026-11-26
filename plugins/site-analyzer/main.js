(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.site-analyzer";
	var CSS_ID = PLUGIN_ID.replace(/\./g, "-") + "-css";
	var PAGE_ID = "plugin-site-analyzer";

	var page = null;
	var root = null;
	var $url = null;
	var $status = null;
	var $techs = null;
	var $details = null;
	var $report = null;
	var $summary = null;
	var $empty = null;
	var $badge = null;
	var lastResponse = null;
	var busy = false;
	var activeTab = "tech";

	function t(key, fallback) {
		try {
			return (window.strings && window.strings[key]) || fallback;
		} catch (e) {
			return fallback;
		}
	}

	function normalizeUrl(value) {
		var url = String(value || "").trim();
		if (!url) return "";
		if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = "https://" + url;
		return url;
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
			".xsa-tool{flex:1;width:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;font-size:14px;}",
			".xsa-urlbar{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--hairline,var(--border-color));}",
			".xsa-urlbar input{flex:1;min-width:0;padding:10px 12px;border-radius:var(--radius-sm,8px);border:1px solid var(--hairline,var(--border-color));background:var(--surface-2,var(--primary-color));color:var(--primary-text-color);font-size:14px;outline:none;}",
			".xsa-urlbar .icon{padding:8px;opacity:.8;}",
			".xsa-status{padding:7px 12px;font-size:12.5px;opacity:.75;border-bottom:1px solid var(--hairline,var(--border-color));min-height:18px;}",
			".xsa-status[data-busy='1']{opacity:1;}",
			".xsa-tabs{display:flex;gap:4px;padding:8px 10px 0;}",
			".xsa-tab{display:flex;align-items:center;gap:6px;padding:8px 12px;border:none;background:none;color:var(--primary-text-color);opacity:.6;font-size:13px;border-bottom:2px solid transparent;}",
			".xsa-tab.active{opacity:1;border-bottom-color:var(--primary-color,#4f8cff);}",
			".xsa-tab .xsa-badge{background:var(--primary-color,#4f8cff);color:#fff;border-radius:var(--radius-full,999px);font-size:11px;padding:1px 7px;}",
			".xsa-panel{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;padding:10px 12px 24px;}",
			".xsa-panel.hidden{display:none;}",
			".xsa-summary{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}",
			".xsa-chip{display:flex;flex-direction:column;background:var(--surface-1,var(--secondary-color));border:1px solid var(--hairline,var(--border-color));border-radius:var(--radius-sm,8px);padding:6px 12px;}",
			".xsa-chip-label{font-size:10.5px;opacity:.6;}",
			".xsa-chip-value{font-size:14px;font-weight:600;}",
			".xsa-group{margin-bottom:14px;}",
			".xsa-group h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;opacity:.55;margin:0 0 6px;}",
			".xsa-tech{background:var(--surface-1,var(--secondary-color));border:1px solid var(--hairline,var(--border-color));border-radius:var(--radius-sm,8px);margin-bottom:6px;}",
			".xsa-tech summary{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;list-style:none;}",
			".xsa-tech summary::-webkit-details-marker{display:none;}",
			".xsa-tech-name{flex:1;font-weight:600;}",
			".xsa-tech-count{background:var(--surface-2,var(--primary-color));border-radius:var(--radius-full,999px);font-size:11px;padding:1px 8px;}",
			".xsa-evidence{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px;}",
			".xsa-ev{font-size:11px;background:var(--surface-2,var(--primary-color));padding:2px 7px;border-radius:6px;max-width:100%;overflow:hidden;text-overflow:ellipsis;}",
			".xsa-link{font-size:11px;color:var(--primary-color,#4f8cff);}",
			".xsa-row{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--hairline,var(--border-color));font-size:12.5px;}",
			".xsa-row-key{flex:0 0 34%;opacity:.6;word-break:break-all;}",
			".xsa-row-value{flex:1;word-break:break-all;}",
			".xsa-actions{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;}",
			".xsa-btn{display:flex;align-items:center;gap:6px;padding:9px 14px;border-radius:var(--radius-sm,8px);border:1px solid var(--hairline,var(--border-color));background:var(--surface-1,var(--secondary-color));color:var(--primary-text-color);font-size:13px;}",
			".xsa-btn:active{background:var(--surface-active,var(--active-color));}",
			".xsa-hint{font-size:12px;opacity:.6;margin:0 0 12px;}",
			".xsa-report{background:var(--surface-2,var(--primary-color));border:1px solid var(--hairline,var(--border-color));border-radius:var(--radius-sm,8px);padding:12px;font-size:12px;white-space:pre-wrap;word-break:break-word;color:var(--primary-text-color);font-family:monospace;}",
			".xsa-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:32px 12px;opacity:.55;text-align:center;}",
			".xsa-empty.hidden{display:none;}",
			".xsa-empty .icon{font-size:28px;}",
		].join("\n");
		var style = document.createElement("style");
		style.id = CSS_ID;
		style.textContent = css;
		document.head.appendChild(style);
	}

	function buildRoot() {
		root = el("div", "container xsa-tool");

		var urlbar = el("div", "xsa-urlbar");
		$url = el("input");
		$url.type = "url";
		$url.placeholder = "https://exemplo.com";
		$url.spellcheck = false;
		$url.setAttribute("enterkeyhint", "go");
		$url.addEventListener("keydown", function (e) {
			if (e.key === "Enter") analyze();
		});
		var go = icon("search");
		go.setAttribute("role", "button");
		go.addEventListener("click", function () {
			analyze();
		});
		urlbar.appendChild($url);
		urlbar.appendChild(go);

		$status = el("div", "xsa-status", t("analyzer idle", "Introduza um endereço para analisar"));

		var tabs = el("div", "xsa-tabs");
		var tabTech = makeTab("tech", "telescope", t("analyzer tech", "Tecnologias"));
		$badge = el("span", "xsa-badge hidden");
		tabTech.appendChild($badge);
		tabs.appendChild(tabTech);
		tabs.appendChild(makeTab("details", "server-process", t("analyzer details", "Detalhes")));
		tabs.appendChild(makeTab("report", "output", t("analyzer report", "Relatório")));

		var techPanel = el("div", "xsa-panel");
		techPanel.dataset.panel = "tech";
		$summary = el("div", "xsa-summary hidden");
		$techs = el("div", "xsa-groups");
		$empty = el("div", "xsa-empty hidden");
		$empty.appendChild(icon("telescope"));
		$empty.appendChild(el("p", null, t("analyzer no results", "Nenhuma tecnologia detetada")));
		techPanel.appendChild($summary);
		techPanel.appendChild($techs);
		techPanel.appendChild($empty);

		var detailsPanel = el("div", "xsa-panel hidden");
		detailsPanel.dataset.panel = "details";
		var detActions = el("div", "xsa-actions");
		var renderedBtn = el("button", "xsa-btn");
		renderedBtn.type = "button";
		renderedBtn.appendChild(icon("wand"));
		renderedBtn.appendChild(document.createTextNode(t("analyzer rendered", "Versão renderizada")));
		renderedBtn.addEventListener("click", function () {
			analyzeRendered();
		});
		detActions.appendChild(renderedBtn);
		detailsPanel.appendChild(detActions);
		var detHint = el("p", "xsa-hint", t("analyzer rendered hint", "«Versão renderizada» carrega a página numa WebView interna e analisa o DOM final — resolve sites SPA e bloqueios."));
		detailsPanel.appendChild(detHint);
		$details = el("div", "xsa-details");
		detailsPanel.appendChild($details);

		var reportPanel = el("div", "xsa-panel hidden");
		reportPanel.dataset.panel = "report";
		var repActions = el("div", "xsa-actions");
		var copyBtn = el("button", "xsa-btn");
		copyBtn.type = "button";
		copyBtn.appendChild(icon("copy"));
		copyBtn.appendChild(document.createTextNode(t("analyzer copy report", "Copiar relatório")));
		copyBtn.addEventListener("click", copyReport);
		repActions.appendChild(copyBtn);
		reportPanel.appendChild(repActions);
		$report = el("pre", "xsa-report");
		reportPanel.appendChild($report);

		root.appendChild(urlbar);
		root.appendChild($status);
		root.appendChild(tabs);
		root.appendChild(techPanel);
		root.appendChild(detailsPanel);
		root.appendChild(reportPanel);
	}

	function makeTab(name, iconName, label) {
		var tab = el("button", "xsa-tab" + (name === activeTab ? " active" : ""));
		tab.type = "button";
		tab.dataset.tab = name;
		tab.appendChild(icon(iconName));
		tab.appendChild(document.createTextNode(label));
		tab.addEventListener("click", function () {
			switchTab(name);
		});
		return tab;
	}

	function switchTab(tab) {
		activeTab = tab;
		if (!root) return;
		root.querySelectorAll(".xsa-tab").forEach(function ($tab) {
			$tab.classList.toggle("active", $tab.dataset.tab === tab);
		});
		root.querySelectorAll(".xsa-panel").forEach(function ($panel) {
			$panel.classList.toggle("hidden", $panel.dataset.panel !== tab);
		});
	}

	function setStatus(text, busyNow) {
		if (!$status) return;
		$status.textContent = text;
		$status.dataset.busy = busyNow ? "1" : "";
	}

	function techGroup(category, list) {
		var label =
			(window.strings && window.strings["tech cat " + category]) ||
			category.replace(/^\w/, function (c) {
				return c.toUpperCase();
			});
		var group = el("section", "xsa-group");
		group.appendChild(el("h3", null, label));
		list.forEach(function (tech) {
			var item = el("details", "xsa-tech");
			var summary = el("summary");
			summary.appendChild(el("span", "xsa-tech-name", tech.name));
			summary.appendChild(el("span", "xsa-tech-count", String((tech.evidence || []).length)));
			item.appendChild(summary);
			var evidence = el("div", "xsa-evidence");
			(tech.evidence || []).forEach(function (ev) {
				evidence.appendChild(el("code", "xsa-ev", ev));
			});
			if (tech.site) {
				var link = el("a", "xsa-link", tech.site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""));
				link.href = tech.site;
				link.target = "_blank";
				link.rel = "noopener noreferrer";
				evidence.appendChild(link);
			}
			item.appendChild(evidence);
			group.appendChild(item);
		});
		return group;
	}

	function rowsGroup(title, rows) {
		if (!rows || !rows.length) return null;
		var group = el("section", "xsa-group");
		group.appendChild(el("h3", null, title));
		rows.forEach(function (row) {
			var r = el("div", "xsa-row");
			r.appendChild(el("span", "xsa-row-key", String(row[0])));
			r.appendChild(el("span", "xsa-row-value", String(row[1]).slice(0, 400)));
			group.appendChild(r);
		});
		return group;
	}

	function renderResults(pageData) {
		var techDetect = xcoder.require("techDetect");
		var webScraper = xcoder.require("webScraper");
		var techs = techDetect.detectTechnologies(pageData);
		var meta = webScraper.extractMeta(pageData.html) || {};
		var sizeBytes = 0;
		try {
			sizeBytes = new Blob([pageData.html || ""]).size;
		} catch (e) {
			sizeBytes = String(pageData.html || "").length;
		}

		$summary.classList.remove("hidden");
		var chips = [
			[t("status code", "Estado"), String(pageData.status || "—")],
			[t("load time", "Tempo"), (pageData.elapsedMs / 1000).toFixed(1) + " s"],
			[t("page size", "Tamanho"), (sizeBytes / 1024).toFixed(1) + " kB"],
			[t("analyzer found", "Encontradas"), String(techs.length)],
		];
		$summary.replaceChildren.apply(
			$summary,
			chips.map(function (chip) {
				var c = el("span", "xsa-chip");
				c.appendChild(el("span", "xsa-chip-label", chip[0]));
				c.appendChild(el("span", "xsa-chip-value", chip[1]));
				return c;
			}),
		);

		var grouped = {};
		techs.forEach(function (tech) {
			(grouped[tech.category] = grouped[tech.category] || []).push(tech);
		});
		var order = techDetect.TECH_CATEGORY_ORDER || Object.keys(grouped);
		var groups = [];
		order.forEach(function (cat) {
			if (grouped[cat]) groups.push(techGroup(cat, grouped[cat]));
		});
		$techs.replaceChildren.apply($techs, groups);

		var body = $details;
		body.replaceChildren();
		var metaRows = Object.entries({
			[t("title", "Título")]: meta.title || "",
			[t("description", "Descrição")]: meta.description || "",
			[t("generator", "Generator")]: meta.generator || "",
			[t("viewport", "Viewport")]: meta.viewport || "",
			[t("language", "Idioma")]: meta.lang || "",
			[t("canonical", "Canonical")]: meta.canonical || "",
		}).filter(function (entry) {
			return entry[1] && String(entry[1]).trim();
		});
		var ogRows = (meta.openGraph || []).map(function (og) {
			return ["og:" + og[0], String(og[1])];
		});
		var headerRows = Object.entries(pageData.headers || {});
		var sections = [
			rowsGroup(t("page info", "Informação da página"), metaRows.concat(ogRows)),
			rowsGroup(t("response headers", "Cabeçalhos da resposta"), headerRows),
		].filter(Boolean);
		sections.forEach(function (section) {
			body.appendChild(section);
		});
		if (!sections.length) {
			body.appendChild(el("p", "xsa-hint", t("analyzer no details", "Sem detalhes disponíveis.")));
		}

		$report.textContent = techDetect.buildAnalyzerReport(
			{
				url: pageData.url,
				status: pageData.status,
				statusText: pageData.statusText,
				elapsedMs: pageData.elapsedMs,
				sizeBytes: sizeBytes,
				headers: pageData.headers,
				techs: techs,
				meta: {
					[t("title", "Título")]: meta.title,
					[t("description", "Descrição")]: meta.description,
					[t("generator", "Generator")]: meta.generator,
					[t("language", "Idioma")]: meta.lang,
				},
			},
			function (key) {
				return (window.strings && window.strings[key]) || key;
			},
		);

		$empty.classList.toggle("hidden", techs.length > 0);
		$badge.textContent = techs.length ? String(techs.length) : "";
		$badge.classList.toggle("hidden", !techs.length);
	}

	function analyze() {
		var url = normalizeUrl($url && $url.value);
		if (!url || busy) {
			if (!url) setStatus(t("analyzer idle", "Introduza um endereço para analisar"));
			return;
		}
		var webScraper = xcoder.require("webScraper");
		busy = true;
		setStatus(t("analyzer running", "A analisar") + " " + url + " …", true);
		var started = performance.now();
		webScraper
			.httpFetchDetailed(url, { timeoutMs: 30000 })
			.then(function (response) {
				lastResponse = {
					headers: response.headers,
					status: response.status,
					statusText: response.statusText,
					url: response.url,
				};
				var elapsedMs = performance.now() - started;
				renderResults({
					html: response.text,
					headers: response.headers,
					status: response.status,
					statusText: response.statusText,
					url: response.url,
					elapsedMs: elapsedMs,
				});
				setStatus(
					t("analyzer done", "Análise concluída") +
						" — " +
						response.status +
						" · " +
						(elapsedMs / 1000).toFixed(1) +
						" s",
				);
			})
			.catch(function (error) {
				setStatus(t("analyzer failed", "Falha ao obter o site") + ": " + ((error && error.message) || error));
				if (lastResponse) {
					renderResults({
						html: "",
						headers: lastResponse.headers,
						status: lastResponse.status,
						statusText: lastResponse.statusText,
						url: lastResponse.url,
						elapsedMs: 0,
					});
				} else {
					$empty.classList.remove("hidden");
				}
			})
			.finally(function () {
				busy = false;
			});
	}

	function analyzeRendered() {
		var url = normalizeUrl($url && $url.value);
		if (!url || busy) return;
		var webInspector = xcoder.require("webInspector");
		busy = true;
		setStatus(t("analyzer rendered running", "A carregar a versão renderizada…"), true);
		var started = performance.now();
		webInspector
			.fetchRenderedHtml(url, { timeoutMs: 45000 })
			.then(function (rendered) {
				var elapsedMs = performance.now() - started;
				renderResults({
					html: rendered.html,
					headers: (lastResponse && lastResponse.headers) || {},
					status: (lastResponse && lastResponse.status) || 200,
					statusText: (lastResponse && lastResponse.statusText) || "",
					url: rendered.url || url,
					elapsedMs: elapsedMs,
				});
				setStatus(t("analyzer rendered done", "Versão renderizada analisada"));
			})
			.catch(function (error) {
				setStatus(t("analyzer failed", "Falha ao obter o site") + ": " + ((error && error.message) || error));
			})
			.finally(function () {
				busy = false;
			});
	}

	function copyReport() {
		var text = ($report && $report.textContent && $report.textContent.trim()) || "";
		if (!text) {
			xcoder.require("toast")(t("analyzer no report", "Análise um site primeiro"), 2500);
			return;
		}
		xcoder
			.require("clipboard")
			.copyText(text)
			.then(function () {
				xcoder.require("toast")(t("analyzer report copied", "Relatório copiado"), 2000);
			})
			.catch(function () {
				xcoder.require("toast")(t("analyzer copy failed", "Não foi possível copiar"), 2500);
			});
	}

	function openPage() {
		if (page && page.isConnected) return page;
		injectStyle();
		if (!root) buildRoot();
		var strings = window.strings || {};
		var Page = xcoder.require("page");
		var close = el("span", "icon close xsa-close");
		close.setAttribute("role", "button");
		close.addEventListener("click", function () {
			if (page) page.hide();
		});
		page = Page(strings["analyzer"] || "Site Analyzer", { tail: close });
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
		activeTab = "tech";
		switchTab("tech");
		analyze();
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var strings = window.strings || {};
		var title = strings["analyzer"] || "Site Analyzer";
		var sidebarAppsApi = xcoder.require("sidebarApps");
		var webScraperApi = xcoder.require("webScraper");
		if (!sidebarAppsApi || typeof sidebarAppsApi.add !== "function"
		        || !webScraperApi) {
			var toastApi = xcoder.require("toast");
			if (toastApi) toastApi("This plugin needs XCoder v1.8.43+ — update the app first", 4000);
			return;
		}

		injectStyle();

		xcoder.addCommand({
			name: "site-analyzer:open",
			description: (strings["analyzer cmd desc"] || "Analyze the tech stack of any website") + " (" + title + ")",
			exec: function () {
				openPage();
				return true;
			},
		});

		sidebarAppsApi.add(
			"cod:telescope",
			"plugin-site-analyzer",
			title,
			function () {},
			false,
			function () {
				openPage();
			},
			{ launcher: true },
		);

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("site-analyzer:open");
			try { sidebarAppsApi.remove("plugin-site-analyzer"); } catch (e) {}
			var style = document.getElementById(CSS_ID);
			if (style) style.remove();
			page = null;
			root = null;
			lastResponse = null;
			busy = false;
		});
	});
})();
