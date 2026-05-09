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
// (Append, don't replace — Expo's defaults must stay.)
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// Resolve modules from local + workspace node_modules. pnpm flattens
// peer deps at the workspace root, so this must come second.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Solana / Anchor / Privy (jose) pull in node-only modules; alias safe stubs.
// We also force 'jose' itself to its bundled-browser entry below (see resolveRequest)
// to avoid having to polyfill the entire Node stdlib (http, https, fs, path, os, ...).
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
  crypto: require.resolve('expo-crypto'),
  stream: path.resolve(projectRoot, 'lib/empty.js'),
  util: require.resolve('util'),
};

config.resolver.unstable_enablePackageExports = true;
// CRITICAL: do NOT add 'browser' as a global condition.
// @solana-mobile/mobile-wallet-adapter-protocol declares 'browser' BEFORE
// 'react-native' in its package.json exports — and Metro picks the first
// matching condition. With 'browser' active, MWA loads its web-only runtime
// which throws "secure context (https)" inside a native APK.
config.resolver.unstable_conditionNames = ['require', 'react-native'];

// Per-package browser-condition exception for jose (Privy's JWT lib).
// jose's node runtime imports http/https/zlib/util/fs which would each need
// polyfilling. Its browser bundle is self-contained. We can't add 'browser'
// globally (breaks MWA — see above), so we intercept just jose imports here.
const upstreamResolveRequest =
  config.resolver.resolveRequest ?? null;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'jose' || moduleName.startsWith('jose/')) {
    const ctx = {
      ...context,
      unstable_conditionNames: ['require', 'browser'],
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
