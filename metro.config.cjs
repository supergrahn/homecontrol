// Exclude the Cloud Functions folder from Metro to avoid watching its node_modules
const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/src/defaults/exclusionList");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const blockFuncs = new RegExp(
  `^${path.resolve(projectRoot, "functions").replace(/[\\/]/g, "[\\/]")}.*`,
);

config.resolver.blockList = exclusionList([blockFuncs]);

module.exports = config;
