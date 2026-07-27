const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the full monorepo so Metro can resolve packages from the pnpm store.
config.watchFolders = [monorepoRoot];

// Resolve from both the artifact's own node_modules and the monorepo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// NOTE: Do NOT set unstable_transformProfile here. The default ("hermes-stable")
// is correct for RN 0.81 — it lets Metro output class syntax which hermesc
// compiles natively. Setting it to "default" changes the bundle format in a
// way that causes hermesc on the iOS 26 SDK to reject ALL class declarations.
//
// Private class fields (#x etc.) in react-native 0.81.x are handled by the
// postinstall script (scripts/patch-react-native.js) which rewrites them to
// underscore-prefixed properties before the build runs.

module.exports = config;
