"use client"
import { useEffect, useCallback, useRef, useState } from "react";

type Props = {
  images: string[];
  startIndex: number;
  onClose: () => void;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  posterName?: string;
  posterAvatar?: string | null;
  timestamp?: string;
  likeCount?: number;
  commentCount?: number;
  postId?: string;
  onOpenPost?: () => void;
};

function formatTime(ts?: string) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

export default function PhotoViewer({
  images, onClose, currentIndex, onIndexChange,
  posterName, posterAvatar, timestamp,
  likeCount, commentCount, onOpenPost
}: Props) {
  const total = images.length;
  const [showUI, setShowUI] = useState(true);
  const [showLongPress, setShowLongPress] = useState(false);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastTap = useRef(0);
  const isDragging = useRef(false);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const swipeStartY = useRef(0);
  const [swipeY, setSwipeY] = useState(0);

  const goPrev = useCallback(() => {
    if (scale > 1) return;
    onIndexChange(currentIndex === 0 ? total - 1 : currentIndex - 1);
    setScale(1); setTranslateX(0); setTranslateY(0);
  }, [currentIndex, total, onIndexChange, scale]);

  const goNext = useCallback(() => {
    if (scale > 1) return;
    onIndexChange(currentIndex === total - 1 ? 0 : currentIndex + 1);
    setScale(1); setTranslateX(0); setTranslateY(0);
  }, [currentIndex, total, onIndexChange, scale]);

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

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.sqrt(dx*dx + dy*dy);
      pinchStartScale.current = scale;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeStartY.current = e.touches[0].clientY;
    dragStartX.current = translateX;
    dragStartY.current = translateY;
    isDragging.current = false;

    // Long press
    longPressTimer.current = setTimeout(() => {
      setShowLongPress(true);
    }, 600);
  }

  function handleTouchMove(e: React.TouchEvent) {
    // Pinch zoom
    if (e.touches.length === 2) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const newScale = Math.min(4, Math.max(1, pinchStartScale.current * (dist / pinchStartDist.current)));
      setScale(newScale);
      return;
    }

    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    isDragging.current = true;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (scale > 1) {
      setTranslateX(dragStartX.current + dx);
      setTranslateY(dragStartY.current + dy);
    } else {
      // Swipe down to close
      if (dy > 0) setSwipeY(dy);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    // Swipe down to close
    if (scale <= 1 && swipeY > 100) { onClose(); return; }
    setSwipeY(0);

    if (!isDragging.current) {
      // Double tap to zoom
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (scale > 1) { setScale(1); setTranslateX(0); setTranslateY(0); }
        else { setScale(2.5); }
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
      // Single tap toggle UI
      setTimeout(() => {
        if (Date.now() - lastTap.current >= 250) setShowUI(prev => !prev);
      }, 300);
      return;
    }

    if (scale <= 1) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goNext(); else goPrev();
      }
    }
  }

  const opacity = Math.max(0, 1 - swipeY / 300);
  const bgOpacity = Math.max(0.3, 0.95 - swipeY / 300);

  return (
    <div style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0," + bgOpacity + ")", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: swipeY === 0 ? "background-color 0.2s" : "none"}}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* HEADER */}
      {showUI && (
        <div style={{position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: "16px", background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)", display: "flex", alignItems: "center", gap: "10px", opacity}}>
          <button onClick={onClose} style={{background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer", padding: "4px", lineHeight: 1, flexShrink: 0}}>←</button>
          {posterAvatar
            ? <img src={posterAvatar} alt="" style={{width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.5)", flexShrink: 0}} />
            : <div style={{width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{posterName?.charAt(0).toUpperCase()}</div>
          }
          <div style={{flex: 1}}>
            <div style={{color: "#fff", fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>{posterName}</div>
            <div style={{color: "rgba(255,255,255,0.7)", fontSize: "0.72rem", marginTop: "1px"}}>{formatTime(timestamp)}</div>
          </div>
          {total > 1 && (
            <div style={{color: "#fff", fontSize: "0.8rem", fontWeight: 700, backgroundColor: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: "20px", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
              Photo {currentIndex + 1} of {total}
            </div>
          )}
        </div>
      )}

      {/* IMAGE */}
      <div style={{transform: "translateY(" + swipeY + "px)", transition: swipeY === 0 ? "transform 0.2s" : "none", width: "100%", display: "flex", alignItems: "center", justifyContent: "center"}}>
        <img
          src={images[currentIndex]}
          alt=""
          style={{maxWidth: "100vw", maxHeight: "90vh", objectFit: "contain", userSelect: "none", transform: "scale(" + scale + ") translate(" + translateX/scale + "px," + translateY/scale + "px)", transition: scale === 1 && swipeY === 0 ? "transform 0.2s" : "none", opacity}}
          draggable={false}
        />
      </div>

      {/* DOT INDICATORS */}
      {total > 1 && showUI && (
        <div style={{position: "absolute", bottom: "80px", display: "flex", gap: "6px", opacity}}>
          {images.map((_, i) => (
            <div key={i} onClick={() => { onIndexChange(i); setScale(1); setTranslateX(0); setTranslateY(0); }}
              style={{width: i === currentIndex ? "20px" : "7px", height: "7px", borderRadius: "4px", backgroundColor: i === currentIndex ? "#1D9E75" : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s"}} />
          ))}
        </div>
      )}

      {/* FOOTER */}
      {showUI && (
        <div style={{position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px 32px", background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)", display: "flex", gap: "20px", alignItems: "center", opacity}}>
          <span style={{color: "#fff", fontSize: "0.85rem", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>❤️ {likeCount || 0}</span>
          <span onClick={onOpenPost} style={{color: "#fff", fontSize: "0.85rem", fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: onOpenPost ? "pointer" : "default"}}>💬 {commentCount || 0}</span>
        </div>
      )}

      {/* PREV / NEXT arrows (desktop) */}
      {total > 1 && showUI && (
        <>
          <button onClick={goPrev} style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: "1.2rem", cursor: "pointer", width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10}}>‹</button>
          <button onClick={goNext} style={{position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: "1.2rem", cursor: "pointer", width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10}}>›</button>
        </>
      )}

      {/* LONG PRESS MENU */}
      {showLongPress && (
        <div style={{position: "fixed", inset: 0, zIndex: 20, display: "flex", alignItems: "flex-end", justifyContent: "center"}} onClick={() => setShowLongPress(false)}>
          <div style={{backgroundColor: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: "480px", padding: "8px 0 32px", fontFamily: "'Plus Jakarta Sans', sans-serif"}} onClick={e => e.stopPropagation()}>
            <div style={{width: "36px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "8px auto 16px"}} />
            {[
              { icon: "⬇️", label: "Save Image", action: () => { const a = document.createElement("a"); a.href = images[currentIndex]; a.download = "konek-photo.jpg"; a.click(); setShowLongPress(false); } },
              { icon: "↗️", label: "Share Image", action: () => { if (navigator.share) navigator.share({ url: images[currentIndex] }); setShowLongPress(false); } },
              { icon: "🚩", label: "Report Image", action: () => { setShowLongPress(false); } },
            ].map((item, i) => (
              <button key={i} onClick={item.action} style={{width: "100%", padding: "14px 24px", border: "none", background: "none", display: "flex", alignItems: "center", gap: "16px", fontSize: "0.95rem", fontWeight: 600, color: item.label === "Report Image" ? "#EF4444" : "#1A1A1A", cursor: "pointer", fontFamily: "inherit"}}>
                <span style={{fontSize: "1.2rem"}}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
