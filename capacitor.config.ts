import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sk.perun.evcharging',
  appName: 'Perun Nabíjanie',
  webDir: 'out',
  server: {
    // Počas vývoja/testovania: načítava sa z Render deploymentu
    // To znamená, že API routes fungujú normálne (bežia na serveri)
    url: 'https://perun-ev-charging.onrender.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'Perun',
  },
};

export default config;
