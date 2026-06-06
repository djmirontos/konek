"use client"
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: "url('/bg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      display: "flex", flexDirection: "column",
      maxWidth: "480px", margin: "0 auto",
      fontFamily: "var(--font-inter), sans-serif",
      position: "relative", overflow: "hidden"
    }}>

      {/* Logo */}
      <div style={{padding: "44px 28px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
        <Image src="/whitebg.svg" alt="Klasmeyt" width={180} height={50} priority style={{filter: "brightness(0) invert(1)"}} />
      </div>

      {/* Content Card */}
      <div style={{
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "24px 24px 0 0",
        padding: "28px 20px 0",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column"
      }}>
        {/* Heading */}
        <div style={{marginBottom: "24px", textAlign: "center"}}>
          <h1 style={{
            fontWeight: 700, fontSize: "1.35rem", color: "#0F2E27",
            margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif",
            lineHeight: 1.3
          }}>
            A cleaner, simpler campus hub.
          </h1>
          <p style={{fontSize: "0.82rem", color: "#666", margin: 0, lineHeight: 1.5}}>
            All your features, beautifully arranged for effortless focus.
          </p>
        </div>

        {/* Feature Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr 1fr",
          gridTemplateRows: "auto auto",
          gap: "10px",
          marginBottom: "24px"
        }}>
          {/* Campus Feeds */}
          <div style={{backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #CBF7E5", padding: "16px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 2px 8px rgba(43,179,154,0.06)"}}>
            <span style={{fontSize: "2rem"}}>📰</span>
            <span style={{fontSize: "0.72rem", fontWeight: 600, color: "#0F2E27", textAlign: "center", lineHeight: 1.3, fontFamily: "var(--font-poppins), sans-serif"}}>Campus Feeds</span>
          </div>

          {/* Center: Mini App Preview */}
          <div style={{
            gridRow: "1 / 3",
            backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #CBF7E5",
            padding: "14px 10px", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(43,179,154,0.08)"
          }}>
            <div style={{
              width: "100%", backgroundColor: "#F6FFFC",
              borderRadius: "12px", padding: "10px",
              border: "1px solid #E0F5EE"
            }}>
              <div style={{display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px"}}>
                <div style={{width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#A7E9CF"}} />
                <div>
                  <div style={{height: "5px", width: "50px", backgroundColor: "#CBF7E5", borderRadius: "3px", marginBottom: "3px"}} />
                  <div style={{height: "4px", width: "35px", backgroundColor: "#E0F5EE", borderRadius: "2px"}} />
                </div>
              </div>
              <div style={{height: "5px", backgroundColor: "#E0F5EE", borderRadius: "3px", marginBottom: "4px", width: "95%"}} />
              <div style={{height: "5px", backgroundColor: "#E0F5EE", borderRadius: "3px", marginBottom: "4px", width: "80%"}} />
              <div style={{height: "5px", backgroundColor: "#E0F5EE", borderRadius: "3px", marginBottom: "10px", width: "60%"}} />
              <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
                <span style={{fontSize: "0.65rem"}}>❤️</span>
                <span style={{fontSize: "0.65rem"}}>💬</span>
                <span style={{fontSize: "0.65rem"}}>🔗</span>
              </div>
            </div>
          </div>

          {/* Shout Out */}
          <div style={{backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #CBF7E5", padding: "16px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 2px 8px rgba(43,179,154,0.06)"}}>
            <span style={{fontSize: "2rem"}}>📢</span>
            <span style={{fontSize: "0.72rem", fontWeight: 600, color: "#0F2E27", textAlign: "center", lineHeight: 1.3, fontFamily: "var(--font-poppins), sans-serif"}}>Shout Out</span>
          </div>

          {/* Bazaar */}
          <div style={{backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #CBF7E5", padding: "16px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 2px 8px rgba(43,179,154,0.06)"}}>
            <span style={{fontSize: "2rem"}}>🛒</span>
            <span style={{fontSize: "0.72rem", fontWeight: 600, color: "#0F2E27", textAlign: "center", lineHeight: 1.3, fontFamily: "var(--font-poppins), sans-serif"}}>Bazaar</span>
          </div>

          {/* Living */}
          <div style={{backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #CBF7E5", padding: "16px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 2px 8px rgba(43,179,154,0.06)"}}>
            <span style={{fontSize: "2rem"}}>🏠</span>
            <span style={{fontSize: "0.72rem", fontWeight: 600, color: "#0F2E27", textAlign: "center", lineHeight: 1.3, fontFamily: "var(--font-poppins), sans-serif"}}>Living</span>
          </div>

          {/* Messages */}
          <div style={{backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #CBF7E5", padding: "16px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 2px 8px rgba(43,179,154,0.06)"}}>
            <span style={{fontSize: "2rem"}}>💬</span>
            <span style={{fontSize: "0.72rem", fontWeight: 600, color: "#0F2E27", textAlign: "center", lineHeight: 1.3, fontFamily: "var(--font-poppins), sans-serif"}}>Messages</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div style={{marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "calc(32px + env(safe-area-inset-bottom))"}}>
          <Link href="/signup" style={{
            display: "block", width: "100%", backgroundColor: "#2BB39A",
            color: "#fff", textAlign: "center", padding: "16px",
            borderRadius: "16px", fontWeight: 700, fontSize: "0.95rem",
            textDecoration: "none", boxSizing: "border-box",
            fontFamily: "var(--font-poppins), sans-serif",
            boxShadow: "0 4px 16px rgba(43,179,154,0.3)"
          }}>
            Get Started — It's Free
          </Link>
          <Link href="/login" style={{
            display: "block", width: "100%",
            backgroundColor: "rgba(255,255,255,0.8)",
            color: "#2BB39A", textAlign: "center", padding: "16px",
            borderRadius: "16px", fontWeight: 700, fontSize: "0.95rem",
            textDecoration: "none", boxSizing: "border-box",
            fontFamily: "var(--font-poppins), sans-serif",
            border: "1.5px solid #A7E9CF"
          }}>
            Log In
          </Link>
          <p style={{textAlign: "center", fontSize: "0.68rem", color: "#999", margin: "4px 0 0", lineHeight: 1.5}}>
            By continuing, you agree to Klasmeyt's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
