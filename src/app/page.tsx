'use client'
import Link from "next/link";
import Image from "next/image";

const features = [
  { icon: "/icon/news_green.png", title: "Campus Feeds", desc: "Stay updated on campus." },
  { icon: "/icon/feeds_green.png", title: "Shout Out", desc: "Voice your opinions." },
  { icon: "/icon/cart_green.png", title: "Bazaar", desc: "Buy and sell items." },
  { icon: "/icon/living_green.png", title: "Living", desc: "Find boarding houses." },
  { icon: "/icon/chat_green.png", title: "Messages", desc: "Chat with schoolmates." },
  { icon: "/icon/confession_green.png", title: "Confession", desc: "Confess anonymously." },
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
      <div style={{padding: "24px 28px 10px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center"}}>
        <Image src="/whitebg.svg" alt="Klasmeyt" width={150} height={42} priority style={{filter: "brightness(0) invert(1)"}} />
      </div>

      {/* Content Card */}
      <div style={{
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "24px 24px 0 0",
        padding: "16px 16px 0",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column",
        overflow: "hidden"
      }}>

        {/* Heading */}
        <div style={{marginBottom: "10px", textAlign: "center"}}>
          <h1 style={{
            fontWeight: 700, fontSize: "1.1rem", color: "#0F2E27",
            margin: "0 0 4px", fontFamily: "var(--font-poppins), sans-serif",
            lineHeight: 1.3
          }}>
            Your Campus, Your Community.
          </h1>
          <p style={{fontSize: "0.75rem", color: "#666", margin: 0, lineHeight: 1.4}}>
            Join and become a klasmeyt to everyone.
          </p>
        </div>

        {/* Feature Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          marginBottom: "10px"
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #CBF7E5",
              padding: "8px 6px", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "3px",
              boxShadow: "0 2px 8px rgba(43,179,154,0.06)"
            }}>
              <Image src={f.icon} alt={f.title} width={26} height={26} />
              <span style={{fontSize: "0.7rem", fontWeight: 700, color: "#0F2E27", textAlign: "center", fontFamily: "var(--font-poppins), sans-serif"}}>{f.title}</span>
              <span style={{fontSize: "0.58rem", color: "#888", textAlign: "center", lineHeight: 1.2}}>{f.desc}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div style={{display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "calc(16px + env(safe-area-inset-bottom))"}}>
          <Link href="/signup" style={{
            display: "block", width: "100%", backgroundColor: "#2BB39A",
            color: "#fff", textAlign: "center", padding: "13px",
            borderRadius: "14px", fontWeight: 700, fontSize: "0.9rem",
            textDecoration: "none", boxSizing: "border-box",
            fontFamily: "var(--font-poppins), sans-serif",
            boxShadow: "0 4px 16px rgba(43,179,154,0.3)"
          }}>
            Get Started — It's Free
          </Link>
          <Link href="/login" style={{
            display: "block", width: "100%",
            backgroundColor: "rgba(255,255,255,0.9)",
            color: "#2BB39A", textAlign: "center", padding: "13px",
            borderRadius: "14px", fontWeight: 700, fontSize: "0.9rem",
            textDecoration: "none", boxSizing: "border-box",
            fontFamily: "var(--font-poppins), sans-serif",
            border: "1.5px solid #2BB39A"
          }}>
            Log In
          </Link>
          <p style={{textAlign: "center", fontSize: "0.62rem", color: "#999", margin: "2px 0 0", lineHeight: 1.4}}>
            By continuing, you agree to Klasmeyt's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
