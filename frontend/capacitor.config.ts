import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.panigestion.app',
  appName: 'PANI GESTION',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true, // Permet les appels HTTP en réseau local
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#16a34a',
    },
  },
};

export default config;

