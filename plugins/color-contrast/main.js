(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.color-contrast";

	function toast(msg, ms) {
		xcoder.require("toast")(msg, ms || 3000);
	}

	function parseColor(text) {
		var value = String(text || "").trim().toLowerCase();
		var hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value);
		if (hex) {
			var digits = hex[1];
			if (digits.length === 3) {
				digits = digits[0] + digits[0] + digits[1] + digits[1] + digits[2] + digits[2];
			}
			return {
				r: parseInt(digits.slice(0, 2), 16),
				g: parseInt(digits.slice(2, 4), 16),
				b: parseInt(digits.slice(4, 6), 16),
			};
		}
		var rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(value);
		if (rgb) {
			return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
		}
		return null;
	}

	function luminance(color) {
		var channel = function (value) {
			var v = value / 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		};
		return (
			0.2126 * channel(color.r) +
			0.7152 * channel(color.g) +
			0.0722 * channel(color.b)
		);
	}

	function contrastRatio(a, b) {
		var l1 = luminance(a);
		var l2 = luminance(b);
		var lighter = Math.max(l1, l2);
		var darker = Math.min(l1, l2);
		return (lighter + 0.05) / (darker + 0.05);
	}

	function toHex(color) {
		var pad = function (v) {
			return v.toString(16).padStart(2, "0");
		};
		return "#" + pad(color.r) + pad(color.g) + pad(color.b);
	}

	function mixWith(color, other, factor) {
		return {
			r: Math.round(color.r * (1 - factor) + other.r * factor),
			g: Math.round(color.g * (1 - factor) + other.g * factor),
			b: Math.round(color.b * (1 - factor) + other.b * factor),
		};
	}

	function verdict(ratio) {
		return [
			"Rácio: " + ratio.toFixed(2) + ":1",
			"AA texto normal (≥4.5): " + (ratio >= 4.5 ? "✓ passa" : "✗ falha"),
			"AA texto grande (≥3.0): " + (ratio >= 3 ? "✓ passa" : "✗ falha"),
			"AAA texto normal (≥7.0): " + (ratio >= 7 ? "✓ passa" : "✗ falha"),
			"AAA texto grande (≥4.5): " + (ratio >= 4.5 ? "✓ passa" : "✗ falha"),
			"UI components (≥3.0): " + (ratio >= 3 ? "✓ passa" : "✗ falha"),
		].join("\n");
	}

	function suggestions(fg, bg) {
		var black = { r: 0, g: 0, b: 0 };
		var white = { r: 255, g: 255, b: 255 };
		var options = [
			["texto preto sobre " + toHex(bg), black, bg],
			["texto branco sobre " + toHex(bg), white, bg],
			[toHex(fg) + " sobre preto", fg, black],
			[toHex(fg) + " sobre branco", fg, white],
		];
		return options
			.map(function (entry) {
				return (
					entry[0] +
					" → " +
					contrastRatio(entry[1], entry[2]).toFixed(2) +
					":1"
				);
			})
			.join("\n");
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var prompt = xcoder.require("prompt");
		var alert = xcoder.require("alert");

		xcoder.addCommand({
			name: "contrast:check",
			description: "WCAG contrast check between two colors",
			bindKey: "",
			readOnly: true,
			exec: function (view) {
				var initial = "";
				if (view && view.state) {
					var range = view.state.selection.main;
					if (range && !range.empty) {
						initial = view.state.sliceDoc(range.from, range.to).trim();
					}
				}
				prompt("Cor do texto (hex ou rgb)", initial || "#000000", "text")
					.then(function (fgText) {
						if (!fgText) return;
						var fg = parseColor(fgText);
						if (!fg) {
							toast("Cor de texto inválida", 4000);
							return;
						}
						prompt("Cor de fundo (hex ou rgb)", "#ffffff", "text")
							.then(function (bgText) {
								if (!bgText) return;
								var bg = parseColor(bgText);
								if (!bg) {
									toast("Cor de fundo inválida", 4000);
									return;
								}
								var ratio = contrastRatio(fg, bg);
								alert(
									"Contraste WCAG",
									toHex(fg) + " sobre " + toHex(bg) + "\n\n" +
										verdict(ratio) +
										"\n\nSugestões:\n" +
										suggestions(fg, bg),
								);
							})
							.catch(function () {});
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("contrast:check");
		});
	});
})();
