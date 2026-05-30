'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PhotoViewer from "@/components/PhotoViewer";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import SchoolPicker from "@/components/SchoolPicker";
import NotificationDropdown from "@/components/NotificationDropdown";

const TAGS = ["#lihok", "#feelings", "#announcements", "#free-stuff", "#groupmates-needed", "#org-recruitment", "#review-session"];
const REACTIONS = ["/like.png", "/love.png", "/haha.png", "/wow.png", "/sad.png", "/grabe.png", "/laban.png"];
const REACTION_VALUES = ["like", "love", "haha", "wow", "sad", "grabe", "laban"];
const REACTION_NAMES = ["Like", "Love", "Haha", "Wow", "Sad", "Grabe", "Laban"];

type School = { id: string; name: string; abbreviation: string; };
type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type Post = {
  id: string; user_id: string; content: string; tag: string | null;
  images: string[] | null; created_at: string; school_id: string;
  users: { full_name: string; avatar_url: string | null; school_id: string; } | null;
  reactionCounts?: Record<string, number>;
  userReaction?: string | null;
  commentCount?: number;
  edited_at?: string | null;
};
type Notification = {
  id: string; message: string; is_read: boolean; created_at: string; post_id: string | null; type: string;
};
type ReactionUser = {
  user_id: string; type: string;
  users: { full_name: string; avatar_url: string | null; } | null;
};

