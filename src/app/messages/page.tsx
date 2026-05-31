'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";

type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string | null;
  last_message_at: string;
  status: string;
  initiated_by: string;
  otherUser?: User;
  unreadCount?: number;
};

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "requests">("chats");
  const [chats, setChats] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => { initPage(); }, []);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) {
      setCurrentUser(userData);
      await fetchConversations(userData);
    }
    setLoading(false);
  }

  async function fetchConversations(user: User) {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or("participant_1.eq." + user.id + ",participant_2.eq." + user.id)
      .order("last_message_at", { ascending: false });

    if (!data) return;

    const enriched = await Promise.all(data.map(async (conv) => {
      const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
      const { data: otherUser } = await supabase.from("users").select("id, full_name, avatar_url, school_id, role").eq("id", otherId).single();
      const { count } = await supabase.from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("is_seen", false)
        .neq("sender_id", user.id);
      return { ...conv, otherUser: otherUser || undefined, unreadCount: count || 0 };
    }));

    const accepted = enriched.filter(c => c.status === "accepted");
    const pending = enriched.filter(c => c.status === "pending" && c.initiated_by !== user.id);
    setChats(accepted);
    setRequests(pending);
  }

  async function handleAcceptRequest(convId: string) {
    await supabase.from("conversations").update({ status: "accepted" }).eq("id", convId);
    if (currentUser) await fetchConversations(currentUser);
  }

  async function handleDeclineRequest(convId: string) {
    await supabase.from("conversations").delete().eq("id", convId);
    if (currentUser) await fetchConversations(currentUser);
  }

  function formatTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return m + "m";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h";
    return Math.floor(h / 24) + "d";
  }


  async function fetchUnreadMessages(userId: string) {
    const supabase = createClient();
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or("participant_1.eq." + userId + ",participant_2.eq." + userId)
      .eq("status", "accepted");
    if (!convs || convs.length === 0) { setUnreadMessages(0); return; }
    const convIds = convs.map((c: {id: string}) => c.id);
    let total = 0;
    for (const cid of convIds) {
      const { count } = await supabase.from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", cid)
        .eq("is_seen", false)
        .neq("sender_id", userId);
      total += count || 0;
    }
    setUnreadMessages(total);
  }

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {/* HEADER */}
      <div style={{backgroundColor: "#1D9E75", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <div style={{fontWeight: 800, fontSize: "1.1rem", color: "#fff", letterSpacing: "0.05em"}}>MESSAGES</div>
        <div style={{width: "36px"}}></div>
      </div>

      {/* TABS */}
      <div style={{backgroundColor: "#fff", display: "flex", borderBottom: "1px solid #F0F0F0"}}>
        <button onClick={() => setActiveTab("chats")}
          style={{flex: 1, padding: "12px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", color: activeTab === "chats" ? "#1D9E75" : "#888", borderBottom: activeTab === "chats" ? "2px solid #1D9E75" : "2px solid transparent"}}>
          Chats {chats.length > 0 && <span style={{backgroundColor: "#1D9E75", color: "#fff", borderRadius: "10px", padding: "1px 7px", fontSize: "0.65rem", marginLeft: "4px"}}>{chats.length}</span>}
        </button>
        <button onClick={() => setActiveTab("requests")}
          style={{flex: 1, padding: "12px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", color: activeTab === "requests" ? "#1D9E75" : "#888", borderBottom: activeTab === "requests" ? "2px solid #1D9E75" : "2px solid transparent"}}>
          Requests {requests.length > 0 && <span style={{backgroundColor: "#EF4444", color: "#fff", borderRadius: "10px", padding: "1px 7px", fontSize: "0.65rem", marginLeft: "4px"}}>{requests.length}</span>}
        </button>
      </div>

      <div style={{flex: 1, paddingBottom: "80px"}}>
        {loading ? (
          <div style={{textAlign: "center", padding: "48px 16px", color: "#888"}}>
            <div style={{fontSize: "2rem", marginBottom: "8px"}}>⏳</div>
            <div style={{fontSize: "0.85rem"}}>Loading messages...</div>
          </div>
        ) : activeTab === "chats" ? (
          chats.length === 0 ? (
            <div style={{textAlign: "center", padding: "64px 24px"}}>
              <div style={{fontSize: "3rem", marginBottom: "12px"}}>💬</div>
              <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "6px"}}>No messages yet</div>
              <div style={{fontSize: "0.82rem", color: "#888"}}>Start a conversation from a seller or poster profile.</div>
            </div>
          ) : (
            chats.map(conv => (
              <div key={conv.id} onClick={() => router.push("/messages/" + conv.id)}
                style={{backgroundColor: "#fff", padding: "14px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer"}}>
                <div style={{position: "relative", flexShrink: 0}}>
                  <div style={{width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#E1F5EE", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem"}}>
                    {conv.otherUser?.avatar_url
                      ? <img src={conv.otherUser.avatar_url} alt="" style={{width: "100%", height: "100%", objectFit: "cover"}} />
                      : "👤"}
                  </div>
                  {(conv.unreadCount || 0) > 0 && (
                    <div style={{position: "absolute", top: "-2px", right: "-2px", width: "16px", height: "16px", backgroundColor: "#EF4444", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center"}}>
                      <span style={{fontSize: "0.55rem", color: "#fff", fontWeight: 700}}>{conv.unreadCount}</span>
                    </div>
                  )}
                </div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px"}}>
                    <div style={{fontWeight: (conv.unreadCount || 0) > 0 ? 800 : 600, fontSize: "0.9rem", color: "#1A1A1A"}}>{conv.otherUser?.full_name || "Unknown"}</div>
                    <div style={{fontSize: "0.68rem", color: "#888", flexShrink: 0}}>{formatTime(conv.last_message_at)}</div>
                  </div>
                  <div style={{fontSize: "0.78rem", color: (conv.unreadCount || 0) > 0 ? "#1A1A1A" : "#888", fontWeight: (conv.unreadCount || 0) > 0 ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                    {conv.last_message || "Start the conversation"}
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          requests.length === 0 ? (
            <div style={{textAlign: "center", padding: "64px 24px"}}>
              <div style={{fontSize: "3rem", marginBottom: "12px"}}>📭</div>
              <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "6px"}}>No message requests</div>
              <div style={{fontSize: "0.82rem", color: "#888"}}>Message requests from other students will appear here.</div>
            </div>
          ) : (
            requests.map(conv => (
              <div key={conv.id} style={{backgroundColor: "#fff", padding: "14px 16px", borderBottom: "1px solid #F0F0F0"}}>
                <div style={{display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px"}}>
                  <div style={{width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#E1F5EE", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0}}>
                    {conv.otherUser?.avatar_url
                      ? <img src={conv.otherUser.avatar_url} alt="" style={{width: "100%", height: "100%", objectFit: "cover"}} />
                      : "👤"}
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>{conv.otherUser?.full_name || "Unknown"}</div>
                    <div style={{fontSize: "0.75rem", color: "#888"}}>Wants to message you</div>
                  </div>
                  <div style={{fontSize: "0.68rem", color: "#888"}}>{formatTime(conv.last_message_at)}</div>
                </div>
                {conv.last_message && (
                  <div style={{backgroundColor: "#F7F7F7", borderRadius: "10px", padding: "10px 12px", fontSize: "0.82rem", color: "#555", marginBottom: "10px", lineHeight: 1.4}}>
                    "{conv.last_message}"
                  </div>
                )}
                <div style={{display: "flex", gap: "8px"}}>
                  <button onClick={() => handleDeclineRequest(conv.id)}
                    style={{flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit"}}>
                    Decline
                  </button>
                  <button onClick={() => handleAcceptRequest(conv.id)}
                    style={{flex: 2, padding: "10px", borderRadius: "10px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit"}}>
                    Accept
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>

      <BottomNav active="/messages" unreadMessages={unreadMessages} />
    </div>
  );
}
