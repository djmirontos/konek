"use client";
import { useState, useEffect } from "react";

export default function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    function handleOffline() { setIsOffline(true); }
    function handleOnline() { setIsOffline(false); }

    // Check initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <>
      <div style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          backgroundColor: "#fff", borderRadius: "20px", padding: "32px 24px",
          maxWidth: "320px", width: "90%", textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
        }}>
          <div style={{fontSize: "3rem", marginBottom: "16px"}}>📡</div>
          <div style={{
            fontWeight: 700, fontSize: "1.1rem", color: "#1A1A1A",
            marginBottom: "8px", fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            No Internet Connection
          </div>
          <div style={{
            fontSize: "0.85rem", color: "#888", lineHeight: 1.6,
            marginBottom: "24px", fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Please check your connection and try again. Klasmeyt needs internet to work.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#2BB39A", color: "#fff", border: "none",
              borderRadius: "12px", padding: "12px 32px", fontWeight: 700,
              fontSize: "0.9rem", cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
            Try Again
          </button>
        </div>
      </div>
    </>
  );
}
