"use client"
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const features = [
    { emoji: "📰", title: "Campus Feeds", desc: "Stay updated with what's happening on campus" },
    { emoji: "📢", title: "Shout Out", desc: "Voice your opinions and be heard by schoolmates" },
    { emoji: "🛒", title: "Bazaar", desc: "Buy and sell textbooks, gadgets, and more" },
    { emoji: "🏠", title: "Living", desc: "Find affordable boarding houses near campus" },
    { emoji: "💬", title: "Messages", desc: "Chat privately with your schoolmates" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f7a58 0%, #1D9E75 40%, #25b585 100%)",
      display: "flex", flexDirection: "column",
      maxWidth: "480px", margin: "0 auto",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: "relative", overflow: "hidden"
    }}>
      {/* Background decoration */}
      <div style={{position: "absolute", top: "-80px", right: "-80px", width: "260px", height: "260px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)", pointerEvents: "none"}} />
      <div style={{position: "absolute", top: "120px", left: "-60px", width: "180px", height: "180px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.04)", pointerEvents: "none"}} />

      {/* Top Section */}
      <div style={{padding: "56px 28px 28px", textAlign: "center", position: "relative", zIndex: 1}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px"}}>
          <Image src="/klasmeyt.png" alt="Klasmeyt" width={160} height={89} priority style={{filter: "brightness(0) invert(1)"}} />
        </div>
        <p style={{fontSize: "1rem", color: "rgba(255,255,255,0.9)", fontWeight: 500, margin: 0, letterSpacing: "0.01em"}}>
          Your Campus. Your Community.
        </p>
        <div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "12px"}}>
          {["Free", "No Ads", "Campus Only"].map(tag => (
            <span key={tag} style={{fontSize: "0.68rem", color: "rgba(255,255,255,0.75)", fontWeight: 600, letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "4px"}}>
              <span style={{fontSize: "0.6rem"}}>✓</span> {tag}
            </span>
          ))}
        </div>
      </div>

      {/* White Card */}
      <div style={{
        flex: 1, backgroundColor: "#fff",
        borderRadius: "28px 28px 0 0",
        padding: "28px 24px 0",
        position: "relative", zIndex: 1,
        boxShadow: "0 -4px 32px rgba(0,0,0,0.12)"
      }}>
        {/* Section Title */}
        <div style={{marginBottom: "20px"}}>
          <div style={{fontWeight: 800, fontSize: "1.15rem", color: "#1A1A1A", marginBottom: "4px"}}>
            Everything your campus needs
          </div>
          <div style={{fontSize: "0.8rem", color: "#888"}}>
            Join thousands of students already on Klasmeyt
          </div>
        </div>

        {/* Features */}
        <div style={{display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px"}}>
          {features.map((f, i) => (
            <div key={i} style={{display: "flex", alignItems: "center", gap: "14px", padding: "12px 14px", backgroundColor: "#F7F9F8", borderRadius: "14px", border: "1px solid #F0F0F0"}}>
              <div style={{width: "40px", height: "40px", borderRadius: "12px", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0}}>
                {f.emoji}
              </div>
              <div>
                <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A"}}>{f.title}</div>
                <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px", lineHeight: 1.4}}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div style={{display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "calc(32px + env(safe-area-inset-bottom))"}}>
          <Link href="/signup" style={{
            display: "block", width: "100%", backgroundColor: "#1D9E75",
            color: "#fff", textAlign: "center", padding: "15px",
            borderRadius: "14px", fontWeight: 700, fontSize: "0.95rem",
            textDecoration: "none", boxSizing: "border-box",
            boxShadow: "0 4px 14px rgba(29,158,117,0.35)"
          }}>
            Get Started — It's Free
          </Link>
          <Link href="/login" style={{
            display: "block", width: "100%", backgroundColor: "#fff",
            color: "#1D9E75", textAlign: "center", padding: "15px",
            borderRadius: "14px", fontWeight: 700, fontSize: "0.95rem",
            textDecoration: "none", boxSizing: "border-box",
            border: "2px solid #1D9E75"
          }}>
            Log In
          </Link>
          <p style={{textAlign: "center", fontSize: "0.68rem", color: "#BBB", margin: "4px 0 0", lineHeight: 1.5}}>
            By continuing, you agree to Klasmeyt's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
