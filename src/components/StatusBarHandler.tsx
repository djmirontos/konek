"use client";
import { useEffect } from "react";

export default function StatusBarHandler() {
  useEffect(() => {
    async function setupStatusBar() {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        // Set status bar color to match AppHeader
        await StatusBar.setBackgroundColor({ color: "#2BB39A" });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {
        // Not in Capacitor environment - ignore
      }
    }
    setupStatusBar();
  }, []);

  return null;
}
