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
  }
};

export default config;
