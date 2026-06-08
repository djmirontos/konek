import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.klasmeyt.app',
  appName: 'Klasmeyt',
  webDir: 'out',
  server: {
    url: 'https://klasmeyt.com',
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#2BB39A'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2BB39A',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    }
  }
};

export default config;
