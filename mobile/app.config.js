// Mapbox: set EXPO_PUBLIC_MAPBOX_TOKEN for the JS map.
// For native prebuild, optional download token must NOT use RNMapboxMapsDownloadToken in the plugin
// (deprecated) — set env RNMAPBOX_MAPS_DOWNLOAD_TOKEN in your shell or EAS if your SDK build still needs it.
// @see README.md
export default {
  expo: {
    name: 'DieselHunter',
    slug: 'dieselhunter',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0f1419',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.dieselhunter.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0f1419',
      },
      package: 'com.dieselhunter.app',
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsImpl: 'mapbox',
        },
      ],
    ],
    extra: {
      mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
    },
  },
};
