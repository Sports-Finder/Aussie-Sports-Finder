module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      // Explicitly transform private class fields (#x, #y, etc.) used in
      // react-native's own source (e.g. DOMRectReadOnly.js). babel-preset-expo
      // does not activate these transforms, so hermesc receives raw private
      // field syntax and rejects it on newer EAS build workers (iOS 26 SDK).
      ["@babel/plugin-transform-class-properties", { loose: true }],
      ["@babel/plugin-transform-private-methods", { loose: true }],
    ],
  };
};
