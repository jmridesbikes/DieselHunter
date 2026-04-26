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
    plugins: [],
  },
};
