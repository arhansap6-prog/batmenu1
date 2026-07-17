import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.batmenu.app',
  appName: 'BAT MENU',
  webDir: 'dist',
  server: {
    url: 'https://batmenu1.lovable.app',
    cleartext: true
  }
};

export default config;
