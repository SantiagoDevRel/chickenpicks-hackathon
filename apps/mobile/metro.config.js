// Metro config for Expo + NativeWind. We also enable workspace symlink
// resolution so this app can consume @chickenpicks/shared and
// @chickenpicks/anchor-client from the pnpm monorepo if/when we wire them
// up. For now we vendor constants + IDL directly inside ./lib so the Expo
// bundler doesn't need to chase symlinks across packages.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so workspace package changes hot-reload.
config.watchFolders = [workspaceRoot];

// Resolve modules from local + workspace node_modules. pnpm flattens
// peer deps at the workspace root, so this must come second.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Solana / Anchor / Privy (jose) pull in node-only modules; alias safe stubs.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
  crypto: require.resolve('expo-crypto'),
  stream: path.resolve(projectRoot, 'lib/empty.js'),
  util: require.resolve('util'),
};

config.resolver.unstable_enablePackageExports = true;
// Prefer browser/react-native package exports over Node's so jose, ws, etc.
// pick their browser-compatible runtimes instead of importing fs/util/etc.
config.resolver.unstable_conditionNames = ['require', 'react-native', 'browser'];

module.exports = withNativeWind(config, { input: './global.css' });
