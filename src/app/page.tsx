import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div style={{minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto"}}>
      
      {/* Header */}
      <div style={{backgroundColor: "#1D9E75", padding: "32px 24px 24px", textAlign: "center"}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px"}}>
          <Image src="/konek.svg" alt="Konek Logo" width={220} height={122} priority />
        </div>
        <p style={{fontSize: "0.8rem", color: "rgba(255,255,255,0.85)"}}>Your Campus. Your Community.</p>
      </div>

      {/* Features */}
      <div style={{flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column", gap: "8px"}}>
        {[
          { icon: "/feed.png", name: "Feeds", desc: "Viral campus life & moments" },
          { icon: "/soapbox.png", name: "Soapbox", desc: "Voice out. Be heard." },
          { icon: "/help.png", name: "Quad", desc: "Find your barkada" },
          { icon: "/bazaar.png", name: "Bazaar", desc: "Buy & sell on campus" },
          { icon: "/living.png", name: "Living", desc: "Find your boarding house" },
        ].map((f) => (
          <div key={f.name} style={{display: "flex", alignItems: "center", gap: "14px", padding: "10px 12px", backgroundColor: "#F7F7F7", borderRadius: "12px"}}>
            <Image src={f.icon} alt={f.name} width={32} height={32} />
            <div>
              <div style={{fontSize: "0.875rem", fontWeight: 600, color: "#1A1A1A"}}>{f.name}</div>
              <div style={{fontSize: "0.75rem", color: "#888", marginTop: "1px"}}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{padding: "12px 24px 32px", display: "flex", flexDirection: "column", gap: "10px"}}>
        <Link href="/signup" style={{display: "block", width: "100%", backgroundColor: "#1D9E75", color: "#fff", textAlign: "center", padding: "14px", borderRadius: "12px", fontWeight: 600, fontSize: "0.875rem", textDecoration: "none"}}>
          Get started — it's free
        </Link>
        <p style={{textAlign: "center", fontSize: "0.75rem", color: "#888"}}>
          Already have an account?{" "}
          <Link href="/login" style={{color: "#1D9E75", fontWeight: 600, textDecoration: "none"}}>
            Log in
          </Link>
        </p>
      </div>

    </div>
  );
}
