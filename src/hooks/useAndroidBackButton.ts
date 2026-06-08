import { useEffect, useRef } from 'react';

export function useAndroidBackButton() {
  const lastBackPress = useRef<number>(0);

  useEffect(() => {
    let App: any = null;

    async function setupBackButton() {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        App = CapApp;

        App.addListener('backButton', () => {
          const currentPath = window.location.pathname;

          // Never go back to login or signup pages
          const authPages = ['/login', '/signup', '/'];
          
          // If on feeds (home) - double press to exit
          if (currentPath === '/feeds') {
            const now = Date.now();
            if (now - lastBackPress.current < 2000) {
              App.exitApp();
            } else {
              lastBackPress.current = now;
              showExitToast();
            }
            return;
          }

          // If on auth pages - go to feeds instead
          if (authPages.includes(currentPath)) {
            window.location.href = '/feeds';
            return;
          }

          // For all other pages - go back in history
          // But check if previous page is an auth page
          if (window.history.length > 1) {
            // Go back safely
            window.history.back();
            
            // After going back, check if we landed on auth page
            setTimeout(() => {
              const newPath = window.location.pathname;
              if (authPages.includes(newPath)) {
                window.location.href = '/feeds';
              }
            }, 100);
            return;
          }

          // No history - go to feeds
          window.location.href = '/feeds';
        });

      } catch (e) {
        // Not running in Capacitor (web browser) - ignore
      }
    }

    function showExitToast() {
      const existing = document.getElementById('exit-toast');
      if (existing) return;
      
      const toast = document.createElement('div');
      toast.id = 'exit-toast';
      toast.innerText = 'Press back again to exit';
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: #fff;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        font-family: 'Plus Jakarta Sans', sans-serif;
        z-index: 99999;
        white-space: nowrap;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 2000);
    }

    setupBackButton();

    return () => {
      if (App) {
        App.removeAllListeners();
      }
    };
  }, []);
}
