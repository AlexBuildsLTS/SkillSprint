// FILE: metro.config.cjs (Note the .cjs extension)
// PURPOSE: CommonJS version of Metro config to prevent "require is not defined" errors.

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });