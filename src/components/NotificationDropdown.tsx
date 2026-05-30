'use client'
import { useRouter } from "next/navigation";

type Notification = {
  id: string; message: string; is_read: boolean; created_at: string; post_id: string | null; type: string;
};

function getNotifIcon(type: string) {
  if (type === "reaction") return "👍";
  if (type === "comment") return "💬";
  if (type === "reply") return "↩️";
  return "🔔";
}

function formatTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

type Props = {
  notifications: Notification[];
  onClose: () => void;
  navigateTo: string;
};

export default function NotificationDropdown({ notifications, onClose, navigateTo }: Props) {
  const router = useRouter();
  return (
    <>
      <div style={{position: "fixed", top: "56px", left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", maxHeight: "70vh", overflowY: "auto", borderRadius: "0 0 16px 16px"}}>
        <div style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A"}}>Notifications</span>
          <button onClick={onClose} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem"}}>✕</button>
        </div>
        {notifications.length === 0 ? (
          <div style={{textAlign: "center", padding: "32px 16px", color: "#888"}}>
            <div style={{fontSize: "2rem", marginBottom: "8px"}}>🔔</div>
            <div style={{fontSize: "0.85rem"}}>Walay notifications pa.</div>
          </div>
        ) : notifications.map(notif => (
          <div key={notif.id}
            onClick={() => { onClose(); if (notif.post_id) router.push(navigateTo + "/" + notif.post_id); }}
            style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", backgroundColor: notif.is_read ? "#fff" : "#E1F5EE"}}>
            <div style={{fontSize: "1.4rem", flexShrink: 0}}>{getNotifIcon(notif.type)}</div>
            <div style={{flex: 1}}>
              <div style={{fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.4}}>{notif.message}</div>
              <div style={{fontSize: "0.72rem", color: "#888", marginTop: "3px"}}>{formatTime(notif.created_at)}</div>
            </div>
            {!notif.is_read && <div style={{width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#1D9E75", flexShrink: 0, marginTop: "4px"}}></div>}
          </div>
        ))}
      </div>
      <div onClick={onClose} style={{position: "fixed", inset: 0, zIndex: 150}} />
    </>
  );
}