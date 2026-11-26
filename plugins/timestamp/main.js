(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.timestamp";

	function toast(msg, ms) {
		xcoder.require("toast")(msg, ms || 3000);
	}

	function replaceRange(view, from, to, text) {
		view.dispatch({
			changes: { from: from, to: to, insert: text },
			scrollIntoView: true,
		});
	}

	function relative(ms) {
		var abs = Math.abs(ms);
		var units = [
			[31536000000, "ano"],
			[2592000000, "mês"],
			[604800000, "semana"],
			[86400000, "dia"],
			[3600000, "hora"],
			[60000, "minuto"],
			[1000, "segundo"],
		];
		for (var i = 0; i < units.length; i++) {
			if (abs >= units[i][0]) {
				var n = Math.floor(abs / units[i][0]);
				var plural = n > 1 ? (units[i][1] === "mês" ? "meses" : units[i][1] + "s") : units[i][1];
				return n + " " + plural + (ms < 0 ? " atrás" : " a partir de agora");
			}
		}
		return "agora";
	}

	function describeNumber(value) {
		var num = Number(value);
		if (!isFinite(num) || String(value).trim() === "") return null;
		var ms = num > 1e12 ? num : num * 1000; // seconds vs ms heuristics
		var date = new Date(ms);
		if (isNaN(date.getTime())) return null;
		return {
			iso: date.toISOString(),
			local: date.toLocaleString(),
			relative: relative(date.getTime() - Date.now()),
			epochSec: Math.floor(date.getTime() / 1000),
			epochMs: date.getTime(),
		};
	}

	function selection(view) {
		var range = view.state.selection.main;
		return {
			text: range && !range.empty ? view.state.sliceDoc(range.from, range.to) : "",
			from: range.from,
			to: range.to,
			scoped: !!(range && !range.empty),
		};
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var alert = xcoder.require("alert");
		var prompt = xcoder.require("prompt");
		var select = xcoder.require("select");

		xcoder.addCommand({
			name: "timestamp:insert",
			description: "Insert current timestamp (epoch or ISO)",
			bindKey: "",
			readOnly: false,
			exec: function (view) {
				if (!view || !view.state) return false;
				var now = Date.now();
				select(
					"Timestamp",
					[
						{ value: "sec", text: "Epoch (segundos): " + Math.floor(now / 1000) },
						{ value: "ms", text: "Epoch (ms): " + now },
						{ value: "iso", text: "ISO 8601: " + new Date(now).toISOString() },
						{ value: "local", text: "Local: " + new Date(now).toLocaleString() },
					],
					{},
				)
					.then(function (choice) {
						if (!choice) return;
						var text =
							choice === "sec"
								? String(Math.floor(now / 1000))
								: choice === "ms"
									? String(now)
									: choice === "iso"
										? new Date(now).toISOString()
										: new Date(now).toLocaleString();
						var range = view.state.selection.main;
						replaceRange(view, range.from, range.to, text);
						toast("✓ Inserido");
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.addCommand({
			name: "timestamp:convert",
			description: "Convert epoch ⇄ ISO ⇄ human date",
			bindKey: "",
			readOnly: true,
			exec: function (view) {
				if (!view || !view.state) return false;
				var target = selection(view);
				prompt("Timestamp ou data ISO", target.text || "", "text")
					.then(function (value) {
						if (!value) return;
						var direct = describeNumber(value);
						var parsed = direct;
						if (!parsed) {
							var asDate = new Date(value);
							parsed = isNaN(asDate.getTime())
								? null
								: describeNumber(Math.floor(asDate.getTime() / 1000));
						}
						if (!parsed) {
							toast("Não consigo interpretar esse valor", 4500);
							return;
						}
						alert(
							"Timestamp",
							"ISO: " + parsed.iso + "\nLocal: " + parsed.local +
								"\nRelativo: " + parsed.relative +
								"\nEpoch (s): " + parsed.epochSec +
								"\nEpoch (ms): " + parsed.epochMs,
						);
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("timestamp:insert");
			xcoder.removeCommand("timestamp:convert");
		});
	});
})();
