'use client'
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/feeds",    icon: "/feed.png",    label: "Feeds"    },
  { href: "/soapbox",  icon: "/soapbox.png", label: "Shout Out"},
  { href: "/messages", icon: "/chat.png",    label: "Messages" },
  { href: "/bazaar",   icon: "/bazaar.png",  label: "Bazaar"   },
  { href: "/living",   icon: "/living.png",  label: "Living"   },
];

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Hide sidebars on auth pages, admin, profile, messages detail
  const noLayout = ["/login", "/signup", "/"].includes(pathname) ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/messages/");

  if (!isDesktop || noLayout) return <>{children}</>;

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "#F7F7F7",
      justifyContent: "center",
    }}>

      {/* LEFT SIDEBAR */}
      <div style={{
        width: "260px",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        backgroundColor: "#fff",
        borderRight: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        gap: "8px",
      }}>
        {/* Logo */}
        <div style={{
          backgroundColor: "#1D9E75",
          borderRadius: "16px",
          padding: "14px 20px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
        }}>
          <Image src="/konek.svg" alt="Konek" width={90} height={32} priority />
        </div>

        {/* Nav Links */}
        {NAV_ITEMS.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} prefetch={true} style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "12px 16px",
              borderRadius: "12px",
              textDecoration: "none",
              backgroundColor: isActive ? "#E1F5EE" : "transparent",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "#F7F7F7"; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <Image src={item.icon} alt={item.label} width={24} height={24} />
              <span style={{
                fontSize: "0.9rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#1D9E75" : "#1A1A1A",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Bottom tagline */}
        <div style={{marginTop: "auto", padding: "16px", borderTop: "1px solid #F0F0F0"}}>
          <div style={{fontSize: "0.72rem", color: "#aaa", lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
            <span style={{fontWeight: 700, color: "#1D9E75"}}>Konek</span> — Your Campus. Your Community.
            <br />Made with ❤️ for Tangub City students.
          </div>
        </div>
      </div>

      {/* CENTER — existing mobile content untouched */}
      <div style={{
        width: "480px",
        flexShrink: 0,
        minHeight: "100vh",
        backgroundColor: "#fff",
        borderRight: "1px solid #F0F0F0",
        borderLeft: "1px solid #F0F0F0",
      }}>
        {children}
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{
        width: "300px",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        gap: "16px",
      }}>

        {/* About card */}
        <div style={{
          backgroundColor: "#F7F7F7",
          borderRadius: "16px",
          padding: "20px",
          border: "1px solid #F0F0F0",
        }}>
          <div style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#1D9E75",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "10px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>About Konek</div>
          <div style={{fontSize: "0.82rem", color: "#1A1A1A", lineHeight: 1.7, fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
            A safe, campus-only space for Tangub City students. Buy, sell, hang out, and connect with your community.
          </div>
        </div>

        {/* Phase card */}
        <div style={{
          backgroundColor: "#E1F5EE",
          borderRadius: "16px",
          padding: "20px",
          border: "1px solid #9FE1CB",
        }}>
          <div style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#0F6E56",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "10px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>Phase 1 — Live 🚀</div>
          <div style={{fontSize: "0.82rem", color: "#0F6E56", lineHeight: 1.7, fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
            Currently serving <strong>Tangub City</strong> schools. More cities coming soon.
          </div>
        </div>

        {/* Footer */}
        <div style={{marginTop: "auto", padding: "8px 0", borderTop: "1px solid #F0F0F0"}}>
          <div style={{fontSize: "0.68rem", color: "#aaa", lineHeight: 1.8, fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
            © 2026 Konek · Tangub City, Philippines<br />
            Built for students, by a student 🇵🇭
          </div>
        </div>
      </div>

    </div>
  );
}
