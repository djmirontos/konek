"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/lib/startConversation";

type AvatarMenuUser = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  school?: string | null;
};

type Props = {
  user: AvatarMenuUser;
  currentUserId: string;
  onClose: () => void;
  onEditProfile?: () => void;
};

export default function AvatarMenu({ user, currentUserId, onClose, onEditProfile }: Props) {
  const router = useRouter();
  const [messaging, setMessaging] = useState(false);
  const isOwnProfile = user.id === currentUserId;

  async function handleMessage() {
    if (messaging) return;
    setMessaging(true);
    try {
      const convId = await startConversation(currentUserId, user.id);
      if (convId) {
        onClose();
        router.push("/messages/" + convId);
      }
    } finally {
      setMessaging(false);
    }
  }

  function handleViewProfile() {
    onClose();
    router.push("/profile/" + user.id);
  }

  function handleEditProfile() {
    onClose();
    if (onEditProfile) onEditProfile();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 800}}
      />
      {/* Bottom Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "min(480px, 100vw)", backgroundColor: "#fff",
        borderRadius: "20px 20px 0 0", zIndex: 900,
        paddingBottom: "32px", fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        {/* Handle */}
        <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "12px auto 0"}} />

        {/* User Info */}
        <div style={{display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", borderBottom: "1px solid #F0F0F0"}}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" style={{width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
            : <div style={{width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#2BB39A", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0}}>{user.full_name?.charAt(0).toUpperCase()}</div>
          }
          <div>
            <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A"}}>{user.full_name}</div>
            <div style={{fontSize: "0.75rem", color: "#888", marginTop: "2px"}}>{isOwnProfile ? "Your Profile" : user.school || ""}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{padding: "8px 0"}}>
          <button onClick={handleViewProfile}
            style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, color: "#1A1A1A", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "14px"}}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F7F7F7")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
            <span style={{fontSize: "1.2rem"}}>👤</span>
            View Profile
          </button>

          {isOwnProfile ? (
            <button onClick={handleEditProfile}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, color: "#2BB39A", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "14px"}}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F7F7F7")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
              <span style={{fontSize: "1.2rem"}}>✏️</span>
              Edit Profile
            </button>
          ) : (
            <button onClick={handleMessage} disabled={messaging}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, color: messaging ? "#aaa" : "#2BB39A", cursor: messaging ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "14px"}}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F7F7F7")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
              <span style={{fontSize: "1.2rem"}}>💬</span>
              {messaging ? "Opening chat..." : "Send Message"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
