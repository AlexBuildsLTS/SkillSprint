module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Remove 'react-native-worklets/plugin' from here
      'react-native-reanimated/plugin', // This MUST be last
    ],
  };
};
