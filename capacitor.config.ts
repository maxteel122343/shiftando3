import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shifting.app',
  appName: 'Shifting',
  webDir: 'dist',
  android: {
    // Allow mixed content for loading local assets
    allowMixedContent: true,
    // Use hardware back button to navigate within the app
    captureInput: true,
    // Web container fills under status bar
    backgroundColor: '#0c0a13',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0c0a13',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Status bar overlaps content (transparent status bar)
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000',
    },
    Keyboard: {
      // Resize the body when keyboard opens (not the whole WebView)
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
