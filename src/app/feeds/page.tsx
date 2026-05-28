'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";

const TAGS = ["#lihok", "#feelings", "#announcements", "#free-stuff", "#groupmates-needed", "#org-recruitment", "#review-session"];
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🤝"];
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

  useEffect(() => {
    initPage();
  }, []);

  useEffect(() => {
    if (currentUser) fetchPosts();
  }, [currentUser, selectedSchool]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    const { data: schoolData } = await supabase.from("schools").select("id, name, abbreviation").order("name");
    if (schoolData) setSchools(schoolData);
  }

  async function fetchPosts() {
    if (!currentUser) return;
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("id, user_id, content, tag, images, created_at, school_id, users(full_name, avatar_url, school_id)")
      .eq("type", "feed")
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
      const enriched = await Promise.all(data.map(async (post) => {
        const { data: reactions } = await supabase.from("reactions").select("type, user_id").eq("post_id", post.id);
        const reactionCounts: Record<string, number> = {};
        let userReaction = null;
        (reactions || []).forEach((r) => {
          reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
          if (r.user_id === currentUser.id) userReaction = r.type;
        });
        const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id);
        return { ...post, reactionCounts, userReaction, commentCount: count || 0 };
      }));
      setPosts(enriched);
    }
    setLoading(false);
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
    if (post.userReaction === emoji) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("reactions").upsert({ post_id: postId, user_id: currentUser.id, type: emoji }, { onConflict: "post_id,user_id" });
    }
    setShowReactionPicker(null);
    fetchPosts();
  }

  async function handleQuickLike(postId: string) {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.userReaction) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("reactions").upsert({ post_id: postId, user_id: currentUser.id, reaction_type: "👍" }, { onConflict: "post_id,user_id" });
    }
    fetchPosts();
  }

  function startLongPress(postId: string) {
    longPressTimer.current = setTimeout(() => { setShowReactionPicker(postId); }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
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

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {/* Top Header */}
      <div style={{backgroundColor: "#1D9E75", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
        <Image src="/konek.svg" alt="Konek" width={80} height={28} priority />
        <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
          {/* School Filter Button */}
          <button onClick={() => setShowSchoolPicker(!showSchoolPicker)} style={{backgroundColor: "rgba(255,255,255,0.2)", border: "none", borderRadius: "20px", padding: "6px 12px", color: "#fff", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit"}}>
            📍 {getSchoolLabel()} ▾
          </button>
          {/* Notification Bell */}
          <button style={{background: "none", border: "none", cursor: "pointer", position: "relative", padding: "4px"}}>
            <Image src="/notification.png" alt="notifications" width={25} height={25} />
          </button>
          {/* Avatar */}
          <button onClick={handleLogout} style={{background: "none", border: "none", cursor: "pointer", padding: 0}}>
            {currentUser?.avatar_url
              ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff"}} />
              : <div style={{width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#0F6E56", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.8rem"}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
            }
          </button>
        </div>
      </div>

      {/* School Picker Dropdown */}
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

      {/* Overlay to close school picker */}
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
              placeholder={`What's happening, ${currentUser?.full_name?.split(" ")[0] || "ka-Konek"}?`}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={3}
              style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}}
            />

            {/* Image Previews */}
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

            {/* Tags */}
            <div style={{display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap"}}>
              {TAGS.map(tag => (
                <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                  style={{padding: "4px 10px", borderRadius: "20px", border: `1px solid ${selectedTag === tag ? "#1D9E75" : "#F0F0F0"}`, backgroundColor: selectedTag === tag ? "#E1F5EE" : "#fff", color: selectedTag === tag ? "#1D9E75" : "#888", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
                  {tag}
                </button>
              ))}
            </div>

            {postError && <div style={{color: "#EF4444", fontSize: "0.75rem", marginTop: "6px"}}>{postError}</div>}

            {/* Composer Actions */}
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

            {/* Post Header */}
            <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
              {post.users?.avatar_url
                ? <img src={post.users.avatar_url} alt="" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover"}} />
                : <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1rem"}}>{post.users?.full_name?.charAt(0).toUpperCase()}</div>
              }
              <div style={{flex: 1}}>
                <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A"}}>{post.users?.full_name}</div>
                <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px"}}>
                  {formatTime(post.created_at)}
                  {post.tag && <span style={{marginLeft: "8px", color: "#1D9E75", fontWeight: 600}}>{post.tag}</span>}
                </div>
              </div>
              <button style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem", padding: "4px"}}>•••</button>
            </div>

            {/* Post Content */}
            <div style={{padding: "0 16px 10px", fontSize: "0.9rem", color: "#1A1A1A", lineHeight: 1.5}}>{post.content}</div>

            {/* Post Images */}
            {post.images && post.images.length > 0 && (
              <div style={{display: "grid", gridTemplateColumns: post.images.length === 1 ? "1fr" : "1fr 1fr", gap: "2px", marginBottom: "8px"}}>
                {post.images.map((url, i) => (
                  <img key={i} src={url} alt="" style={{width: "100%", aspectRatio: post.images!.length === 1 ? "16/9" : "1/1", objectFit: "cover"}} />
                ))}
              </div>
            )}

            {/* Reaction Summary */}
            {getTotalReactions(post.reactionCounts || {}) > 0 && (
              <div style={{padding: "4px 16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <div style={{display: "flex", alignItems: "center", gap: "4px"}}>
                  <span style={{fontSize: "0.85rem"}}>{getTopReactions(post.reactionCounts || {}).join("")}</span>
                  <span style={{fontSize: "0.75rem", color: "#888"}}>{getTotalReactions(post.reactionCounts || {})}</span>
                </div>
                <span style={{fontSize: "0.75rem", color: "#888"}}>{post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}</span>
              </div>
            )}

            {/* Divider */}
            <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 16px"}}></div>

            {/* Action Buttons */}
            <div style={{display: "flex", padding: "4px 8px"}}>
              {/* Like Button with long press */}
              <div style={{position: "relative", flex: 1}}>
                <button
                  onMouseDown={() => startLongPress(post.id)}
                  onMouseUp={() => { cancelLongPress(); if (showReactionPicker !== post.id) handleQuickLike(post.id); }}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(post.id)}
                  onTouchEnd={() => { cancelLongPress(); if (showReactionPicker !== post.id) handleQuickLike(post.id); }}
                  style={{width: "100%", background: "none", border: "none", cursor: "pointer", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit", borderRadius: "8px"}}>
                  {post.userReaction ? <span style={{fontSize: "1.1rem"}}>{post.userReaction}</span> : <Image src="/like.png" alt="like" width={20} height={20} />}
                  <span style={{fontSize: "0.78rem", fontWeight: post.userReaction ? 700 : 400, color: post.userReaction ? "#1D9E75" : "#888"}}>
                    {post.userReaction ? REACTION_NAMES[REACTIONS.indexOf(post.userReaction)] || "Like" : "Like"}
                  </span>
                </button>

                {/* Reaction Picker */}
                {showReactionPicker === post.id && (
                  <div style={{position: "absolute", bottom: "48px", left: "0", backgroundColor: "#fff", borderRadius: "30px", padding: "8px 12px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", gap: "8px", zIndex: 300, border: "1px solid #F0F0F0"}}>
                    {REACTIONS.map((emoji, i) => (
                      <button key={emoji} onClick={() => handleReaction(post.id, emoji)} title={REACTION_NAMES[i]}
                        style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px", borderRadius: "50%", transition: "transform 0.1s"}}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment Button */}
              <button style={{flex: 1, background: "none", border: "none", cursor: "pointer", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit", borderRadius: "8px"}}>
                <Image src="/comment.png" alt="comment" width={20} height={20} />
                <span style={{fontSize: "0.78rem", color: "#888"}}>Comment</span>
              </button>

              {/* Share Button */}
              <button style={{flex: 1, background: "none", border: "none", cursor: "pointer", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit", borderRadius: "8px"}}>
                <Image src="/share.png" alt="share" width={20} height={20} />
                <span style={{fontSize: "0.78rem", color: "#888"}}>Share</span>
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderTop: "1px solid #F0F0F0", display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)"}}>
        {[
          { href: "/feeds", icon: "/feed.png", label: "Feeds", active: true },
          { href: "/soapbox", icon: "/soapbox.png", label: "Soapbox", active: false },
          { href: "/quad", icon: "/help.png", label: "Quad", active: false },
          { href: "/bazaar", icon: "/bazaar.png", label: "Bazaar", active: false },
          { href: "/living", icon: "/living.png", label: "Living", active: false },
        ].map(item => (
          <a key={item.href} href={item.href} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 4px 8px", textDecoration: "none", borderTop: item.active ? "2px solid #1D9E75" : "2px solid transparent"}}>
            <Image src={item.icon} alt={item.label} width={24} height={24} style={{opacity: item.active ? 1 : 0.4, marginBottom: "3px"}} />
            <span style={{fontSize: "0.62rem", color: item.active ? "#1D9E75" : "#888", fontWeight: item.active ? 700 : 400}}>{item.label}</span>
          </a>
        ))}
      </div>

      {/* Close reaction picker on outside click */}
      {showReactionPicker && <div onClick={() => setShowReactionPicker(null)} style={{position: "fixed", inset: 0, zIndex: 250}} />}

    </div>
  );
}
