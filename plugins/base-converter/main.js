(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.base-converter";

	function toast(msg, ms) {
		xcoder.require("toast")(msg, ms || 3000);
	}

	function parseNumber(text) {
		var value = String(text || "").trim();
		if (/^-?0x[0-9a-f]+$/i.test(value)) return parseInt(value, 16);
		if (/^-?0b[01]+$/i.test(value)) return parseInt(value.slice(value.indexOf("b") + 1), 2);
		if (/^-?0o[0-7]+$/i.test(value)) return parseInt(value.slice(value.indexOf("o") + 1), 8);
		if (/^-?\d+$/.test(value)) return parseInt(value, 10);
		return NaN;
	}

	function formatAll(num) {
		return [
			"Decimal: " + num.toLocaleString("en-US"),
			"Hex: " + (num < 0 ? "-0x" + Math.abs(num).toString(16).toUpperCase() : "0x" + num.toString(16).toUpperCase()),
			"Binário: " + (num < 0 ? "-0b" + Math.abs(num).toString(2) : "0b" + num.toString(2)),
			"Octal: " + (num < 0 ? "-0o" + Math.abs(num).toString(8) : "0o" + num.toString(8)),
			"Base36: " + num.toString(36),
		].join("\n");
	}

	function targetText(view) {
		var range = view.state.selection.main;
		var scoped = !!(range && !range.empty);
		return {
			text: scoped
				? view.state.sliceDoc(range.from, range.to)
				: view.state.doc.toString(),
			from: range.from,
			to: range.to,
			scoped: scoped,
		};
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var alert = xcoder.require("alert");
		var prompt = xcoder.require("prompt");

		xcoder.addCommand({
			name: "base:convert",
			description: "Convert number between dec/hex/bin/oct",
			bindKey: "Ctrl-Alt-2",
			readOnly: true,
			exec: function (view) {
				if (!view || !view.state) return false;
				var target = targetText(view);
				prompt("Número (dec, 0x, 0b, 0o)", target.text.trim() || "", "text")
					.then(function (value) {
						if (!value) return;
						var num = parseNumber(value);
						if (isNaN(num)) {
							toast("Não é um número inteiro válido", 4500);
							return;
						}
						alert("Conversão de base", formatAll(num));
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.addCommand({
			name: "base:convert-selection",
			description: "Convert the first number in the selection",
			bindKey: "",
			readOnly: true,
			exec: function (view) {
				if (!view || !view.state) return false;
				var target = targetText(view);
				var match = /(?:0x[0-9a-f]+|0b[01]+|0o[0-7]+|-?\d+)/i.exec(target.text);
				if (!match) {
					toast("Nenhum número na seleção/documento", 4500);
					return true;
				}
				var num = parseNumber(match[0]);
				if (isNaN(num)) {
					toast("Número inválido", 4500);
					return true;
				}
				alert(match[0] + " →", formatAll(num));
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("base:convert");
			xcoder.removeCommand("base:convert-selection");
		});
	});
})();
