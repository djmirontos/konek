"use client"
import { useEffect, useCallback } from "react";

type Props = {
  images: string[];
  startIndex: number;
  onClose: () => void;
  currentIndex: number;
  onIndexChange: (index: number) => void;
};

export default function PhotoViewer({ images, onClose, currentIndex, onIndexChange }: Props) {
  const total = images.length;

  const goPrev = useCallback(() => {
    onIndexChange(currentIndex === 0 ? total - 1 : currentIndex - 1);
  }, [currentIndex, total, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange(currentIndex === total - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, total, onIndexChange]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  let touchStartX = 0;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  }

  return (
    <div
      style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.95)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <div style={{position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", zIndex: 10}}>
        <div style={{color: "#fff", fontSize: "0.9rem", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "rgba(0,0,0,0.4)", padding: "4px 12px", borderRadius: "20px"}}>
          {currentIndex + 1} / {total}
        </div>
        <button
          onClick={onClose}
          style={{background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", fontSize: "1.2rem", cursor: "pointer", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center"}}>
          X
        </button>
      </div>

      {/* Prev Arrow */}
      {total > 1 && (
        <button
          onClick={goPrev}
          style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer", width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10}}>
          &lt;
        </button>
      )}

      {/* Image */}
      <img
        src={images[currentIndex]}
        alt=""
        style={{maxWidth: "100vw", maxHeight: "85vh", objectFit: "contain", userSelect: "none"}}
        draggable={false}
      />

      {/* Next Arrow */}
      {total > 1 && (
        <button
          onClick={goNext}
          style={{position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer", width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10}}>
          &gt;
        </button>
      )}

      {/* Dot Indicators */}
      {total > 1 && (
        <div style={{position: "absolute", bottom: "24px", display: "flex", gap: "8px"}}>
          {images.map((_, i) => (
            <div key={i} onClick={() => onIndexChange(i)} style={{width: i === currentIndex ? "20px" : "8px", height: "8px", borderRadius: "4px", backgroundColor: i === currentIndex ? "#1D9E75" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s"}} />
          ))}
        </div>
      )}
    </div>
  );
}
