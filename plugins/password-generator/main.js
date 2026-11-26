(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.password-generator";

	function toast(msg, ms) {
		xcoder.require("toast")(msg, ms || 3000);
	}

	var SETS = {
		lower: "abcdefghijklmnopqrstuvwxyz",
		upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
		digits: "0123456789",
		symbols: "!@#$%^&*()-_=+[]{};:,.?/",
	};

	function secureRandom(max) {
		var array = new Uint32Array(1);
		crypto.getRandomValues(array);
		return array[0] % max;
	}

	function generate(length, sets) {
		var pool = sets.join("");
		var out = "";
		for (var i = 0; i < length; i++) {
			out += pool.charAt(secureRandom(pool.length));
		}
		// guarantee one char of every selected set
		for (var s = 0; s < sets.length && s < length; s++) {
			var pos = secureRandom(length);
			out =
				out.slice(0, pos) +
				sets[s].charAt(secureRandom(sets[s].length)) +
				out.slice(pos + 1);
		}
		return out;
	}

	function replaceSelection(view, text) {
		var range = view.state.selection.main;
		view.dispatch({
			changes: { from: range.from, to: range.to, insert: text },
			scrollIntoView: true,
		});
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var prompt = xcoder.require("prompt");
		var multiPrompt = xcoder.require("multiPrompt");
		var select = xcoder.require("select");

		xcoder.addCommand({
			name: "password:generate",
			description: "Generate a strong password and insert it",
			bindKey: "Ctrl-Alt-3",
			readOnly: false,
			exec: function (view) {
				if (!view || !view.state) return false;
				multiPrompt(
					"Gerador de password",
					[
						{ id: "length", name: "Comprimento", value: "20", type: "number" },
						{
							id: "sets",
							name: "Conjuntos (aA9! — desmarque o que não quer)",
							value: "aA9!",
						},
					],
					"a = minúsculas, A = maiúsculas, 9 = dígitos, ! = símbolos",
				)
					.then(function (values) {
						if (!values) return;
						var length = Math.max(4, Math.min(128, parseInt(values.length, 10) || 20));
						var sets = [];
						if (values.sets.indexOf("a") !== -1) sets.push(SETS.lower);
						if (values.sets.indexOf("A") !== -1) sets.push(SETS.upper);
						if (values.sets.indexOf("9") !== -1) sets.push(SETS.digits);
						if (values.sets.indexOf("!") !== -1) sets.push(SETS.symbols);
						if (!sets.length) sets.push(SETS.lower, SETS.upper, SETS.digits);
						var password = generate(length, sets);
						replaceSelection(view, password);
						toast("✓ Password " + length + " caracteres inserida");
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.addCommand({
			name: "password:generate-quick",
			description: "Quick 20-char password into the clipboard",
			bindKey: "",
			readOnly: true,
			exec: function () {
				var password = generate(
					20,
					[SETS.lower, SETS.upper, SETS.digits, SETS.symbols],
				);
				navigator.clipboard
					.writeText(password)
					.then(function () {
						toast("✓ Password copiada para a área de transferência");
					})
					.catch(function () {
						select("Password", [{ value: password, text: password }], {}).catch(
							function () {},
						);
					});
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("password:generate");
			xcoder.removeCommand("password:generate-quick");
		});
	});
})();
