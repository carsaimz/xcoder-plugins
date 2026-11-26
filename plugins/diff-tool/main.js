(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.diff-tool";

	function toast(msg, ms) {
		xcoder.require("toast")(msg, ms || 3000);
	}

	/** Line-based LCS diff returning [{type:'=', 'add'|'del', text}]. */
	function diffLines(aLines, bLines) {
		var n = aLines.length;
		var m = bLines.length;
		// trim huge inputs to keep the DP table sane
		var MAX = 1500;
		if (n > MAX || m > MAX) {
			throw new Error("Textos muito grandes (máx " + MAX + " linhas por lado)");
		}
		var dp = new Array((n + 1) * (m + 1)).fill(0);
		for (var i = n - 1; i >= 0; i--) {
			for (var j = m - 1; j >= 0; j--) {
				dp[i * (m + 1) + j] =
					aLines[i] === bLines[j]
						? dp[(i + 1) * (m + 1) + j + 1] + 1
						: Math.max(
								dp[(i + 1) * (m + 1) + j],
								dp[i * (m + 1) + j + 1],
							);
			}
		}
		var out = [];
		var x = 0;
		var y = 0;
		while (x < n && y < m) {
			if (aLines[x] === bLines[y]) {
				out.push({ type: "=", text: aLines[x] });
				x++;
				y++;
			} else if (dp[(x + 1) * (m + 1) + y] >= dp[x * (m + 1) + y + 1]) {
				out.push({ type: "del", text: aLines[x] });
				x++;
			} else {
				out.push({ type: "add", text: bLines[y] });
				y++;
			}
		}
		while (x < n) out.push({ type: "del", text: aLines[x++] });
		while (y < m) out.push({ type: "add", text: bLines[y++] });
		return out;
	}

	function formatDiff(diffs, withContext) {
		var stats = { add: 0, del: 0 };
		var lines = diffs.map(function (entry) {
			if (entry.type === "add") {
				stats.add++;
				return "+ " + entry.text;
			}
			if (entry.type === "del") {
				stats.del++;
				return "- " + entry.text;
			}
			return withContext ? "  " + entry.text : "";
		});
		return {
			stats: stats,
			text: lines.filter(function (line) { return line !== ""; }).join("\n"),
		};
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var multiPrompt = xcoder.require("multiPrompt");
		var alert = xcoder.require("alert");
		var select = xcoder.require("select");
		var prompt = xcoder.require("prompt");

		xcoder.addCommand({
			name: "diff:compare",
			description: "Diff two texts (paste both, see the changes)",
			bindKey: "Ctrl-Alt-9",
			readOnly: true,
			exec: function (view) {
				var initialA = "";
				var initialB = "";
				if (view && view.state) {
					var range = view.state.selection.main;
					if (range && !range.empty) {
						initialA = view.state.sliceDoc(range.from, range.to);
					}
				}
				multiPrompt(
					"Comparar textos",
					[
						{ id: "a", name: "Texto A (original)", value: initialA },
						{ id: "b", name: "Texto B (modificado)", value: initialB },
					],
					"A diferença linha a linha é calculada localmente (LCS).",
				)
					.then(function (values) {
						if (!values) return;
						var diffs;
						try {
							diffs = diffLines(
								String(values.a || "").split(/\r?\n/),
								String(values.b || "").split(/\r?\n/),
							);
						} catch (error) {
							toast(String(error.message || error), 5000);
							return;
						}
						var result = formatDiff(diffs, false);
						select(
							"Diff — +" + result.stats.add + " −" + result.stats.del,
							[
								{ value: "show", text: "Mostrar diff" },
								{ value: "context", text: "Ver com contexto completo" },
								{ value: "copy", text: "Copiar diff (estilo patch)" },
							],
							{},
						)
							.then(function (choice) {
								if (choice === "show") {
									alert("Diff", result.text || "(sem diferenças)");
								} else if (choice === "context") {
									var full = formatDiff(diffs, true);
									alert("Diff completo", full.text || "(sem diferenças)");
								} else if (choice === "copy") {
									navigator.clipboard.writeText(result.text).then(function () {
										toast("✓ Diff copiado");
									});
								}
							})
							.catch(function () {});
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.addCommand({
			name: "diff:against-clipboard",
			description: "Diff the selection against the clipboard content",
			bindKey: "",
			readOnly: true,
			exec: function (view) {
				if (!view || !view.state) return false;
				var range = view.state.selection.main;
				var selected =
					range && !range.empty
						? view.state.sliceDoc(range.from, range.to)
						: view.state.doc.toString();
				navigator.clipboard
					.readText()
					.then(function (clipboard) {
						var diffs = diffLines(
							clipboard.split(/\r?\n/),
							selected.split(/\r?\n/),
						);
						var result = formatDiff(diffs, false);
						alert(
							"Clipboard ⇄ editor — +" + result.stats.add + " −" + result.stats.del,
							result.text || "(sem diferenças)",
						);
					})
					.catch(function () {
						toast("Sem conteúdo na área de transferência", 4000);
					});
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("diff:compare");
			xcoder.removeCommand("diff:against-clipboard");
		});
	});
})();
