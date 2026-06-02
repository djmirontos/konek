'use client'

type Props = {
  src: string;
  name: string;
  onClose: () => void;
};

export default function AvatarViewer({ src, name, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif"}}
    >
      <div style={{position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <div style={{color: "#fff", fontWeight: 700, fontSize: "0.95rem"}}>{name}</div>
        <button onClick={onClose} style={{background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: "1.1rem", cursor: "pointer", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center"}}>x</button>
      </div>
      <img
        src={src}
        alt={name}
        onClick={e => e.stopPropagation()}
        style={{width: "280px", height: "280px", borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.2)", boxShadow: "0 8px 40px rgba(0,0,0,0.6)"}}
      />
      <div style={{color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginTop: "16px"}}>Tap anywhere to close</div>
    </div>
  );
}
