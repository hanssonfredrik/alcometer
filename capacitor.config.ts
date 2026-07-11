import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'se.venueve.neontracker',
  appName: 'Neon Tracker',
  webDir: 'dist',
  // Match the app's darkest background so native gaps (launch, overscroll,
  // keyboard transitions) never flash white.
  backgroundColor: '#08070c',
  plugins: {
    SplashScreen: {
      backgroundColor: '#08070c',
      launchAutoHide: true,
      launchShowDuration: 400,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // System bars are owned by @capacitor-community/safe-area, which also
    // polyfills env(safe-area-inset-*) on WebViews that misreport it.
    SafeArea: {
      statusBarStyle: 'DARK',
      navigationBarStyle: 'DARK',
    },
    SystemBars: {
      insetsHandling: 'disable',
    },
  },
}

export default config
