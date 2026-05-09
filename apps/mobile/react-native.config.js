// react-native-worklets is needed at JS/babel level (react-native-css-interop's
// babel.js references 'react-native-worklets/plugin' unconditionally), but its
// NATIVE Android codegen produces a C++ class (NativeWorkletsModuleSpecJSI)
// that ALSO ships inside react-native-reanimated 3.17 — so autolinking both
// causes the linker to fail with 'redefinition of NativeWorkletsModuleSpecJSI'.
//
// Solution: keep react-native-worklets installed for the babel plugin, but
// disable its native autolinking. Reanimated provides the native side already.
module.exports = {
  dependencies: {
    'react-native-worklets': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
