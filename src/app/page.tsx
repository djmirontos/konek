"use client"
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const features = [
    { emoji: "\u{1F4F0}", title: "Campus Feeds", desc: "Stay updated with what\u2019s happening on campus" },
    { emoji: "\u{1F4E2}", title: "Shout Out", desc: "Voice your opinions and be heard by schoolmates" },
    { emoji: "\u{1F6D2}", title: "Bazaar", desc: "Buy and sell textbooks, gadgets, and more" },
    { emoji: "\u{1F3E0}", title: "Living", desc: "Find affordable boarding houses near campus" },
    { emoji: "\u{1F4AC}", title: "Messages", desc: "Chat privately with your schoolmates" },
  ];

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

      {/* Top Section */}
      <div style={{padding: "48px 28px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
        <div style={{marginBottom: "10px"}}>
          <Image src="/whitebg.svg" alt="Klasmeyt" width={220} height={62} priority style={{filter: "brightness(0) invert(1)"}} />
        </div>
        <p style={{fontSize: "1.05rem", color: "rgba(255,255,255,0.92)", fontWeight: 500, margin: 0, letterSpacing: "0.02em", fontFamily: "var(--font-poppins), sans-serif"}}>
          Your Campus. Your Community.
        </p>
        <div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "14px", flexWrap: "wrap"}}>
          {["Free", "No Ads", "Campus Only"].map(tag => (
            <span key={tag} style={{
              fontSize: "0.7rem", color: "rgba(255,255,255,0.85)", fontWeight: 600,
              letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: "4px",
              backgroundColor: "rgba(255,255,255,0.15)", padding: "5px 12px", borderRadius: "20px",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)"
            }}>
              {"\u2713"} {tag}
            </span>
          ))}
        </div>
      </div>

      {/* White Card with glassmorphism */}
      <div style={{
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "24px 24px 0 0",
        padding: "28px 24px 0",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.06)"
      }}>
        {/* Section Title */}
        <div style={{marginBottom: "20px"}}>
          <div style={{fontWeight: 700, fontSize: "1.15rem", color: "#0F2E27", marginBottom: "4px", fontFamily: "var(--font-poppins), sans-serif"}}>
            Everything your campus needs
          </div>
          <div style={{fontSize: "0.82rem", color: "#666"}}>
            Join thousands of students already on Klasmeyt
          </div>
        </div>

        {/* Features */}
        <div style={{display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px"}}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "14px", padding: "12px 14px",
              backgroundColor: "#F6FFFC", borderRadius: "16px", border: "1px solid #CBF7E5",
              boxShadow: "0 1px 4px rgba(43,179,154,0.06)"
            }}>
              <div style={{
                width: "42px", height: "42px", borderRadius: "14px",
                backgroundColor: "#CBF7E5", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "1.2rem", flexShrink: 0
              }}>
                {f.emoji}
              </div>
              <div>
                <div style={{fontWeight: 600, fontSize: "0.875rem", color: "#0F2E27", fontFamily: "var(--font-poppins), sans-serif"}}>{f.title}</div>
                <div style={{fontSize: "0.72rem", color: "#666", marginTop: "2px", lineHeight: 1.4}}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div style={{display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "calc(32px + env(safe-area-inset-bottom))"}}>
          <Link href="/signup" style={{
            display: "block", width: "100%", backgroundColor: "#2BB39A",
            color: "#fff", textAlign: "center", padding: "16px",
            borderRadius: "16px", fontWeight: 700, fontSize: "0.95rem",
            textDecoration: "none", boxSizing: "border-box",
            fontFamily: "var(--font-poppins), sans-serif",
            boxShadow: "0 4px 16px rgba(43,179,154,0.3)"
          }}>
            Get Started {"\u2014"} It's Free
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
