'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";

const HANGOUT_TAGS = ["#hangout", "#kita-kits", "#tambay", "#libre", "#Tara-G"];
const HELP_TAGS = ["#need-help", "#lost-item", "#review-session", "#need-a-ride", "#anyone-there"];
const ALL_TAGS = [...HANGOUT_TAGS, ...HELP_TAGS];
const HANGOUT_TAG_SET = new Set(HANGOUT_TAGS);

type School = { id: string; name: string; abbreviation: string; };
type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type QuadPost = {
  id: string; user_id: string; content: string; tag: string | null;
  images: string[] | null; created_at: string; school_id: string; expires_at: string | null;
  location?: string | null;
  users: { full_name: string; avatar_url: string | null; school_id: string; } | null;
  commentCount?: number;
  isExpired?: boolean;
};
type Notification = {
  id: string; message: string; is_read: boolean; created_at: string; post_id: string | null; type: string;
};

export default function QuadPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [posts, setPosts] = useState<QuadPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>("own");
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [location, setLocation] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [postError, setPostError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (currentUser) fetchPosts(); }, [currentUser, selectedSchool]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    const { data: schoolData } = await supabase.from("schools").select("id, name, abbreviation").order("name");
    if (schoolData) setSchools(schoolData);
    fetchUnreadCount(userData);
  }

  async function fetchUnreadCount(user: User | null) {
    if (!user) return;
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("is_read", false);
    setUnreadCount(count || 0);
  }

  async function fetchNotifications() {
    if (!currentUser) return;
    const { data } = await supabase.from("notifications").select("*").eq("recipient_id", currentUser.id).order("created_at", { ascending: false }).limit(20);
    if (data) setNotifications(data);
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", currentUser.id).eq("is_read", false);
    setUnreadCount(0);
  }

  async function fetchPosts() {
    if (!currentUser) return;
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("id, user_id, content, tag, images, created_at, school_id, expires_at, location, users(full_name, avatar_url, school_id)")
      .eq("type", "quad")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(30);
    if (selectedSchool === "own") {
      query = query.eq("school_id", currentUser.school_id);
    } else if (selectedSchool !== "all") {
      query = query.eq("school_id", selectedSchool);
    }
    const { data } = await query;
    if (data) {
      const now = new Date();
      const enriched = await Promise.all(data.map(async (post) => {
        const isExpired = post.expires_at ? new Date(post.expires_at) < now : false;
        const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id);
        return { ...post, commentCount: count || 0, isExpired };
      }));
      setPosts(enriched);
    }
    setLoading(false);
  }

  async function handlePost() {
    if (!postContent.trim() || !currentUser) return;
    if (!selectedTag) { setPostError("Please select a tag."); return; }
    if (HANGOUT_TAG_SET.has(selectedTag) && !location.trim()) { setPostError("Please enter your location for hangout posts."); return; }
    setPosting(true);
    setPostError("");
    try {
      let imageUrl: string | null = null;
      if (selectedImage) {
        const ext = selectedImage.name.split(".").pop();
        const path = "quad/" + currentUser.id + "/" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
        const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, selectedImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("posts").insert({
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        type: "quad",
        content: postContent.trim(),
        tag: selectedTag,
        images: imageUrl ? [imageUrl] : null,
        location: location.trim() || null,
        is_anonymous: false,
        is_flagged: false,
        is_hidden: false,
        is_under_review: false,
        upvotes: 0,
        downvotes: 0,
        warning_count: 0,
        expires_at: expiresAt,
      });
      if (error) throw error;
      setPostContent("");
      setSelectedTag("");
      setLocation("");
      setSelectedImage(null);
      setImagePreview("");
      showToast("Posted! Expires in 6 hours.");
      fetchPosts();
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : "Failed to post. Try again.");
    } finally {
      setPosting(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB"); return; }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
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

  function getTimeLeft(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return h + "h " + m + "m left";
    return m + "m left";
  }

  function getSchoolLabel() {
    if (selectedSchool === "own") {
      const s = schools.find(s => s.id === currentUser?.school_id);
      return s ? s.abbreviation : "My School";
    }
    if (selectedSchool === "all") return "All Schools";
    const s = schools.find(s => s.id === selectedSchool);
    return s ? s.abbreviation : "School";
  }

  function getNotifIcon(type: string) {
    if (type === "reaction") return "👍";
    if (type === "comment") return "💬";
    if (type === "reply") return "↩️";
    return "🔔";
  }

  function getTagColor(tag: string) {
    return HANGOUT_TAG_SET.has(tag) ? "#1D9E75" : "#F59E0B";
  }

  function getTagBg(tag: string) {
    return HANGOUT_TAG_SET.has(tag) ? "#E1F5EE" : "#FEF3C7";
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {toast && (
        <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{backgroundColor: "#1D9E75", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
        <div style={{display: "flex", flexDirection: "column"}}>
          <Image src="/konek.svg" alt="Konek" width={80} height={28} priority />
          <span style={{color: "rgba(255,255,255,0.85)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.05em", marginTop: "2px"}}>QUAD</span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
          <button onClick={() => setShowSchoolPicker(!showSchoolPicker)} style={{backgroundColor: "rgba(255,255,255,0.2)", border: "none", borderRadius: "20px", padding: "6px 12px", color: "#fff", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit"}}>
            📍 {getSchoolLabel()} ▾
          </button>
          <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications(); }} style={{background: "none", border: "none", cursor: "pointer", position: "relative", padding: "4px"}}>
            <Image src="/notification.png" alt="notifications" width={25} height={25} />
            {unreadCount > 0 && (
              <div style={{position: "absolute", top: "0px", right: "0px", backgroundColor: "#EF4444", color: "#fff", borderRadius: "50%", width: "16px", height: "16px", fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #1D9E75"}}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </button>
          <button onClick={handleLogout} style={{background: "none", border: "none", cursor: "pointer", padding: 0}}>
            {currentUser?.avatar_url
              ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff"}} />
              : <div style={{width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#0F6E56", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.8rem"}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
            }
          </button>
        </div>
      </div>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div style={{position: "fixed", top: "56px", left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", maxHeight: "70vh", overflowY: "auto", borderRadius: "0 0 16px 16px"}}>
          <div style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <span style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A"}}>Notifications</span>
            <button onClick={() => setShowNotifications(false)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem"}}>✕</button>
          </div>
          {notifications.length === 0 ? (
            <div style={{textAlign: "center", padding: "32px 16px", color: "#888"}}>
              <div style={{fontSize: "2rem", marginBottom: "8px"}}>🔔</div>
              <div style={{fontSize: "0.85rem"}}>Walay notifications pa.</div>
            </div>
          ) : notifications.map(notif => (
            <div key={notif.id} onClick={() => { setShowNotifications(false); if (notif.post_id) router.push("/quad/" + notif.post_id); }}
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
      )}
      {showNotifications && <div onClick={() => setShowNotifications(false)} style={{position: "fixed", inset: 0, zIndex: 150}} />}

      {/* School Picker */}
      {showSchoolPicker && (
        <div style={{position: "fixed", top: "60px", left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", borderRadius: "0 0 16px 16px", overflow: "hidden"}}>
          {[
            { id: "own", label: "🏫 My School", sub: schools.find(s => s.id === currentUser?.school_id)?.name || "" },
            { id: "all", label: "🌐 All Schools", sub: "See posts from all Tangub schools" },
            ...schools.map(s => ({ id: s.id, label: s.abbreviation, sub: s.name }))
          ].map((option) => (
            <button key={option.id} onClick={() => { setSelectedSchool(option.id); setShowSchoolPicker(false); }}
              style={{width: "100%", padding: "12px 16px", background: selectedSchool === option.id ? "#E1F5EE" : "#fff", border: "none", borderBottom: "1px solid #F0F0F0", cursor: "pointer", textAlign: "left", fontFamily: "inherit"}}>
              <div style={{fontWeight: 600, fontSize: "0.85rem", color: selectedSchool === option.id ? "#1D9E75" : "#1A1A1A"}}>{option.label}</div>
              {option.sub && <div style={{fontSize: "0.72rem", color: "#888", marginTop: "2px"}}>{option.sub}</div>}
            </button>
          ))}
        </div>
      )}
      {showSchoolPicker && <div onClick={() => setShowSchoolPicker(false)} style={{position: "fixed", inset: 0, zIndex: 150}} />}

      {/* Post Composer */}
      <div style={{backgroundColor: "#fff", padding: "12px 16px", borderBottom: "1px solid #F0F0F0"}}>
        <div style={{display: "flex", gap: "10px", alignItems: "flex-start"}}>
          {currentUser?.avatar_url
            ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, marginTop: "2px"}} />
            : <div style={{width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#E1F5EE", border: "2px solid #1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0, marginTop: "2px"}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
          }
          <div style={{flex: 1}}>
            <textarea
              placeholder="Hangout or need help? Post it here..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={3}
              style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}}
            />
            {HANGOUT_TAG_SET.has(selectedTag) && (
              <div style={{marginTop: "8px"}}>
                <input
                  placeholder="📍 Where are you? (e.g. Library 2nd floor, Canteen)"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  style={{width: "100%", border: "1px solid #1D9E75", borderRadius: "10px", padding: "8px 12px", fontSize: "0.82rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box", color: "#1A1A1A"}}
                />
              </div>
            )}
            {imagePreview && (
              <div style={{position: "relative", display: "inline-block", marginTop: "8px"}}>
                <img src={imagePreview} alt="" style={{width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px"}} />
                <button onClick={() => { setSelectedImage(null); setImagePreview(""); }} style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>✕</button>
              </div>
            )}
            <div style={{marginTop: "8px"}}>
              <div style={{fontSize: "0.7rem", color: "#888", fontWeight: 600, marginBottom: "5px"}}>🟢 Hangout</div>
              <div style={{display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px"}}>
                {HANGOUT_TAGS.map(tag => (
                  <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                    style={{padding: "4px 10px", borderRadius: "20px", border: "1px solid " + (selectedTag === tag ? "#1D9E75" : "#F0F0F0"), backgroundColor: selectedTag === tag ? "#E1F5EE" : "#fff", color: selectedTag === tag ? "#1D9E75" : "#888", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
                    {tag}
                  </button>
                ))}
              </div>
              <div style={{fontSize: "0.7rem", color: "#888", fontWeight: 600, marginBottom: "5px"}}>🟡 Help</div>
              <div style={{display: "flex", gap: "6px", flexWrap: "wrap"}}>
                {HELP_TAGS.map(tag => (
                  <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                    style={{padding: "4px 10px", borderRadius: "20px", border: "1px solid " + (selectedTag === tag ? "#F59E0B" : "#F0F0F0"), backgroundColor: selectedTag === tag ? "#FEF3C7" : "#fff", color: selectedTag === tag ? "#F59E0B" : "#888", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            {postError && <div style={{color: "#EF4444", fontSize: "0.75rem", marginTop: "6px"}}>{postError}</div>}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px"}}>
              <button onClick={() => fileInputRef.current?.click()} style={{background: "none", border: "none", cursor: "pointer", padding: "0"}} title="Add photo">
                <Image src="/photos.png" alt="photos" width={22} height={22} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleImageSelect} />
              <button onClick={handlePost} disabled={posting || !postContent.trim() || !selectedTag}
                style={{backgroundColor: posting || !postContent.trim() || !selectedTag ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontWeight: 700, fontSize: "0.8rem", cursor: posting || !postContent.trim() || !selectedTag ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{flex: 1, paddingBottom: "80px"}}>
        {loading ? (
          <div style={{textAlign: "center", padding: "48px 16px", color: "#888"}}>
            <div style={{fontSize: "2rem", marginBottom: "8px"}}>⏳</div>
            <div style={{fontSize: "0.85rem"}}>Loading posts...</div>
          </div>
        ) : posts.length === 0 ? (
          <div style={{textAlign: "center", padding: "48px 16px"}}>
            <div style={{fontSize: "3rem", marginBottom: "12px"}}>🗺️</div>
            <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem", marginBottom: "6px"}}>Walay quad posts pa!</div>
            <div style={{color: "#888", fontSize: "0.8rem"}}>Post a hangout or ask for help!</div>
          </div>
        ) : posts.map(post => (
          <div key={post.id} style={{backgroundColor: post.isExpired ? "#F7F7F7" : "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0", opacity: post.isExpired ? 0.7 : 1}}>
            <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
              {post.isExpired ? (
                <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0}}>⏰</div>
              ) : post.users?.avatar_url ? (
                <img src={post.users.avatar_url} alt="" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover"}} />
              ) : (
                <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1rem"}}>{post.users?.full_name?.charAt(0).toUpperCase()}</div>
              )}
              <div style={{flex: 1}}>
                <div style={{fontWeight: 700, fontSize: "0.875rem", color: post.isExpired ? "#888" : "#1A1A1A"}}>{post.isExpired ? "Expired Post" : post.users?.full_name}</div>
                <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px", display: "flex", alignItems: "center", gap: "6px"}}>
                  {formatTime(post.created_at)}
                  {post.tag && <span style={{padding: "2px 8px", borderRadius: "10px", backgroundColor: post.isExpired ? "#E0E0E0" : getTagBg(post.tag), color: post.isExpired ? "#888" : getTagColor(post.tag), fontWeight: 600, fontSize: "0.68rem"}}>{post.tag}</span>}
                </div>
              </div>
              {!post.isExpired && post.expires_at && (
                <div style={{fontSize: "0.65rem", color: "#F59E0B", fontWeight: 600, backgroundColor: "#FEF3C7", padding: "3px 8px", borderRadius: "10px", whiteSpace: "nowrap"}}>
                  ⏱ {getTimeLeft(post.expires_at)}
                </div>
              )}
            </div>

            {post.isExpired ? (
              <div style={{padding: "10px 16px 14px"}}>
                <div style={{fontSize: "0.85rem", color: "#aaa", fontStyle: "italic"}}>⏰ This post has expired.</div>
              </div>
            ) : (
              <>
                {post.location && (
                  <div style={{padding: "0 16px 6px", display: "flex", alignItems: "center", gap: "5px"}}>
                    <span style={{fontSize: "0.75rem", color: "#1D9E75", fontWeight: 600}}>📍 {post.location}</span>
                  </div>
                )}
                <div style={{padding: "0 16px 10px", fontSize: "0.9rem", color: "#1A1A1A", lineHeight: 1.5}}>{post.content}</div>
                {post.images && post.images.length > 0 && (
                  <div style={{marginBottom: "8px"}}>
                    <img src={post.images[0]} alt="" style={{width: "100%", maxHeight: "300px", objectFit: "cover"}} />
                  </div>
                )}
                <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 16px"}}></div>
                <div style={{display: "flex", padding: "6px 12px", alignItems: "center", gap: "8px"}}>
                  <button onClick={() => router.push("/quad/" + post.id)} style={{background: "none", border: "1px solid #F0F0F0", borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                    <Image src="/comment.png" alt="comment" width={16} height={16} />
                    <span style={{fontSize: "0.8rem", color: "#888", fontWeight: 600}}>{post.commentCount || 0}</span>
                  </button>
                  <button style={{background: "none", border: "1px solid #F0F0F0", borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                    <Image src="/share.png" alt="share" width={16} height={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderTop: "1px solid #F0F0F0", display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)"}}>
        {[
          { href: "/feeds", icon: "/feed.png", label: "Feeds", active: false },
          { href: "/soapbox", icon: "/soapbox.png", label: "Soapbox", active: false },
          { href: "/quad", icon: "/help.png", label: "Quad", active: true },
          { href: "/bazaar", icon: "/bazaar.png", label: "Bazaar", active: false },
          { href: "/living", icon: "/living.png", label: "Living", active: false },
        ].map(item => (
          <a key={item.href} href={item.href} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 4px 8px", textDecoration: "none", borderTop: item.active ? "2px solid #1D9E75" : "2px solid transparent"}}>
            <Image src={item.icon} alt={item.label} width={24} height={24} style={{opacity: item.active ? 1 : 0.4, marginBottom: "3px"}} />
            <span style={{fontSize: "0.62rem", color: item.active ? "#1D9E75" : "#888", fontWeight: item.active ? 700 : 400}}>{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
