(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.http-status";

	var CODES = [
		[100, "Continue"],
		[101, "Switching Protocols"],
		[200, "OK"],
		[201, "Created"],
		[202, "Accepted"],
		[204, "No Content"],
		[206, "Partial Content"],
		[301, "Moved Permanently"],
		[302, "Found"],
		[303, "See Other"],
		[304, "Not Modified"],
		[307, "Temporary Redirect"],
		[308, "Permanent Redirect"],
		[400, "Bad Request"],
		[401, "Unauthorized"],
		[402, "Payment Required"],
		[403, "Forbidden"],
		[404, "Not Found"],
		[405, "Method Not Allowed"],
		[408, "Request Timeout"],
		[409, "Conflict"],
		[410, "Gone"],
		[413, "Payload Too Large"],
		[415, "Unsupported Media Type"],
		[418, "I'm a teapot"],
		[422, "Unprocessable Content"],
		[429, "Too Many Requests"],
		[451, "Unavailable For Legal Reasons"],
		[500, "Internal Server Error"],
		[501, "Not Implemented"],
		[502, "Bad Gateway"],
		[503, "Service Unavailable"],
		[504, "Gateway Timeout"],
	];

	function codeByNumber(number) {
		for (var i = 0; i < CODES.length; i++) {
			if (CODES[i][0] === number) return CODES[i];
		}
		return null;
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var select = xcoder.require("select");

		xcoder.addCommand({
			name: "http:codes",
			description: "Browse HTTP status codes",
			bindKey: "",
			readOnly: true,
			exec: function () {
				var items = CODES.map(function (entry) {
					return { value: String(entry[0]), text: entry[0] + " — " + entry[1] };
				});
				items.push({
					value: "insert",
					text: "✍ Inserir código no editor…",
					className: "group-header",
				});
				select("HTTP Status", items, {})
					.then(function (choice) {
						if (choice === "insert") {
							xcoder.require("commands").registry.execute("http:insert");
						}
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.addCommand({
			name: "http:insert",
			description: "Insert an HTTP status code at the cursor",
			bindKey: "",
			readOnly: false,
			exec: function (view) {
				if (!view || !view.state) return false;
				var items = CODES.map(function (entry) {
					return { value: String(entry[0]), text: entry[0] + " — " + entry[1] };
				});
				select("Inserir status HTTP", items, {})
					.then(function (choice) {
						if (!choice) return;
						var range = view.state.selection.main;
						view.dispatch({
							changes: {
								from: range.from,
								to: range.to,
								insert: String(choice),
							},
							scrollIntoView: true,
						});
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.addCommand({
			name: "http:lookup",
			description: "Lookup the status code under the cursor",
			bindKey: "",
			readOnly: true,
			exec: function (view) {
				if (!view || !view.state) return false;
				var range = view.state.selection.main;
				var text =
					range && !range.empty
						? view.state.sliceDoc(range.from, range.to)
						: "";
				var match = /\b([1-5]\d{2})\b/.exec(text);
				if (!match) {
					xcoder.require("toast")("Nenhum código HTTP (1xx–5xx) na seleção", 4000);
					return true;
				}
				var found = codeByNumber(Number(match[1]));
				xcoder.require("alert")(
					match[1],
					found ? found[0] + " — " + found[1] : "Código não padrão",
				);
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("http:codes");
			xcoder.removeCommand("http:insert");
			xcoder.removeCommand("http:lookup");
		});
	});
})();
