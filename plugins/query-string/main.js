(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.query-string";

	function toast(msg, ms) {
		xcoder.require("toast")(msg, ms || 3000);
	}

	function parseQuery(text) {
		var value = String(text || "").trim();
		var query = value;
		if (value.indexOf("?") !== -1) {
			query = value.slice(value.indexOf("?") + 1);
		} else if (/^[\w.~-]+=/i.test(value) === false && value.indexOf("/") !== -1) {
			var afterPath = value.split("?")[1];
			query = afterPath || "";
		}
		var out = {};
		var pairs = query.replace(/^\?/, "").split("&");
		for (var i = 0; i < pairs.length; i++) {
			if (!pairs[i]) continue;
			var eq = pairs[i].indexOf("=");
			var key = eq === -1 ? pairs[i] : pairs[i].slice(0, eq);
			var val = eq === -1 ? "" : pairs[i].slice(eq + 1);
			try {
				key = decodeURIComponent(key.replace(/\+/g, " "));
				val = decodeURIComponent(val.replace(/\+/g, " "));
			} catch (e) {
				/* keep raw on bad escapes */
			}
			out[key] = val;
		}
		return out;
	}

	function buildQuery(obj) {
		return Object.keys(obj)
			.map(function (key) {
				return (
					encodeURIComponent(key) +
					"=" +
					encodeURIComponent(obj[key] === undefined ? "" : String(obj[key]))
				);
			})
			.join("&");
	}

	function targetText(view) {
		var range = view.state.selection.main;
		var scoped = !!(range && !range.empty);
		return {
			text: scoped
				? view.state.sliceDoc(range.from, range.to)
				: view.state.doc.toString(),
			from: scoped ? range.from : 0,
			to: scoped ? range.to : view.state.doc.length,
		};
	}

	function replaceRange(view, from, to, text) {
		view.dispatch({
			changes: { from: from, to: to, insert: text },
			scrollIntoView: true,
		});
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var select = xcoder.require("select");
		var alert = xcoder.require("alert");

		xcoder.addCommand({
			name: "query:convert",
			description: "Query string ⇄ JSON converter",
			bindKey: "",
			readOnly: false,
			exec: function (view) {
				if (!view || !view.state) return false;
				select(
					"Query string ⇄ JSON",
					[
						{ value: "tojson", text: "Query → JSON (seleção/documento)" },
						{ value: "toquery", text: "JSON → Query (seleção/documento)" },
						{ value: "show", text: "Apenas mostrar parse da seleção" },
					],
					{},
				)
					.then(function (choice) {
						if (!choice) return;
						var target = targetText(view);
						try {
							if (choice === "tojson") {
								replaceRange(
									view,
									target.from,
									target.to,
									JSON.stringify(parseQuery(target.text), null, 2),
								);
								toast("✓ Convertido para JSON");
							} else if (choice === "toquery") {
								var parsed = JSON.parse(target.text);
								replaceRange(view, target.from, target.to, buildQuery(parsed));
								toast("✓ Convertido para query string");
							} else {
								alert(
									"Query parse",
									JSON.stringify(parseQuery(target.text), null, 2),
								);
							}
						} catch (error) {
							toast(String(error.message || error), 4500);
						}
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("query:convert");
		});
	});
})();
