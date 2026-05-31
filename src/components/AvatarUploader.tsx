'use client'
import { useState, useRef, useCallback, useEffect } from "react";

interface AvatarUploaderProps {
  onComplete: (file: File) => void;
  onCancel: () => void;
}

export default function AvatarUploader({ onComplete, onCancel }: AvatarUploaderProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastOffset, setLastOffset] = useState({ x: 0, y: 0 });
  const [pinchStartDist, setPinchStartDist] = useState<number | null>(null);
  const [pinchStartZoom, setPinchStartZoom] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animRef = useRef<number | null>(null);

  const SIZE = 300;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert("Image must be under 20MB"); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      // auto-fit zoom so image fills the circle
      const minDim = Math.min(img.width, img.height);
      const fitZoom = SIZE / minDim;
      setZoom(fitZoom);
      setOffset({ x: 0, y: 0 });
      setLastOffset({ x: 0, y: 0 });
      setImageSrc(url);
    };
    img.src = url;
  }

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const scaledW = img.width * zoom;
    const scaledH = img.height * zoom;
    const x = SIZE / 2 - scaledW / 2 + offset.x;
    const y = SIZE / 2 - scaledH / 2 + offset.y;
    ctx.drawImage(img, x, y, scaledW, scaledH);
    ctx.restore();

    // circle border
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "#1D9E75";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [zoom, offset]);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(drawCanvas);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [drawCanvas]);

  // Mouse drag
  function onMouseDown(e: React.MouseEvent) {
    setDragging(true);
    setDragStart({ x: e.clientX - lastOffset.x, y: e.clientY - lastOffset.y });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const newOffset = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
    setOffset(newOffset);
    setLastOffset(newOffset);
  }
  function onMouseUp() { setDragging(false); }

  // Touch drag + pinch
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX - lastOffset.x, y: e.touches[0].clientY - lastOffset.y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchStartDist(dist);
      setPinchStartZoom(zoom);
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1 && dragging) {
      const newOffset = { x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y };
      setOffset(newOffset);
      setLastOffset(newOffset);
    } else if (e.touches.length === 2 && pinchStartDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newZoom = Math.min(5, Math.max(0.5, pinchStartZoom * (dist / pinchStartDist)));
      setZoom(newZoom);
    }
  }
  function onTouchEnd() { setDragging(false); setPinchStartDist(null); }

  function handleConfirm() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // export to 512x512
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 512;
    exportCanvas.height = 512;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0, 512, 512);
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onComplete(file);
    }, "image/jpeg", 0.88);
  }

  return (
    <div style={{position: "fixed", inset: 0, zIndex: 600, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px"}}>

      {!imageSrc ? (
        // FILE PICKER STATE
        <div style={{backgroundColor: "#fff", borderRadius: "20px", padding: "32px 24px", textAlign: "center", width: "100%", maxWidth: "360px"}}>
          <div style={{fontSize: "3rem", marginBottom: "12px"}}>📷</div>
          <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "6px"}}>Choose a Photo</div>
          <div style={{fontSize: "0.8rem", color: "#888", marginBottom: "20px"}}>Select a photo to use as your profile picture</div>
          <button onClick={() => fileInputRef.current?.click()}
            style={{width: "100%", backgroundColor: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", marginBottom: "10px"}}>
            Choose Photo
          </button>
          <button onClick={onCancel}
            style={{width: "100%", backgroundColor: "#F7F7F7", color: "#888", border: "none", borderRadius: "10px", padding: "13px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit"}}>
            Cancel
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" style={{display: "none"}} onChange={handleFileSelect} />
        </div>
      ) : (
        // CROPPER STATE
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "100%", maxWidth: "360px"}}>
          <div style={{color: "#fff", fontWeight: 700, fontSize: "1rem"}}>Crop Your Photo</div>
          <div style={{fontSize: "0.78rem", color: "rgba(255,255,255,0.7)"}}>Drag to reposition · Pinch or slider to zoom</div>

          {/* CANVAS */}
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{borderRadius: "50%", cursor: dragging ? "grabbing" : "grab", touchAction: "none", boxShadow: "0 0 0 4px #1D9E75"}}
          />

          {/* ZOOM SLIDER */}
          <div style={{width: "100%", display: "flex", alignItems: "center", gap: "10px"}}>
            <span style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.7)"}}>🔍−</span>
            <input type="range" min={0.3} max={5} step={0.01} value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              style={{flex: 1, accentColor: "#1D9E75"}} />
            <span style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.7)"}}>🔍+</span>
          </div>

          {/* BUTTONS */}
          <div style={{display: "flex", gap: "12px", width: "100%"}}>
            <button onClick={() => { setImageSrc(null); setZoom(1); setOffset({x:0,y:0}); setLastOffset({x:0,y:0}); }}
              style={{flex: 1, backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", padding: "13px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit"}}>
              Change Photo
            </button>
            <button onClick={handleConfirm}
              style={{flex: 2, backgroundColor: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit"}}>
              Use This Photo
            </button>
          </div>

          <button onClick={onCancel}
            style={{background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit"}}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
