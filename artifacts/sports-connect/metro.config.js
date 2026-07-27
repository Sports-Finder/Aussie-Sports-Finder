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

// Use the "default" transform profile so Babel converts private class fields
// into Hermes-compatible syntax where possible.
// Note: DOMRectReadOnly.js (react-native 0.81.5) uses private class fields
// that hermesc on iOS 26 SDK rejects. It is patched directly via the
// postinstall script (scripts/patch-react-native.js).
config.transformer.unstable_transformProfile = "default";

module.exports = config;
