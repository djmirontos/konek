'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import EmojiPicker from "@/components/EmojiPicker";
import { sendPushToUser } from "@/lib/pushNotifications";

type User = { id: string; full_name: string; avatar_url: string | null; school_id: string | null; };
type School = { id: string; name: string; abbreviation: string; };
type ConvContext = { type: string; title: string; id: string; } | null;
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  is_seen: boolean;
  created_at: string;
};

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const convId = params?.id as string;
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isAccepted, setIsAccepted] = useState<boolean | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [otherUserSchool, setOtherUserSchool] = useState<School | null>(null);
  const [convContext, setConvContext] = useState<ConvContext>(null);

  useEffect(() => { initPage(); }, [convId]);

  useEffect(() => {
    if (!convId) return;
    const channel = supabase
      .channel("messages:" + convId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "conversation_id=eq." + convId,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convId]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const [{ data: userData }, { data: conv }] = await Promise.all([
      supabase.from("users").select("id, full_name, avatar_url, school_id").eq("id", user.id).single(),
      supabase.from("conversations").select("id, participant_1, participant_2, status, initiated_by, context_type, context_title, context_id").eq("id", convId).single(),
    ]);
    if (userData) setCurrentUser(userData);
    if (!conv) { router.push("/messages"); return; }

    setIsAccepted(conv.status === "accepted");
    setIsInitiator(conv.initiated_by === user.id);
    if (conv.context_type && conv.context_title && conv.context_id) {
      setConvContext({ type: conv.context_type, title: conv.context_title, id: conv.context_id });
    }

    const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
    const [{ data: other }, { data: msgs }] = await Promise.all([
      supabase.from("users").select("id, full_name, avatar_url, school_id").eq("id", otherId).single(),
      supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true }).limit(100),
    ]);
    if (other) {
      setOtherUser(other);
      if (other.school_id) {
        const { data: schoolData } = await supabase.from("schools").select("id, name, abbreviation").eq("id", other.school_id).single();
        if (schoolData) setOtherUserSchool(schoolData);
      }
    }
    if (msgs) setMessages(msgs);

    await supabase.from("messages")
      .update({ is_seen: true })
      .eq("conversation_id", convId)
      .eq("is_seen", false)
      .neq("sender_id", user.id);

    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 100);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Image must be under 10MB"); return; }
    setImageFile(file);
    setImagePreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  }

  function insertEmoji(emoji: string) {
    setText(prev => prev + emoji);
    setShowEmoji(false);
  }

  function isEmojiOnly(text: string): boolean {
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\uFE0F|\u20E3|[\u1F3FB-\u1F3FF])?(?:\u200D(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\uFE0F|\u20E3|[\u1F3FB-\u1F3FF])?)*$/u;
    const segments = [...new Intl.Segmenter().segment(text.trim())].map(s => s.segment);
    if (segments.length === 0 || segments.length > 3) return false;
    return segments.every(s => /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(s));
  }

  function getEmojiCount(text: string): number {
    return [...new Intl.Segmenter().segment(text.trim())].length;
  }

  async function handleSend() {
    if ((!text.trim() && !imageFile) || !currentUser || sending) return;
    setSending(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = "messages/" + convId + "/" + Date.now() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, imageFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      // Optimistic update — show message instantly for sender
      const optimisticMsg: Message = {
        id: "temp-" + Date.now(),
        conversation_id: convId,
        sender_id: currentUser.id,
        content: text.trim() || null,
        image_url: imageUrl,
        is_seen: false,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setText("");
      setImageFile(null);
      setImagePreview("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

      const { data: inserted } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: currentUser.id,
        content: optimisticMsg.content,
        image_url: imageUrl,
        is_seen: false,
      }).select().single();

      // Replace optimistic message with real one
      if (inserted) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? inserted : m));
      }

      await supabase.from("conversations").update({
        last_message: optimisticMsg.content || "Photo",
        last_message_at: new Date().toISOString(),
      }).eq("id", convId);

      // Send push notification to recipient
      if (otherUser) {
        await sendPushToUser(
          otherUser.id,
          currentUser.full_name,
          optimisticMsg.content || "Sent you a photo",
          "/messages/" + convId,
          "message-" + convId,
          supabase
        );
      }
    } catch { } finally { setSending(false); }
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  function formatDate(ts: string) {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  }

  // group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.messages.push(msg);
    else grouped.push({ date, messages: [msg] });
  });

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {/* HEADER */}
      <div style={{backgroundColor: "#2BB39A", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/messages")}
          style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "4px", display: "flex", alignItems: "center", lineHeight: 1}}>
          ←
        </button>
        <div onClick={() => otherUser && router.push("/profile/" + otherUser.id)} style={{width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0, border: "2px solid rgba(255,255,255,0.4)", cursor: "pointer"}}>
          {otherUser?.avatar_url
            ? <img src={otherUser.avatar_url} alt="" style={{width: "100%", height: "100%", objectFit: "cover"}} />
            : "👤"}
        </div>
        <div style={{flex: 1, cursor: "pointer"}} onClick={() => otherUser && router.push("/profile/" + otherUser.id)}>
          <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#fff", lineHeight: 1.2}}>{otherUser?.full_name || "..."}</div>
          {otherUserSchool && <div style={{fontSize: "0.68rem", color: "rgba(255,255,255,0.8)", marginTop: "1px"}}>{otherUserSchool.abbreviation}</div>}
        </div>
      </div>

      {/* CONTEXT BANNER */}
      {convContext && (
        <div style={{backgroundColor: "#E1F5EE", padding: "10px 16px", borderBottom: "1px solid #C8EBD9", display: "flex", alignItems: "center", gap: "10px"}}>
          <span style={{fontSize: "1.1rem"}}>{convContext.type === "bazaar" ? "🛍️" : "🏠"}</span>
          <div style={{flex: 1}}>
            <div style={{fontSize: "0.65rem", color: "#0F6E56", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em"}}>Regarding</div>
            <div style={{fontSize: "0.82rem", color: "#0F6E56", fontWeight: 600, lineHeight: 1.3}}>{convContext.title}</div>
          </div>
          <button onClick={() => router.push("/" + convContext.type + "/" + convContext.id)}
            style={{backgroundColor: "#2BB39A", color: "#fff", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0}}>
            View
          </button>
        </div>
      )}

      {/* REQUEST BANNER — shown to receiver of pending request */}
      {isAccepted === false && !isInitiator && (
        <div style={{backgroundColor: "#FFF8E1", padding: "12px 16px", borderBottom: "1px solid #F0F0F0", textAlign: "center"}}>
          <div style={{fontSize: "0.82rem", color: "#92400E", marginBottom: "8px", fontWeight: 600}}>
            {otherUser?.full_name} wants to message you
          </div>
          <div style={{display: "flex", gap: "8px", justifyContent: "center"}}>
            <button onClick={async () => { await supabase.from("conversations").delete().eq("id", convId); router.push("/messages"); }}
              style={{padding: "8px 20px", borderRadius: "8px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit"}}>
              Decline
            </button>
            <button onClick={async () => { await supabase.from("conversations").update({ status: "accepted" }).eq("id", convId); setIsAccepted(true); }}
              style={{padding: "8px 20px", borderRadius: "8px", border: "none", backgroundColor: "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit"}}>
              Accept
            </button>
          </div>
        </div>
      )}

      {/* MESSAGES */}
      <div style={{flex: 1, padding: "12px 16px", paddingBottom: "80px", overflowY: "auto"}}>
        {loading ? (
          <div style={{textAlign: "center", padding: "48px 0", color: "#888", fontSize: "0.85rem"}}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{textAlign: "center", padding: "48px 0"}}>
            <div style={{fontSize: "2.5rem", marginBottom: "8px"}}>👋</div>
            <div style={{fontSize: "0.85rem", color: "#888"}}>Say hello to {otherUser?.full_name}!</div>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <div style={{textAlign: "center", margin: "12px 0"}}>
                <span style={{fontSize: "0.68rem", color: "#888", backgroundColor: "#F0F0F0", borderRadius: "10px", padding: "3px 10px"}}>{group.date}</span>
              </div>
              {group.messages.map((msg, idx) => {
                const isMine = msg.sender_id === currentUser?.id;
                const isLast = idx === group.messages.length - 1;
                return (
                  <div key={msg.id} style={{display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: "4px"}}>
                    {(() => {
                      const emojiOnly = msg.content ? isEmojiOnly(msg.content) : false;
                      const emojiCount = msg.content ? getEmojiCount(msg.content) : 0;
                      const isLargeEmoji = emojiOnly && emojiCount <= 3 && !msg.image_url;
                      if (isLargeEmoji) {
                        return (
                          <div style={{fontSize: emojiCount === 1 ? "3.5rem" : emojiCount === 2 ? "2.8rem" : "2.2rem", lineHeight: 1.2, padding: "4px 2px", textAlign: isMine ? "right" : "left"}}>
                            {msg.content}
                          </div>
                        );
                      }
                      return (
                        <div style={{maxWidth: "75%", backgroundColor: isMine ? "#2BB39A" : "#fff", color: isMine ? "#fff" : "#1A1A1A", borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: msg.image_url && !msg.content ? "4px" : "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)"}}>
                          {msg.image_url && (
                            <img src={msg.image_url} alt="" style={{width: "100%", maxWidth: "220px", borderRadius: "12px", display: "block", marginBottom: msg.content ? "6px" : 0}} />
                          )}
                          {msg.content && <div style={{fontSize: "0.875rem", lineHeight: 1.45}}>{msg.content}</div>}
                        </div>
                      );
                    })()}
                    {isMine && isLast && (
                      <div style={{fontSize: "0.62rem", color: "#888", marginTop: "2px", marginRight: "2px"}}>
                        {msg.is_seen ? "Seen" : "Sent"} · {formatTime(msg.created_at)}
                      </div>
                    )}
                    {!isMine && isLast && (
                      <div style={{fontSize: "0.62rem", color: "#888", marginTop: "2px", marginLeft: "2px"}}>{formatTime(msg.created_at)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* IMAGE PREVIEW */}
      {imagePreview && (
        <div style={{padding: "8px 16px", backgroundColor: "#fff", borderTop: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: "10px"}}>
          <div style={{position: "relative", display: "inline-block"}}>
            <img src={imagePreview} alt="" style={{width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px"}} />
            <button onClick={() => { setImageFile(null); setImagePreview(""); }}
              style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.6rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>✕</button>
          </div>
          <span style={{fontSize: "0.75rem", color: "#888"}}>Photo ready to send</span>
        </div>
      )}

      {/* EMOJI PICKER */}
      {showEmoji && (
        <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
      )}

      {/* INPUT BAR */}
      <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderTop: "1px solid #F0F0F0", padding: "10px 12px", paddingBottom: "calc(10px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", gap: "8px", zIndex: 100}}>
        <label htmlFor="chat-photo-input" style={{cursor: "pointer", padding: "6px", flexShrink: 0, opacity: 0.7, display: "flex", alignItems: "center"}}>
          <Image src="/photos.png" alt="photo" width={22} height={22} />
        </label>
        <input id="chat-photo-input" ref={fileInputRef} type="file" accept="image/*" style={{display: "none"}} onChange={handleImageSelect} />

        <button onClick={() => setShowEmoji(!showEmoji)}
          style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", padding: "4px", flexShrink: 0, opacity: 0.7, display: "flex", alignItems: "center"}}>
          😊
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          style={{flex: 1, backgroundColor: "#F7F7F7", border: "1px solid #F0F0F0", borderRadius: "20px", padding: "10px 16px", fontSize: "0.875rem", color: "#1A1A1A", outline: "none", fontFamily: "inherit"}}
        />
        <button onClick={handleSend} disabled={sending || (!text.trim() && !imageFile)}
          style={{backgroundColor: sending || (!text.trim() && !imageFile) ? "#ccc" : "#2BB39A", border: "none", borderRadius: "50%", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", cursor: sending || (!text.trim() && !imageFile) ? "not-allowed" : "pointer", flexShrink: 0}}>
          <span style={{color: "#fff", fontSize: "1rem"}}>➤</span>
        </button>
      </div>
    </div>
  );
}
