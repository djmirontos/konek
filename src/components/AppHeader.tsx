'use client'
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

type School = { id: string; name: string; abbreviation: string; };
type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; course?: string | null; year_level?: string | null; };

type Props = {
  currentUser: User | null;
  schools: School[];
  pageName?: string;
  selectedSchool: string;
  unreadCount: number;
  onSchoolPickerToggle: () => void;
  onNotificationsToggle?: () => void;
  onAvatarClick?: () => void;
  show?: boolean;
  showSearch?: boolean;
};

export default function AppHeader({
  currentUser, schools, pageName, selectedSchool, unreadCount,
  onSchoolPickerToggle, onNotificationsToggle, onAvatarClick, show = true, showSearch = true
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  function getSchoolLabel() {
    if (selectedSchool === "own") {
      const s = schools.find(s => s.id === currentUser?.school_id);
      return s ? s.abbreviation : "My School";
    }
    if (selectedSchool === "all") return "All Schools";
    const s = schools.find(s => s.id === selectedSchool);
    return s ? s.abbreviation : "School";
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      {/* Main Header */}
      <div style={{backgroundColor: "#2BB39A", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, transform: show ? "translateY(0)" : "translateY(-100%)", transition: "transform 0.25s ease"}}>

        {/* Left: Hamburger + Logo + School */}
        <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
          <button onClick={() => setMenuOpen(true)} style={{background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "5px"}}>
            <div style={{width: "22px", height: "2px", backgroundColor: "#fff", borderRadius: "2px"}} />
            <div style={{width: "22px", height: "2px", backgroundColor: "#fff", borderRadius: "2px"}} />
            <div style={{width: "22px", height: "2px", backgroundColor: "#fff", borderRadius: "2px"}} />
          </button>
          <div style={{display: "flex", alignItems: "center", gap: "6px"}}>
            <Image src="/whitebg.svg" alt="Klasmeyt" width={110} height={30} priority />
            <span style={{color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontWeight: 300}}>·</span>
            <button onClick={onSchoolPickerToggle} style={{background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "2px", fontFamily: "inherit"}}>
              <span style={{color: "rgba(255,255,255,0.85)", fontSize: "0.72rem", fontWeight: 500}}>{getSchoolLabel()}</span>
              <span style={{color: "rgba(255,255,255,0.6)", fontSize: "0.55rem"}}>▾</span>
            </button>
          </div>
        </div>

        {/* Right: Search + Notifications */}
        <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
          {showSearch && (
            <button onClick={() => router.push("/search")} style={{background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center"}}>
              <Image src="/icon/search_black.png" alt="search" width={22} height={22} style={{filter: "brightness(0) invert(1)"}} />
            </button>
          )}
          <button onClick={() => { if (onNotificationsToggle) onNotificationsToggle(); router.push("/notifications"); }} style={{background: "none", border: "none", cursor: "pointer", position: "relative", padding: "4px"}}>
            <Image src="/notification.png" alt="notifications" width={25} height={25} />
            {unreadCount > 0 && (
              <div style={{position: "absolute", top: "0px", right: "0px", backgroundColor: "#EF4444", color: "#fff", borderRadius: "50%", width: "16px", height: "16px", fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #2BB39A"}}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Hamburger Menu Overlay */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 200}}
        />
      )}

      {/* Hamburger Drawer */}
      <div style={{position: "fixed", top: 0, left: 0, height: "100%", width: "72vw", maxWidth: "300px", backgroundColor: "#fff", zIndex: 201, transform: menuOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s ease", display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,0.12)"}}>

        {/* Close button */}
        <button onClick={() => setMenuOpen(false)} style={{position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", color: "#fff", lineHeight: 1}}>✕</button>

        {/* Avatar + Name + School + Course */}
        <div style={{backgroundColor: "#2BB39A", padding: "48px 24px 24px", display: "flex", flexDirection: "row", alignItems: "center", gap: "14px"}}>
          {currentUser?.avatar_url
            ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", flexShrink: 0}} />
            : <div style={{width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#0F6E56", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "1.5rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
          }
          <div style={{display: "flex", flexDirection: "column", gap: "3px", minWidth: 0}}>
            <span style={{color: "#fff", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{currentUser?.full_name || "User"}</span>
            {(() => { const s = schools.find(s => s.id === currentUser?.school_id); return s ? <span style={{color: "rgba(255,255,255,0.85)", fontSize: "0.72rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{s.name}</span> : null; })()}
            {(currentUser?.year_level || currentUser?.course) && (
              <span style={{color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{[currentUser?.year_level, currentUser?.course].filter(Boolean).join(" • ")}</span>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div style={{flex: 1, display: "flex", flexDirection: "column", padding: "8px 0"}}>

          {/* Profile */}
          <button onClick={() => { setMenuOpen(false); router.push(`/profile/${currentUser?.id}`); }} style={{display: "flex", alignItems: "center", gap: "14px", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left"}}>
            <img src="/icon/profile.png" alt="profile" style={{width: "22px", height: "22px", objectFit: "contain", opacity: 0.7}} />
            <span style={{fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a"}}>Profile</span>
          </button>

          {/* Divider */}
          <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 24px"}} />

          {/* Settings */}
          <button onClick={() => { setMenuOpen(false); router.push("/settings"); }} style={{display: "flex", alignItems: "center", gap: "14px", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left"}}>
            <Image src="/icon/settings_black.png" alt="settings" width={22} height={22} style={{opacity: 0.7}} />
            <span style={{fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a"}}>Settings</span>
          </button>

          {/* Divider */}
          <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 24px"}} />

          {/* Logout */}
          <button onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }} style={{display: "flex", alignItems: "center", gap: "14px", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left"}}>
            <Image src="/icon/logout_black.png" alt="logout" width={22} height={22} style={{opacity: 0.7}} />
            <span style={{fontSize: "0.95rem", fontWeight: 600, color: "#EF4444"}}>Logout</span>
          </button>
        </div>

        {/* Footer */}
        <div style={{padding: "16px 24px", borderTop: "1px solid #F0F0F0"}}>
          <span style={{fontSize: "0.7rem", color: "#bbb"}}>Klasmeyt v1.0.0</span>
        </div>
      </div>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"}}>
          <div style={{backgroundColor: "#fff", borderRadius: "16px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.15)"}}>
            <div style={{fontSize: "2rem", marginBottom: "12px"}}>👋</div>
            <h3 style={{margin: "0 0 8px", fontSize: "1.05rem", fontWeight: 700, color: "#1a1a1a"}}>Log out?</h3>
            <p style={{margin: "0 0 24px", fontSize: "0.85rem", color: "#888"}}>Are you sure you want to log out of Klasmeyt?</p>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #E0E0E0", background: "#F7F7F7", fontSize: "0.9rem", fontWeight: 600, color: "#555", cursor: "pointer"}}>Cancel</button>
              <button onClick={handleLogout} style={{flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "#EF4444", fontSize: "0.9rem", fontWeight: 700, color: "#fff", cursor: "pointer"}}>Log Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