export default function FeedsPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>("own");
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [postError, setPostError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showReactionList, setShowReactionList] = useState(false);
  const [reactionList, setReactionList] = useState<ReactionUser[]>([]);
  const [reactionTab, setReactionTab] = useState("All");
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
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

  async function fetchReactionList(postId: string) {
    setLoadingReactions(true);
    setShowReactionList(true);
    setReactionTab("All");
    const { data } = await supabase.from("reactions").select("user_id, type, users(full_name, avatar_url)").eq("post_id", postId);
    if (data) setReactionList(data.map((r: any) => ({...r, users: Array.isArray(r.users) ? r.users[0] ?? null : r.users})));
    setLoadingReactions(false);
  }

  async function fetchPosts() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const schoolId = selectedSchool === "own" || selectedSchool === "all"
        ? currentUser.school_id
        : selectedSchool;

      const { data, error } = await supabase.rpc("get_feed_posts", {
        p_school_id: schoolId,
        p_user_id: currentUser.id,
        p_limit: 30,
        p_offset: 0,
      });

      if (error) throw error;

      if (data) {
        const mapped = data.map((row: any) => {
          const reactionCounts: Record<string, number> = {};
          let userReaction: string | null = null;
          if (row.reaction_counts) {
            Object.entries(row.reaction_counts).forEach(([type, count]) => {
              const emoji = REACTIONS[REACTION_VALUES.indexOf(type)];
              if (emoji) reactionCounts[emoji] = count as number;
            });
          }
          if (row.user_reaction) {
            userReaction = REACTIONS[REACTION_VALUES.indexOf(row.user_reaction)] || null;
          }
          return {
            id: row.id,
            user_id: row.user_id,
            content: row.content,
            tag: row.tag,
            images: row.images,
            created_at: row.created_at,
            edited_at: row.edited_at,
            school_id: row.school_id,
            reactionCounts,
            userReaction,
            commentCount: Number(row.comment_count) || 0,
            users: {
              full_name: row.full_name,
              avatar_url: row.avatar_url,
              school_id: row.user_school_id,
            },
          };
        });
        setPosts(mapped);
      }
    } catch (err) {
      console.error("fetchPosts error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!postContent.trim() || !currentUser) return;
    setPosting(true);
    setPostError("");
    try {
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        for (const img of selectedImages) {
          const ext = img.name.split(".").pop();
          const path = `feeds/${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, img);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        }
      }
      const { error } = await supabase.from("posts").insert({
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        type: "feed",
        content: postContent.trim(),
        tag: selectedTag || null,
        images: imageUrls.length > 0 ? imageUrls : null,
        is_anonymous: false,
        is_flagged: false,
        is_hidden: false,
        is_under_review: false,
        upvotes: 0,
        downvotes: 0,
        warning_count: 0,
      });
      if (error) throw error;
      setPostContent("");
      setSelectedTag("");
      setSelectedImages([]);
      setImagePreviews([]);
      fetchPosts();
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : "Failed to post. Try again.");
    } finally {
      setPosting(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024 && (f.type === "image/jpeg" || f.type === "image/png"));
    const combined = [...selectedImages, ...valid].slice(0, 4);
    setSelectedImages(combined);
    setImagePreviews(combined.map(f => URL.createObjectURL(f)));
  }

  function removeImage(index: number) {
    const imgs = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(imgs);
    setImagePreviews(imgs.map(f => URL.createObjectURL(f)));
  }

  async function handleReaction(postId: string, emoji: string) {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const reactionValue = REACTION_VALUES[REACTIONS.indexOf(emoji)] || "like";
    const isUnreacting = post.userReaction === emoji;

    // Optimistic update - instant UI response
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const newCounts = { ...p.reactionCounts };
      if (isUnreacting) {
        newCounts[emoji] = Math.max(0, (newCounts[emoji] || 1) - 1);
        if (newCounts[emoji] === 0) delete newCounts[emoji];
      } else {
        if (p.userReaction) {
          newCounts[p.userReaction] = Math.max(0, (newCounts[p.userReaction] || 1) - 1);
          if (newCounts[p.userReaction] === 0) delete newCounts[p.userReaction];
        }
        newCounts[emoji] = (newCounts[emoji] || 0) + 1;
      }
      return { ...p, reactionCounts: newCounts, userReaction: isUnreacting ? null : emoji };
    }));
    setShowReactionPicker(null);

    // Background DB update
    if (isUnreacting) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("reactions").upsert({ post_id: postId, user_id: currentUser.id, type: reactionValue }, { onConflict: "post_id,user_id" });
      if (post.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: post.user_id, sender_id: currentUser.id, type: "reaction",
          post_id: postId, message: currentUser.full_name + " reacted " + emoji + " to your post", is_read: false,
        });
      }
    }
  }

  async function handleQuickLike(postId: string) {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const likeEmoji = REACTIONS[0];
    const isUnliking = !!post.userReaction;

    // Optimistic update - instant UI response
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const newCounts = { ...p.reactionCounts };
      if (isUnliking) {
        const prev_emoji = p.userReaction!;
        newCounts[prev_emoji] = Math.max(0, (newCounts[prev_emoji] || 1) - 1);
        if (newCounts[prev_emoji] === 0) delete newCounts[prev_emoji];
      } else {
        newCounts[likeEmoji] = (newCounts[likeEmoji] || 0) + 1;
      }
      return { ...p, reactionCounts: newCounts, userReaction: isUnliking ? null : likeEmoji };
    }));

    // Background DB update
    if (isUnliking) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("reactions").upsert({ post_id: postId, user_id: currentUser.id, type: "like" }, { onConflict: "post_id,user_id" });
      if (post.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: post.user_id, sender_id: currentUser.id, type: "reaction",
          post_id: postId, message: currentUser.full_name + " liked your post", is_read: false,
        });
      }
    }
  }

  function startLongPress(postId: string) {
    longPressTimer.current = setTimeout(() => { setShowReactionPicker(postId); }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleEditPost(postId: string) {
    if (!editContent.trim()) return;
    const { error } = await supabase.from("posts").update({ content: editContent.trim(), edited_at: new Date().toISOString() }).eq("id", postId);
    if (!error) { setEditingPost(null); setEditContent(""); showToast("Post updated!"); fetchPosts(); }
  }

  async function handleDeletePost(postId: string) {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) { setShowDeleteConfirm(null); showToast("Post deleted!"); fetchPosts(); }
  }

  function formatTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function getTotalReactions(counts: Record<string, number>) {
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }

  function getTopReactions(counts: Record<string, number>) {
    return Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getNotifIcon(type: string) {
    if (type === "reaction") return "👍";
    if (type === "comment") return "💬";
    if (type === "reply") return "↩️";
    return "🔔";
  }

  function getFilteredReactions() {
    if (reactionTab === "All") return reactionList;
    const value = REACTION_VALUES[REACTION_NAMES.indexOf(reactionTab)];
    return reactionList.filter(r => r.type === value);
  }

  function getReactionTabs() {
    const tabs: string[] = ["All"];
    const seen = new Set<string>();
    reactionList.forEach(r => {
      const emoji = REACTIONS[REACTION_VALUES.indexOf(r.type)];
      const name = REACTION_NAMES[REACTION_VALUES.indexOf(r.type)];
      if (emoji && !seen.has(r.type)) { seen.add(r.type); tabs.push(name); }
    });
    return tabs;
  }

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      <AppHeader
        currentUser={currentUser}
        schools={schools}
        selectedSchool={selectedSchool}
        unreadCount={unreadCount}
        onSchoolPickerToggle={() => setShowSchoolPicker(!showSchoolPicker)}
        onNotificationsToggle={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications(); }}
        onLogout={handleLogout}
      />

      {showNotifications && <NotificationDropdown notifications={notifications} onClose={() => setShowNotifications(false)} navigateTo="/feeds" />}
      {showSchoolPicker && <SchoolPicker schools={schools} currentUser={currentUser} selectedSchool={selectedSchool} onSelect={setSelectedSchool} onClose={() => setShowSchoolPicker(false)} />}

      {/* Reaction Slide Panel */}
      {showReactionList && (
        <>
          <div onClick={() => setShowReactionList(false)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 400}} />
          <div style={{position: "fixed", top: 0, right: 0, width: "100%", maxWidth: "480px", height: "100vh", backgroundColor: "#fff", zIndex: 500, display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.2)", animation: "slideInRight 0.25s ease-out"}}>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div style={{padding: "16px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1D9E75"}}>
              <span style={{fontWeight: 700, fontSize: "1rem", color: "#fff"}}>Reactions</span>
              <button onClick={() => setShowReactionList(false)} style={{background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "#fff", fontSize: "1rem", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center"}}>X</button>
            </div>
            <div style={{display: "flex", gap: "4px", padding: "10px 12px", borderBottom: "1px solid #F0F0F0", overflowX: "auto"}}>
              {getReactionTabs().map(tab => {
                const idx = REACTION_NAMES.indexOf(tab);
                const img = idx >= 0 ? REACTIONS[idx] : "";
                return (
                  <button key={tab} onClick={() => setReactionTab(tab)}
                    style={{padding: "6px 14px", borderRadius: "20px", border: "none", backgroundColor: reactionTab === tab ? "#E1F5EE" : "#F7F7F7", color: reactionTab === tab ? "#1D9E75" : "#888", fontWeight: reactionTab === tab ? 700 : 400, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: "4px"}}>
                    {tab === "All" ? "All " + reactionList.length : <><img src={img} alt={tab} style={{width: "16px", height: "16px"}} /> {tab}</>}
                  </button>
                );
              })}
            </div>
            <div style={{overflowY: "auto", flex: 1}}>
              {loadingReactions ? (
                <div style={{textAlign: "center", padding: "32px", color: "#888", fontSize: "0.85rem"}}>Loading...</div>
              ) : getFilteredReactions().length === 0 ? (
                <div style={{textAlign: "center", padding: "32px", color: "#888", fontSize: "0.85rem"}}>No reactions yet.</div>
              ) : getFilteredReactions().map((r, i) => {
                const reactionImg = REACTIONS[REACTION_VALUES.indexOf(r.type)] || REACTIONS[0];
                return (
                  <div key={i} style={{display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #F0F0F0", cursor: "pointer"}}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F7F7F7")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
                    <div style={{position: "relative", flexShrink: 0}}>
                      {r.users?.avatar_url
                        ? <img src={r.users.avatar_url} alt="" style={{width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover"}} />
                        : <div style={{width: "46px", height: "46px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1.1rem"}}>{r.users?.full_name?.charAt(0).toUpperCase()}</div>
                      }
                      <div style={{position: "absolute", bottom: "-2px", right: "-2px", backgroundColor: "#fff", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.15)"}}><img src={reactionImg} alt="" style={{width: "16px", height: "16px"}} /></div>
                    </div>
                    <span style={{fontWeight: 600, fontSize: "0.9rem", color: "#1A1A1A"}}>{r.users?.full_name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Post Composer */}
      <div style={{backgroundColor: "#fff", padding: "12px 16px", borderBottom: "1px solid #F0F0F0"}}>
        <div style={{display: "flex", gap: "10px", alignItems: "flex-start"}}>
          {currentUser?.avatar_url
            ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, marginTop: "2px"}} />
            : <div style={{width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#E1F5EE", border: "2px solid #1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0, marginTop: "2px"}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
          }
          <div style={{flex: 1}}>
            <textarea
              placeholder={`What's happening, ${currentUser?.full_name?.split(" ")[0] || "ka-Konek"}?`}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={3}
              style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}}
            />
            {imagePreviews.length > 0 && (
              <div style={{display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap"}}>
                {imagePreviews.map((src, i) => (
                  <div key={i} style={{position: "relative"}}>
                    <img src={src} alt="" style={{width: "72px", height: "72px", objectFit: "cover", borderRadius: "8px"}} />
                    <button onClick={() => removeImage(i)} style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {postError && <div style={{color: "#EF4444", fontSize: "0.75rem", marginTop: "6px"}}>{postError}</div>}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px"}}>
              <div style={{display: "flex", gap: "12px"}}>
                <button onClick={() => fileInputRef.current?.click()} style={{background: "none", border: "none", cursor: "pointer", padding: "0"}} title="Add photos"><Image src="/photos.png" alt="photos" width={22} height={22} /></button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple style={{display: "none"}} onChange={handleImageSelect} />
                <span style={{fontSize: "0.7rem", color: "#aaa", alignSelf: "center"}}>{selectedImages.length}/4 photos</span>
              </div>
              <button onClick={handlePost} disabled={posting || !postContent.trim()}
                style={{backgroundColor: posting || !postContent.trim() ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontWeight: 700, fontSize: "0.8rem", cursor: posting || !postContent.trim() ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
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
            <div style={{fontSize: "3rem", marginBottom: "12px"}}>📭</div>
            <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem", marginBottom: "6px"}}>Walay post pa diri!</div>
            <div style={{color: "#888", fontSize: "0.8rem"}}>Be the first to post in your school community.</div>
          </div>
        ) : posts.map(post => (
          <div key={post.id} style={{backgroundColor: "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0"}}>
            <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
              {post.users?.avatar_url
                ? <img src={post.users.avatar_url} alt="" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover"}} />
                : <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1rem"}}>{post.users?.full_name?.charAt(0).toUpperCase()}</div>
              }
              <div style={{flex: 1}}>
                <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A"}}>{post.users?.full_name}</div>
                <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px"}}>
                  {formatTime(post.created_at)}
                  {post.edited_at && <span style={{marginLeft: "6px", color: "#aaa", fontSize: "0.68rem", fontStyle: "italic"}}>· Edited</span>}
                </div>
              </div>
              {currentUser?.id === post.user_id && (
                <button onClick={() => setShowMenu(showMenu === post.id ? null : post.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem", padding: "4px"}}>•••</button>
              )}
            </div>

            <div style={{padding: "0 16px 10px", fontSize: "0.9rem", color: "#1A1A1A", lineHeight: 1.5}}>{post.content}</div>

            {post.images && post.images.length > 0 && (
              <div style={{display: "grid", gridTemplateColumns: post.images.length === 1 ? "1fr" : "1fr 1fr", gap: "2px", marginBottom: "8px"}}>
                {post.images.map((url, i) => (
                  <img key={i} src={url} alt="" onClick={() => { setViewerImages(post.images!); setViewerIndex(i); }} style={{width: "100%", maxHeight: "480px", objectFit: "contain", backgroundColor: "#000", cursor: "pointer", display: "block"}} />
                ))}
              </div>
            )}



            <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 16px"}}></div>

            {/* Facebook-style action bar */}
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px"}}>
              {/* Left: Like count, Comment count, Share count */}
              <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                <div style={{position: "relative"}}>
                  <button
                    onMouseDown={() => startLongPress(post.id)}
                    onMouseUp={() => { cancelLongPress(); if (showReactionPicker !== post.id) handleQuickLike(post.id); }}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={() => startLongPress(post.id)}
                    onTouchEnd={() => { cancelLongPress(); if (showReactionPicker !== post.id) handleQuickLike(post.id); }}
                    style={{background: "none", border: "none", cursor: "pointer", padding: "6px 4px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit"}}>
                    {post.userReaction ? <img src={post.userReaction} alt="reaction" style={{width: "20px", height: "20px", objectFit: "contain"}} /> : <Image src="/like.png" alt="like" width={20} height={20} style={{opacity: 0.5}} />}
                    {getTotalReactions(post.reactionCounts || {}) > 0 && <span style={{fontSize: "0.78rem", fontWeight: 600, color: post.userReaction ? "#1D9E75" : "#888"}}>{getTotalReactions(post.reactionCounts || {})}</span>}
                  </button>
                  {showReactionPicker === post.id && (
                    <div style={{position: "absolute", bottom: "44px", left: "0", backgroundColor: "#fff", borderRadius: "30px", padding: "8px 12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "4px", zIndex: 600, border: "1px solid #F0F0F0"}}>
                      {REACTIONS.map((img, i) => (
                        <button key={img} onClick={() => handleReaction(post.id, img)} title={REACTION_NAMES[i]} style={{background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "2px 4px"}}>
                          <img src={img} alt={REACTION_NAMES[i]} style={{width: "36px", height: "36px", objectFit: "contain"}} />
                          <span style={{fontSize: "0.58rem", color: "#888", fontFamily: "inherit"}}>{REACTION_NAMES[i]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => router.push("/feeds/" + post.id)} style={{background: "none", border: "none", cursor: "pointer", padding: "6px 4px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit"}}>
                  <Image src="/comment.png" alt="comment" width={20} height={20} style={{opacity: 0.5}} />
                  {(post.commentCount || 0) > 0 && <span style={{fontSize: "0.78rem", color: "#888", fontWeight: 600}}>{post.commentCount}</span>}
                </button>
                <button style={{background: "none", border: "none", cursor: "pointer", padding: "6px 4px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit"}}>
                  <Image src="/share.png" alt="share" width={20} height={20} style={{opacity: 0.5}} />
                </button>
              </div>

              {/* Right: Top reaction emojis */}
              {getTotalReactions(post.reactionCounts || {}) > 0 && (
                <div onClick={() => fetchReactionList(post.id)} style={{display: "flex", alignItems: "center", gap: "2px", cursor: "pointer", padding: "6px 4px"}}>
                  {getTopReactions(post.reactionCounts || {}).map((img, i) => (
                    <img key={i} src={img} alt="" style={{width: "20px", height: "20px", objectFit: "contain"}} />
                  ))}
                </div>
              )}
            </div>
          </div>


        ))}
      </div>

      <BottomNav active="/feeds" />

      {toast && (
        <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>
      )}

      {showMenu && (
        <>
          <div onClick={() => setShowMenu(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
            <button onClick={() => { const p = posts.find(p => p.id === showMenu); if (p) { setEditingPost(p.id); setEditContent(p.content); } setShowMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1A1A1A"}}>
              ✏️ Edit Post
            </button>
            <button onClick={() => { setShowDeleteConfirm(showMenu); setShowMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
              🗑️ Delete Post
            </button>
          </div>
        </>
      )}

      {editingPost && (
        <>
          <div onClick={() => setEditingPost(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "16px 16px 32px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto 16px"}}></div>
            <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A", marginBottom: "12px"}}>Edit Post</div>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
              style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            <div style={{display: "flex", gap: "10px", marginTop: "12px", justifyContent: "flex-end"}}>
              <button onClick={() => setEditingPost(null)} style={{padding: "9px 20px", borderRadius: "20px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={() => handleEditPost(editingPost)} style={{padding: "9px 20px", borderRadius: "20px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>Save</button>
            </div>
          </div>
        </>
      )}

      {showDeleteConfirm && (
        <>
          <div onClick={() => setShowDeleteConfirm(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "24px 16px 32px"}}>
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "8px", textAlign: "center"}}>Delete Post?</div>
            <div style={{fontSize: "0.85rem", color: "#888", textAlign: "center", marginBottom: "20px"}}>This cannot be undone.</div>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowDeleteConfirm(null)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={() => handleDeletePost(showDeleteConfirm)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Delete</button>
            </div>
          </div>
        </>
      )}

      {showReactionPicker && <div onClick={() => setShowReactionPicker(null)} style={{position: "fixed", inset: 0, zIndex: 250}} />}
      {viewerImages.length > 0 && (
        <PhotoViewer
          images={viewerImages}
          startIndex={viewerIndex}
          currentIndex={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerImages([])}
        />
      )}
    </div>
  );
}