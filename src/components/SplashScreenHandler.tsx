"use client";
import { useEffect } from "react";

export default function SplashScreenHandler() {
  useEffect(() => {
    async function hideSplash() {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        // Wait for page to be ready then hide splash
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch {
        // Not in Capacitor environment - ignore
      }
    }

    // Hide splash after page loads
    if (document.readyState === "complete") {
      hideSplash();
    } else {
      window.addEventListener("load", hideSplash);
      return () => window.removeEventListener("load", hideSplash);
    }
  }, []);

  return null;
}
