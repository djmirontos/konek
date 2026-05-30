'use client'
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/feeds", icon: "/feed.png", label: "Feeds" },
  { href: "/soapbox", icon: "/soapbox.png", label: "Soapbox" },
  { href: "/quad", icon: "/help.png", label: "Quad" },
  { href: "/bazaar", icon: "/bazaar.png", label: "Bazaar" },
  { href: "/living", icon: "/living.png", label: "Living" },
];

export default function BottomNav({ active }: { active: string }) {
  return (
    <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderTop: "1px solid #F0F0F0", display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)"}}>
      {NAV_ITEMS.map(item => {
        const isActive = item.href === active;
        return (
          <a key={item.href} href={item.href} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 4px 8px", textDecoration: "none", borderTop: isActive ? "2px solid #1D9E75" : "2px solid transparent"}}>
            <Image src={item.icon} alt={item.label} width={24} height={24} style={{opacity: isActive ? 1 : 0.4, marginBottom: "3px"}} />
            <span style={{fontSize: "0.62rem", color: isActive ? "#1D9E75" : "#888", fontWeight: isActive ? 700 : 400}}>{item.label}</span>
          </a>
        );
      })}
    </div>
  );
}