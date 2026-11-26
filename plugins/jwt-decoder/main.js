(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.jwt-decoder";

	function toast(msg, ms) {
		xcoder.require("toast")(msg, ms || 3000);
	}

	function b64urlDecode(segment) {
		var base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
		while (base64.length % 4) base64 += "=";
		var binary = atob(base64);
		try {
			var bytes = new Uint8Array(binary.length);
			for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
			return new TextDecoder("utf-8").decode(bytes);
		} catch (e) {
			return decodeURIComponent(escape(binary));
		}
	}

	function isJwt(text) {
		var parts = String(text || "").trim().split(".");
		if (parts.length !== 3) return null;
		try {
			var header = JSON.parse(b64urlDecode(parts[0]));
			var payload = JSON.parse(b64urlDecode(parts[1]));
			return { header: header, payload: payload, signature: parts[2] };
		} catch (e) {
			return null;
		}
	}

	function expInfo(payload) {
		var exp = payload && payload.exp;
		if (!exp) return "";
		var date = new Date(exp * 1000);
		var diff = date.getTime() - Date.now();
		if (diff > 0) {
			var mins = Math.floor(diff / 60000);
			return (
				"\n\n✓ Válido — expira " +
				date.toLocaleString() +
				" (em " +
				(mins < 60 ? mins + " min" : Math.floor(mins / 60) + " h") +
				")"
			);
		}
		return "\n\n✗ EXPIRADO em " + date.toLocaleString();
	}

	function selectionText(view) {
		var range = view.state.selection.main;
		return range && !range.empty
			? view.state.sliceDoc(range.from, range.to)
			: view.state.doc.toString().trim();
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var alert = xcoder.require("alert");
		var select = xcoder.require("select");

		xcoder.addCommand({
			name: "jwt:decode",
			description: "Decode a JWT (header, payload, expiry)",
			bindKey: "Ctrl-Alt-1",
			readOnly: true,
			exec: function (view) {
				if (!view || !view.state) return false;
				var token = selectionText(view).replace(/^Bearer\s+/i, "").trim();
				var decoded = isJwt(token);
				if (!decoded) {
					toast("Não é um JWT válido (precisa de 3 partes)", 4500);
					return true;
				}
				select(
					"JWT",
					[
						{ value: "show", text: "Mostrar token decodificado" },
						{ value: "copy", text: "Copiar claims (payload) como JSON" },
					],
					{},
				)
					.then(function (choice) {
						if (choice === "show") {
							alert(
								"JWT decodificado",
								"HEADER\n" +
									JSON.stringify(decoded.header, null, 2) +
									"\n\nPAYLOAD\n" +
									JSON.stringify(decoded.payload, null, 2) +
									expInfo(decoded.payload) +
									"\n\n(algoritmo: " +
									(decoded.header.alg || "?") +
									")",
							);
						}
						if (choice === "copy") {
							navigator.clipboard
								.writeText(JSON.stringify(decoded.payload, null, 2))
								.then(function () {
									toast("✓ Payload copiado");
								});
						}
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("jwt:decode");
		});
	});
})();
