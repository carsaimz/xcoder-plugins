(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.csv-json";

	function toast(msg, ms) {
		xcoder.require("toast")(msg, ms || 3000);
	}

	/** RFC4180-ish CSV row parser (quotes, escaped quotes, commas in quotes). */
	function parseCsvLine(line) {
		var row = [];
		var field = "";
		var inQuotes = false;
		for (var i = 0; i < line.length; i++) {
			var ch = line[i];
			if (inQuotes) {
				if (ch === '"') {
					if (line[i + 1] === '"') {
						field += '"';
						i++;
					} else {
						inQuotes = false;
					}
				} else {
					field += ch;
				}
			} else if (ch === '"') {
				inQuotes = true;
			} else if (ch === ",") {
				row.push(field);
				field = "";
			} else {
				field += ch;
			}
		}
		row.push(field);
		return row;
	}

	function csvToJson(csv, delimiter) {
		var lines = String(csv).trim().split(/\r?\n/);
		if (lines.length < 1) throw new Error("CSV vazio");
		var rows = lines.map(function (line) {
			return delimiter === ";" ? line.split(";") : parseCsvLine(line);
		});
		var header = rows.shift();
		return rows.map(function (row) {
			var obj = {};
			header.forEach(function (key, index) {
				obj[key.trim()] = row[index] !== undefined ? row[index].trim() : "";
			});
			return obj;
		});
	}

	function jsonToCsv(rows) {
		if (!Array.isArray(rows) || !rows.length) throw new Error("Precisa de um array de objetos");
		var keys = [];
		rows.forEach(function (row) {
			Object.keys(row || {}).forEach(function (key) {
				if (keys.indexOf(key) === -1) keys.push(key);
			});
		});
		var escape = function (value) {
			var text = value === null || value === undefined ? "" : String(value);
			if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
			return text;
		};
		return [
			keys.join(","),
		].concat(
			rows.map(function (row) {
				return keys
					.map(function (key) {
						return escape(row ? row[key] : "");
					})
					.join(",");
			}),
		).join("\n");
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
		var prompt = xcoder.require("prompt");

		xcoder.addCommand({
			name: "csv:convert",
			description: "CSV ⇄ JSON converter",
			bindKey: "",
			readOnly: false,
			exec: function (view) {
				if (!view || !view.state) return false;
				select(
					"CSV ⇄ JSON",
					[
						{ value: "tojson", text: "CSV → JSON (da seleção/documento)" },
						{ value: "tocsv", text: "JSON → CSV (da seleção/documento)" },
						{ value: "tojsonsemi", text: "CSV (;) → JSON" },
					],
					{},
				)
					.then(function (choice) {
						if (!choice) return;
						var target = targetText(view);
						try {
							if (choice === "tocsv") {
								replaceRange(
									view,
									target.from,
									target.to,
									jsonToCsv(JSON.parse(target.text)),
								);
							} else {
								var rows = csvToJson(
									target.text,
									choice === "tojsonsemi" ? ";" : ",",
								);
								replaceRange(
									view,
									target.from,
									target.to,
									JSON.stringify(rows, null, 2),
								);
							}
							toast("✓ Convertido");
						} catch (error) {
							toast(String(error.message || error), 4500);
						}
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.addCommand({
			name: "csv:from-input",
			description: "Paste CSV in a dialog, get JSON in the clipboard",
			bindKey: "",
			readOnly: true,
			exec: function () {
				prompt("Cole o CSV", "", "textarea")
					.then(function (csv) {
						if (!csv) return;
						try {
							var json = JSON.stringify(csvToJson(csv, ","), null, 2);
							navigator.clipboard
								.writeText(json)
								.then(function () {
									toast("✓ JSON copiado");
								});
						} catch (error) {
							toast(String(error.message || error), 4500);
						}
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("csv:convert");
			xcoder.removeCommand("csv:from-input");
		});
	});
})();
