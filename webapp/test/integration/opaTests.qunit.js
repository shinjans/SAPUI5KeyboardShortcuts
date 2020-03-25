/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"ss/zss_demo_keys/test/integration/AllJourneys"
	], function () {
		QUnit.start();
	});
});