import { useEffect } from 'react';

export function useAndroidBackButton() {
  useEffect(() => {
    let App: any = null;

    async function setupBackButton() {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        App = CapApp;
        App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            // If no history, go to feeds instead of closing
            if (window.location.pathname !== '/feeds') {
              window.location.href = '/feeds';
            } else {
              App.exitApp();
            }
          }
        });
      } catch (e) {
        // Not running in Capacitor (web browser) - ignore
      }
    }

    setupBackButton();

    return () => {
      if (App) {
        App.removeAllListeners();
      }
    };
  }, []);
}
