'use client'
import Link from "next/link";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/feeds", icon: "/feed.png", label: "Feeds" },
  { href: "/soapbox", icon: "/soapbox.png", label: "Shout Out" },
  { href: "/messages", icon: "/chat.png", label: "Messages" },
  { href: "/bazaar", icon: "/bazaar.png", label: "Bazaar" },
  { href: "/living", icon: "/living.png", label: "Living" },
];

export default function BottomNav({ active, unreadMessages = 0, show = true }: { active: string; unreadMessages?: number; show?: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: show ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(100%)",
      width: "min(480px, 100vw)", backgroundColor: "#fff", borderTop: "1px solid #F0F0F0",
      display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)",
      padding: "6px 4px", transition: "transform 0.25s ease",
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = item.href === active;
        const showBadge = item.href === "/messages" && unreadMessages > 0;
        return (
          <Link key={item.href} href={item.href} prefetch={true} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5px 6px", textDecoration: "none", borderRadius: "10px", backgroundColor: isActive ? "#E1F5EE" : "transparent", position: "relative"}}>
            <div style={{position: "relative", marginBottom: "3px"}}>
              <Image src={item.icon} alt={item.label} width={24} height={24} style={{opacity: 1}} />
              {showBadge && (
                <div style={{position: "absolute", top: "-5px", right: "-7px", backgroundColor: "#EF4444", borderRadius: "10px", minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px"}}>
                  <span style={{fontSize: "0.55rem", color: "#fff", fontWeight: 800, lineHeight: 1}}>{unreadMessages > 99 ? "99+" : unreadMessages}</span>
                </div>
              )}
            </div>
            <span style={{fontSize: "0.62rem", color: isActive ? "#1D9E75" : "#888", fontWeight: isActive ? 700 : 400}}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
