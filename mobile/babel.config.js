// Use require.resolve() so Metro's transform workers (separate node processes) resolve
// these packages from this app's node_modules, not a hoisted/ambiguous path.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [require.resolve('babel-preset-expo')],
    plugins: [require.resolve('react-native-reanimated/plugin')],
  };
};
