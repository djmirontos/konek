"use client"
import Link from "next/link";
import Image from "next/image";

const features = [
  { icon: "/icon/news_green.png", title: "Campus Feeds", desc: "Stay updated with what\u2019s happening on campus." },
  { icon: "/icon/feeds_green.png", title: "Shout Out", desc: "Voice your opinions, frustration and be heard by schoolmates." },
  { icon: "/icon/cart_green.png", title: "Bazaar", desc: "Buy and sell textbooks, gadgets, and more." },
  { icon: "/icon/living_green.png", title: "Living", desc: "Find affordable boarding houses near campus." },
  { icon: "/icon/chat_green.png", title: "Messages", desc: "Chat privately with your schoolmates." },
  { icon: "/icon/confession_green.png", title: "Confession", desc: "Confess your feelings to your crush or person you like." },
];

export default function Home() {
  return (
    <div style={{
      height: "100vh",
      backgroundImage: "url('/bg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      display: "flex", flexDirection: "column",
      maxWidth: "480px", margin: "0 auto",
      fontFamily: "var(--font-inter), sans-serif",
      position: "relative", overflow: "hidden", boxSizing: "border-box"
    }}>

      {/* Logo */}
      <div style={{padding: "32px 28px 12px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
        <Image src="/whitebg.svg" alt="Klasmeyt" width={180} height={50} priority style={{filter: "brightness(0) invert(1)"}} />
      </div>

      {/* Content Card */}
      <div style={{
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "24px 24px 0 0",
        padding: "20px 20px 0",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column"
      }}>
        {/* Heading */}
        <div style={{marginBottom: "12px", textAlign: "center"}}>
          <h1 style={{
            fontWeight: 700, fontSize: "1.35rem", color: "#0F2E27",
            margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif",
            lineHeight: 1.3
          }}>
            Your Campus, your community.
          </h1>
          <p style={{fontSize: "0.82rem", color: "#666", margin: 0, lineHeight: 1.5}}>
            Join and become a klasmeyt to everyone.
          </p>
        </div>

        {/* Feature Grid - 2x3 uniform */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "12px"
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #CBF7E5",
              padding: "12px 10px 10px", display: "flex", flexDirection: "column",
              alignItems: "center", gap: "6px",
              boxShadow: "0 2px 8px rgba(43,179,154,0.06)"
            }}>
              <Image src={f.icon} alt={f.title} width={36} height={36} />
              <span style={{fontSize: "0.78rem", fontWeight: 700, color: "#0F2E27", textAlign: "center", fontFamily: "var(--font-poppins), sans-serif"}}>{f.title}</span>
              <span style={{fontSize: "0.65rem", color: "#888", textAlign: "center", lineHeight: 1.4}}>{f.desc}</span>
            </div>
          ))}
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
            Get Started Its Free
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
            By continuing, you agree to Klasmeyt\u2019s Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
