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
// (#x, #y, etc.) into Hermes-compatible syntax before the bundle is compiled.
// "hermes-stable" leaves those fields as-is and breaks builds against newer
// Xcode / hermes-engine versions (e.g. iOS 26 SDK) that don't support them.
config.transformer.unstable_transformProfile = "default";

module.exports = config;
