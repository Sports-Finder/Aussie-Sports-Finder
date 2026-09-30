const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Keep Expo's default watch folders and add the monorepo for pnpm packages.
config.watchFolders = [...new Set([...(config.watchFolders || []), monorepoRoot])];

// Resolve from both the artifact's own node_modules and the monorepo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Transform modern syntax for the Hermes compiler bundled with RN 0.81.
config.transformer.unstable_transformProfile = "default";

// Private class fields (#x etc.) in react-native 0.81.x are handled by the
// postinstall script (scripts/patch-react-native.js) which rewrites them to
// underscore-prefixed properties before the build runs.

module.exports = config;
