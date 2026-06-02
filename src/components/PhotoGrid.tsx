'use client'

type Props = {
  images: string[];
  onImageClick: (index: number) => void;
};

export default function PhotoGrid({ images, onImageClick }: Props) {
  const count = images.length;
  if (count === 0) return null;

  const imgStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: "100%", height: "100%", objectFit: "cover", display: "block",
    cursor: "pointer", borderRadius: "0px", ...extra
  });

  // Single photo
  if (count === 1) {
    return (
      <div style={{borderRadius: "12px", overflow: "hidden", marginBottom: "8px", backgroundColor: "#F7F7F7"}}>
        <img src={images[0]} alt="" onClick={() => onImageClick(0)}
          style={{width: "100%", maxHeight: "400px", objectFit: "cover", display: "block", cursor: "pointer"}} />
      </div>
    );
  }

  // Two photos
  if (count === 2) {
    return (
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", borderRadius: "12px", overflow: "hidden", marginBottom: "8px", height: "220px"}}>
        {images.map((url, i) => (
          <img key={i} src={url} alt="" onClick={() => onImageClick(i)} style={imgStyle()} />
        ))}
      </div>
    );
  }

  // Three photos: 1 large left + 2 stacked right
  if (count === 3) {
    return (
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", borderRadius: "12px", overflow: "hidden", marginBottom: "8px", height: "260px"}}>
        <img src={images[0]} alt="" onClick={() => onImageClick(0)} style={imgStyle()} />
        <div style={{display: "grid", gridTemplateRows: "1fr 1fr", gap: "2px", height: "260px"}}>
          <img src={images[1]} alt="" onClick={() => onImageClick(1)} style={imgStyle()} />
          <img src={images[2]} alt="" onClick={() => onImageClick(2)} style={imgStyle()} />
        </div>
      </div>
    );
  }

  // Four photos: 2x2 grid
  if (count === 4) {
    return (
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "2px", borderRadius: "12px", overflow: "hidden", marginBottom: "8px", height: "260px"}}>
        {images.map((url, i) => (
          <img key={i} src={url} alt="" onClick={() => onImageClick(i)} style={imgStyle()} />
        ))}
      </div>
    );
  }

  // Five or more: show first 4, overlay +N on last
  return (
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "2px", borderRadius: "12px", overflow: "hidden", marginBottom: "8px", height: "260px"}}>
      {images.slice(0, 3).map((url, i) => (
        <img key={i} src={url} alt="" onClick={() => onImageClick(i)} style={imgStyle()} />
      ))}
      <div style={{position: "relative", cursor: "pointer"}} onClick={() => onImageClick(3)}>
        <img src={images[3]} alt="" style={imgStyle()} />
        <div style={{position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center"}}>
          <span style={{color: "#fff", fontSize: "1.6rem", fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif"}}>+{count - 4}</span>
        </div>
      </div>
    </div>
  );
}
