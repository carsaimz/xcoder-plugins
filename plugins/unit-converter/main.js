(function () {
	"use strict";
	var xcoder = window.xcoder;
	if (!xcoder || typeof xcoder.setPluginInit !== "function") return;

	var PLUGIN_ID = "xcoder.unit-converter";

	function toast(msg, ms) {
		xcoder.require("toast")(msg, ms || 3000);
	}

	var GROUPS = {
		length: {
			label: "Comprimento",
			base: "m",
			units: {
				mm: 0.001,
				cm: 0.01,
				m: 1,
				km: 1000,
				in: 0.0254,
				ft: 0.3048,
				yd: 0.9144,
				mi: 1609.344,
			},
		},
		mass: {
			label: "Massa",
			base: "kg",
			units: {
				mg: 1e-6,
				g: 0.001,
				kg: 1,
				t: 1000,
				oz: 0.0283495,
				lb: 0.453592,
			},
		},
		data: {
			label: "Dados",
			base: "B",
			units: {
				B: 1,
				KB: 1024,
				MB: 1024 * 1024,
				GB: 1024 * 1024 * 1024,
				TB: 1024 * 1024 * 1024 * 1024,
			},
		},
		speed: {
			label: "Velocidade",
			base: "m/s",
			units: {
				"m/s": 1,
				"km/h": 1 / 3.6,
				mph: 0.44704,
				knot: 0.514444,
			},
		},
	};

	var TEMPS = ["°C", "°F", "K"];

	function convertTemperature(value, from, to) {
		var celsius = value;
		if (from === "°F") celsius = (value - 32) * (5 / 9);
		if (from === "K") celsius = value - 273.15;
		if (to === "°F") return celsius * (9 / 5) + 32;
		if (to === "K") return celsius + 273.15;
		return celsius;
	}

	function formatNumber(value) {
		if (Math.abs(value) >= 1e9 || (Math.abs(value) > 0 && Math.abs(value) < 1e-6)) {
			return value.toExponential(4);
		}
		var rounded = Math.round(value * 1e6) / 1e6;
		return String(rounded);
	}

	function selectionText(view) {
		var range = view.state.selection.main;
		return range && !range.empty ? view.state.sliceDoc(range.from, range.to) : "";
	}

	function insertText(view, text) {
		var range = view.state.selection.main;
		view.dispatch({
			changes: { from: range.from, to: range.to, insert: text },
			scrollIntoView: true,
		});
	}

	xcoder.setPluginInit(PLUGIN_ID, function () {
		var select = xcoder.require("select");
		var prompt = xcoder.require("prompt");
		var alert = xcoder.require("alert");

		xcoder.addCommand({
			name: "units:convert",
			description: "Convert units (length, mass, data, speed, temperature)",
			bindKey: "",
			readOnly: false,
			exec: function (view) {
				if (!view || !view.state) return false;
				var groupKeys = Object.keys(GROUPS);
				var groupItems = groupKeys.map(function (key) {
					return { value: key, text: GROUPS[key].label };
				});
				groupItems.push({ value: "temp", text: "Temperatura" });
				select("Converter", groupItems, {})
					.then(function (group) {
						if (!group) return;
						if (group === "temp") {
							select("De → Para", [
								{ value: "C-F", text: "°C → °F" },
								{ value: "F-C", text: "°F → °C" },
								{ value: "C-K", text: "°C → K" },
								{ value: "K-C", text: "K → °C" },
								{ value: "F-K", text: "°F → K" },
								{ value: "K-F", text: "K → °F" },
							], {})
								.then(function (choice) {
									if (!choice) return;
									var parts = choice.split("-");
									prompt("Valor (" + parts[0] + ")", selectionText(view), "text")
										.then(function (valueText) {
											if (!valueText) return;
											var value = parseFloat(valueText);
											if (isNaN(value)) {
												toast("Número inválido", 4000);
												return;
											}
											var out = convertTemperature(value, parts[0], parts[1]);
											var line = formatNumber(value) + " " + parts[0] + " = " + formatNumber(out) + " " + parts[1];
											select("Temperatura", [
												{ value: "insert", text: line + "  — inserir" },
											], {})
												.then(function (pick) {
													if (pick === "insert") insertText(view, formatNumber(out));
												})
												.catch(function () {});
										})
										.catch(function () {});
								})
								.catch(function () {});
							return;
						}
						var groupData = GROUPS[group];
						var unitKeys = Object.keys(groupData.units);
						select("De (" + groupData.label + ")", unitKeys.map(function (unit) {
							return { value: unit, text: unit };
						}), {})
							.then(function (from) {
								if (!from) return;
								select("Para", unitKeys.map(function (unit) {
									return { value: unit, text: unit };
								}), {})
									.then(function (to) {
										if (!to) return;
										prompt("Valor (" + from + ")", selectionText(view), "text")
											.then(function (valueText) {
												if (!valueText) return;
												var value = parseFloat(valueText);
												if (isNaN(value)) {
													toast("Número inválido", 4000);
													return;
												}
												var meters = value * groupData.units[from];
												var out = meters / groupData.units[to];
												var line = value + " " + from + " = " + formatNumber(out) + " " + to;
												select("Resultado", [
													{ value: "insert", text: line + "  — inserir" },
												], {})
													.then(function (pick) {
														if (pick === "insert") insertText(view, formatNumber(out));
													})
													.catch(function () {});
											})
											.catch(function () {});
									})
									.catch(function () {});
							})
							.catch(function () {});
					})
					.catch(function () {});
				return true;
			},
		});

		xcoder.setPluginUnmount(PLUGIN_ID, function () {
			xcoder.removeCommand("units:convert");
		});
	});
})();
