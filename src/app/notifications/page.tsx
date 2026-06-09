'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import SchoolPicker from "@/components/SchoolPicker";

type School = { id: string; name: string; abbreviation: string; };
type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type Notification = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  post_id: string | null;
  type: string;
  sender_id: string | null;
  sender?: { full_name: string; avatar_url: string | null; } | null;
};

function getNotifIcon(type: string) {
  if (type === "reaction") return "👍";
  if (type === "comment") return "💬";
  if (type === "reply") return "↩️";
  if (type === "message_request") return "💬";
  if (type === "message") return "💬";
  if (type === "system") return "🔔";
  return "🔔";
}

function getPostRoute(type: string, postId: string | null): string | null {
  if (!postId) return null;
  if (type === "reaction" || type === "comment" || type === "reply") return "/feeds/" + postId;
  if (type === "soapbox_comment" || type === "soapbox_reply") return "/soapbox/" + postId;
  if (type === "quad_comment") return "/quad/" + postId;
  if (type === "bazaar_comment") return "/bazaar/" + postId;
  if (type === "living_comment") return "/living/" + postId;
  if (type === "message" || type === "message_request") return "/messages/" + postId;
  return "/feeds/" + postId;
}

function formatTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d ago";
  return new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function getGroupLabel(ts: string): string {
  const now = new Date();
  const date = new Date(ts);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  return "Older";
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Older"];

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [selectedSchool, setSelectedSchool] = useState("own");
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 30;

  useEffect(() => { initPage(); }, []);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    const { data: schoolData } = await supabase.from("schools").select("id, name, abbreviation").order("name");
    if (schoolData) setSchools(schoolData);
    if (userData) {
      await fetchNotifications(userData.id, 0);
      fetchUnreadMessages(userData.id);
    }
  }

  async function fetchNotifications(userId: string, offset: number, append = false) {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, message, is_read, created_at, post_id, type, sender_id")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (data && data.length > 0) {
      // Fetch sender avatars in one query
      const senderIds = [...new Set(data.filter(n => n.sender_id).map(n => n.sender_id))];
      let senderMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (senderIds.length > 0) {
        const { data: senders } = await supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .in("id", senderIds);
        if (senders) {
          senders.forEach(s => { senderMap[s.id] = { full_name: s.full_name, avatar_url: s.avatar_url }; });
        }
      }
      const enriched = data.map(n => ({
        ...n,
        sender: n.sender_id ? senderMap[n.sender_id] || null : null,
      }));
      if (append) setNotifications(prev => [...prev, ...enriched]);
      else setNotifications(enriched);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      if (!append) setNotifications([]);
      setHasMore(false);
    }
    // Update unread count
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userId).eq("is_read", false);
    setUnreadCount(count || 0);
    setLoading(false);
    setLoadingMore(false);
  }

  async function markAsRead(notif: Notification) {
    if (!currentUser) return;
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    const route = getPostRoute(notif.type, notif.post_id);
    if (route) router.push(route);
  }

  async function markAllAsRead() {
    if (!currentUser) return;
    setMarkingAll(true);
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", currentUser.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  }

  async function loadMore() {
    if (!currentUser || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchNotifications(currentUser.id, nextPage * PAGE_SIZE, true);
  }

  async function fetchUnreadMessages(userId: string) {
    const { data: convs } = await supabase.from("conversations").select("id").or("participant_1.eq." + userId + ",participant_2.eq." + userId).eq("status", "accepted");
    if (!convs || convs.length === 0) { setUnreadMessages(0); return; }
    const convIds = convs.map((c: {id: string}) => c.id);
    let total = 0;
    for (const cid of convIds) {
      const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", cid).eq("is_seen", false).neq("sender_id", userId);
      total += count || 0;
    }
    setUnreadMessages(total);
  }

  // Group notifications by date
  function groupNotifications() {
    const groups: Record<string, Notification[]> = {};
    notifications.forEach(n => {
      const label = getGroupLabel(n.created_at);
      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    });
    return groups;
  }

  const isSystemNotif = (type: string) => ["system", "verification", "school_approved", "badge"].includes(type);

  return (
    <div style={{minHeight: "100vh", background: "#F0F2F5", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      <AppHeader
        currentUser={currentUser}
        schools={schools}
        pageName="NOTIFICATIONS"
        selectedSchool={selectedSchool}
        unreadCount={unreadCount}
        onSchoolPickerToggle={() => setShowSchoolPicker(!showSchoolPicker)}
      />

      {showSchoolPicker && <SchoolPicker schools={schools} currentUser={currentUser} selectedSchool={selectedSchool} onSelect={setSelectedSchool} onClose={() => setShowSchoolPicker(false)} />}

      {/* Page Header */}
      <div style={{backgroundColor: "#fff", padding: "14px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: "56px", zIndex: 90}}>
        <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
          <button onClick={() => router.push("/feeds")} style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#555", lineHeight: 1, padding: "2px 4px"}}>✕</button>
          <span style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A"}}>Notifications</span>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} disabled={markingAll}
            style={{background: "none", border: "none", cursor: "pointer", color: "#2BB39A", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit", opacity: markingAll ? 0.5 : 1}}>
            {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{flex: 1, paddingBottom: "80px"}}>
        {loading ? (
          <div>
            <style>{`@keyframes shimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } }`}</style>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{backgroundColor: "#fff", marginBottom: "2px", padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center", borderBottom: "1px solid #F5F5F5"}}>
                <div style={{width: "46px", height: "46px", borderRadius: "50%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", flexShrink: 0}} />
                <div style={{flex: 1}}>
                  <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "8px", width: "80%"}} />
                  <div style={{height: "10px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", width: "35%"}} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{textAlign: "center", padding: "64px 16px"}}>
            <div style={{fontSize: "4rem", marginBottom: "16px", lineHeight: 1}}>🔔</div>
            <div style={{fontWeight: 800, color: "#1A1A1A", fontSize: "1.1rem", marginBottom: "8px"}}>No notifications yet.</div>
            <div style={{color: "#888", fontSize: "0.82rem"}}>When someone reacts or comments, it shows up here.</div>
          </div>
        ) : (
          <>
            {GROUP_ORDER.filter(g => groupNotifications()[g]).map(group => (
              <div key={group}>
                {/* Group Label */}
                <div style={{padding: "10px 16px 6px", backgroundColor: "#F0F2F5"}}>
                  <span style={{fontSize: "0.72rem", fontWeight: 700, color: "#888", letterSpacing: "0.05em", textTransform: "uppercase"}}>{group}</span>
                </div>
                {groupNotifications()[group].map(notif => (
                  <div key={notif.id} onClick={() => markAsRead(notif)}
                    style={{backgroundColor: notif.is_read ? "#fff" : "#EAF8F3", padding: "13px 16px", borderBottom: "1px solid #F5F5F5", display: "flex", alignItems: "center", gap: "12px", cursor: notif.post_id ? "pointer" : "default", transition: "background 0.15s", borderLeft: notif.is_read ? "none" : "3px solid #2BB39A"}}
                    onMouseEnter={e => { if (notif.post_id) e.currentTarget.style.backgroundColor = notif.is_read ? "#F7F7F7" : "#d4ede3"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = notif.is_read ? "#fff" : "#E1F5EE"; }}>

                    {/* Avatar or Icon */}
                    <div style={{position: "relative", flexShrink: 0}}>
                      {isSystemNotif(notif.type) || !notif.sender ? (
                        <div style={{width: "46px", height: "46px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem"}}>
                          {getNotifIcon(notif.type)}
                        </div>
                      ) : notif.sender.avatar_url ? (
                        <img src={notif.sender.avatar_url} alt="" style={{width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover"}} />
                      ) : (
                        <div style={{width: "46px", height: "46px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#2BB39A", fontWeight: 700, fontSize: "1.1rem"}}>
                          {notif.sender.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Reaction icon badge on avatar */}
                      {!isSystemNotif(notif.type) && notif.sender && (
                        <div style={{position: "absolute", bottom: "-2px", right: "-2px", backgroundColor: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", fontSize: "0.7rem"}}>
                          {getNotifIcon(notif.type)}
                        </div>
                      )}
                    </div>

                    {/* Message + Time */}
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.4, fontWeight: notif.is_read ? 400 : 600}}>{notif.message}</div>
                      <div style={{fontSize: "0.72rem", color: notif.is_read ? "#888" : "#2BB39A", marginTop: "3px", fontWeight: notif.is_read ? 400 : 600}}>{formatTime(notif.created_at)}</div>
                    </div>

                    {/* Unread dot */}
                    {!notif.is_read && (
                      <div style={{width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#2BB39A", flexShrink: 0}} />
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div style={{padding: "16px", textAlign: "center"}}>
                <button onClick={loadMore} disabled={loadingMore}
                  style={{backgroundColor: "#fff", border: "1.5px solid #2BB39A", borderRadius: "20px", padding: "10px 24px", fontSize: "0.82rem", fontWeight: 600, color: "#2BB39A", cursor: loadingMore ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(43,179,154,0.1)"}}>
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="/feeds" unreadMessages={unreadMessages} />
    </div>
  );
}
