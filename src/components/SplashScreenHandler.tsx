"use client";
import { useEffect } from "react";

export default function SplashScreenHandler() {
  useEffect(() => {
    async function hideSplash() {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide({ fadeOutDuration: 500 });
        console.log("Splash screen hidden");
      } catch (e) {
        console.log("Not in Capacitor environment");
      }
    }

    // Try immediately
    hideSplash();

    // Also try after short delays as fallback
    const t1 = setTimeout(hideSplash, 500);
    const t2 = setTimeout(hideSplash, 1500);
    const t3 = setTimeout(hideSplash, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return null;
}
