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

// Force Babel to apply every transform that older Hermes versions require,
// including private class fields (#x, #y, etc.) used by RN 0.81's own source.
// Without this, the local linux hermesc (v0.12.0) rejects the bundle.
config.transformer.unstable_transformProfile = "hermes-stable";

module.exports = config;
