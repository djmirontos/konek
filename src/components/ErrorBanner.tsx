'use client'
import { useEffect } from "react";

type Props = {
  message?: string;
  onClose: () => void;
  autoDismiss?: number; // ms, default 5000
};

const FRIENDLY_MESSAGES: Record<string, string> = {
  network: "We're having trouble connecting. Please check your internet connection.",
  auth: "Your session may have expired. Please log in again.",
  upload: "We couldn't upload your file. Please check the file size and try again.",
  post: "We couldn't submit your post. Please try again in a moment.",
  default: "Something went wrong on our end. Please try again.",
};

export function getFriendlyMessage(type?: string): string {
  return FRIENDLY_MESSAGES[type || "default"] || FRIENDLY_MESSAGES.default;
}

export default function ErrorBanner({ message, onClose, autoDismiss = 5000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, autoDismiss);
    return () => clearTimeout(timer);
  }, [onClose, autoDismiss]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 900}}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        width: "min(420px, calc(100vw - 32px))",
        backgroundColor: "#fff", borderRadius: "16px",
        padding: "20px 20px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        zIndex: 901, fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{display: "flex", alignItems: "flex-start", gap: "12px"}}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            backgroundColor: "#FEF2F2", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.1rem", flexShrink: 0
          }}>⚠️</div>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1a1a1a", marginBottom: "4px"}}>
              Oops! Something went wrong
            </div>
            <div style={{fontSize: "0.8rem", color: "#666", lineHeight: 1.5}}>
              {message || FRIENDLY_MESSAGES.default}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "1.1rem", padding: "0", flexShrink: 0, lineHeight: 1}}
          >✕</button>
        </div>

        {/* Progress bar auto-dismiss indicator */}
        <div style={{marginTop: "14px", height: "3px", backgroundColor: "#F0F0F0", borderRadius: "2px", overflow: "hidden"}}>
          <div style={{
            height: "100%", backgroundColor: "#2BB39A", borderRadius: "2px",
            animation: `shrink ${autoDismiss}ms linear forwards`
          }} />
        </div>

        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>

        <div style={{display: "flex", justifyContent: "flex-end", marginTop: "12px"}}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px", borderRadius: "10px", border: "none",
              backgroundColor: "#2BB39A", color: "#fff",
              fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
              fontFamily: "inherit"
            }}
          >Got it</button>
        </div>
      </div>
    </>
  );
}
