export default function Loading() {
  return (
    <div style={{minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto"}}>
      {/* Header skeleton */}
      <div style={{height: "56px", backgroundColor: "#2BB39A", display: "flex", alignItems: "center", padding: "0 16px", gap: "12px"}}>
        <div style={{width: "80px", height: "24px", backgroundColor: "rgba(255,255,255,0.3)", borderRadius: "6px"}} />
        <div style={{flex: 1}} />
        <div style={{width: "32px", height: "32px", backgroundColor: "rgba(255,255,255,0.3)", borderRadius: "50%"}} />
        <div style={{width: "32px", height: "32px", backgroundColor: "rgba(255,255,255,0.3)", borderRadius: "50%"}} />
      </div>

      {/* Composer skeleton */}
      <div style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: "10px"}}>
        <div style={{width: "36px", height: "36px", backgroundColor: "#F0F0F0", borderRadius: "50%"}} />
        <div style={{flex: 1, height: "36px", backgroundColor: "#F0F0F0", borderRadius: "20px"}} />
      </div>

      {/* Post skeletons */}
      {[1,2,3].map(i => (
        <div key={i} style={{padding: "16px", borderBottom: "1px solid #F0F0F0"}}>
          <div style={{display: "flex", gap: "10px", marginBottom: "10px"}}>
            <div style={{width: "40px", height: "40px", backgroundColor: "#F0F0F0", borderRadius: "50%", flexShrink: 0}} />
            <div style={{flex: 1}}>
              <div style={{width: "140px", height: "14px", backgroundColor: "#F0F0F0", borderRadius: "4px", marginBottom: "6px"}} />
              <div style={{width: "90px", height: "12px", backgroundColor: "#F0F0F0", borderRadius: "4px"}} />
            </div>
          </div>
          <div style={{width: "100%", height: "14px", backgroundColor: "#F0F0F0", borderRadius: "4px", marginBottom: "6px"}} />
          <div style={{width: "80%", height: "14px", backgroundColor: "#F0F0F0", borderRadius: "4px", marginBottom: "6px"}} />
          <div style={{width: "60%", height: "14px", backgroundColor: "#F0F0F0", borderRadius: "4px"}} />
        </div>
      ))}

      {/* Bottom nav skeleton */}
      <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", height: "60px", backgroundColor: "#fff", borderTop: "1px solid #F0F0F0"}} />
    </div>
  );
}
