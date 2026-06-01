'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PhotoViewer from "@/components/PhotoViewer";
import PhotoGrid from "@/components/PhotoGrid";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import SchoolPicker from "@/components/SchoolPicker";
import { shareContent } from "@/lib/share";

const TAGS = ["#lihok", "#feelings", "#announcements", "#free-stuff", "#groupmates-needed", "#org-recruitment", "#review-session"];
const REACTIONS = ["/like.png", "/love.png", "/haha.png", "/wow.png", "/sad.png", "/grabe.png", "/laban.png"];
const REACTION_VALUES = ["like", "love", "haha", "wow", "sad", "grabe", "laban"];
const REACTION_NAMES = ["Like", "Love", "Haha", "Wow", "Sad", "Grabe", "Laban"];

const HANGOUT_TAGS = ["#hangout", "#kita-kits", "#tambay", "#libre", "#Tara-G"];
const HELP_TAGS = ["#need-help", "#lost-item", "#review-session", "#need-a-ride", "#anyone-there"];
const HANGOUT_TAG_SET = new Set(HANGOUT_TAGS);

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
type QuadPost = {
  id: string; user_id: string; content: string; tag: string | null;
  images: string[] | null; created_at: string; school_id: string; expires_at: string | null;
  location?: string | null;
  users: { full_name: string; avatar_url: string | null; school_id: string; } | null;
  commentCount?: number;
  isExpired?: boolean;
  edited_at?: string | null;
};
type Notification = {
  id: string; message: string; is_read: boolean; created_at: string; post_id: string | null; type: string;
};
type ReactionUser = {
  user_id: string; type: string;
  users: { full_name: string; avatar_url: string | null; } | null;
};

function VerifiedBadge() {
  return (
    <span title="Verified Student" style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: "15px", height: "15px", backgroundColor: "#1D9E75", borderRadius: "50%", marginLeft: "4px", flexShrink: 0, verticalAlign: "middle"}}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </span>
  );
}

export default function FeedsPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quadFileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared state
  const [activeTab, setActiveTab] = useState<"feeds" | "quad">("feeds");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>("own");
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toast, setToast] = useState("");
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Verified users
  const [verifiedUsers, setVerifiedUsers] = useState<Set<string>>(new Set());

  // Feeds state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [postError, setPostError] = useState("");
  const [showReactionList, setShowReactionList] = useState(false);
  const [reactionList, setReactionList] = useState<ReactionUser[]>([]);
  const [reactionTab, setReactionTab] = useState("All");
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const feedBottomRef = useRef<HTMLDivElement>(null);

  // Quad state
  const [quadPosts, setQuadPosts] = useState<QuadPost[]>([]);
  const [quadLoading, setQuadLoading] = useState(false);
  const [quadPosting, setQuadPosting] = useState(false);
  const [quadContent, setQuadContent] = useState("");
  const [quadTag, setQuadTag] = useState("");
  const [quadLocation, setQuadLocation] = useState("");
  const [quadImage, setQuadImage] = useState<File | null>(null);
  const [quadImagePreview, setQuadImagePreview] = useState("");
  const [quadPostError, setQuadPostError] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [quadLoaded, setQuadLoaded] = useState(false);
  const [showFeedsComposer, setShowFeedsComposer] = useState(false);
  const [showQuadComposer, setShowQuadComposer] = useState(false);

  useEffect(() => {
    initPage();
    return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  }, []);

  useEffect(() => { if (currentUser) fetchPosts(); }, [currentUser, selectedSchool]);

  useEffect(() => {
    if (currentUser && activeTab === "quad" && !quadLoaded) {
      fetchQuadPosts();
      setQuadLoaded(true);
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (currentUser && quadLoaded) fetchQuadPosts();
  }, [selectedSchool, quadLoaded]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    if (feedBottomRef.current) observer.observe(feedBottomRef.current);
    return () => observer.disconnect();
  }, [offset, hasMore, loadingMore, currentUser, selectedSchool]);

  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel("feeds-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `school_id=eq.${currentUser.school_id}` },
        (payload) => {
          if (payload.new.user_id !== currentUser.id && payload.new.type === "feed" && !payload.new.is_hidden) {
            fetchPosts();
          }
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" },
        () => { fetchPosts(); }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${currentUser.id}` },
        () => { fetchUnreadCount(currentUser); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    const { data: schoolData } = await supabase.from("schools").select("id, name, abbreviation").order("name");
    if (schoolData) setSchools(schoolData);
    fetchUnreadCount(userData);
    if (userData) fetchUnreadMessages(userData.id);
    const { data: badges } = await supabase.from("user_badges").select("user_id").eq("badge_code", "verified_student");
    if (badges) setVerifiedUsers(new Set(badges.map((b: {user_id: string}) => b.user_id)));
  }

  async function fetchUnreadCount(user: User | null) {
    if (!user) return;
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("is_read", false);
    setUnreadCount(count || 0);
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



  async function fetchReactionList(postId: string) {
    setLoadingReactions(true);
    setShowReactionList(true);
    setReactionTab("All");
    const { data } = await supabase.from("reactions").select("user_id, type, users(full_name, avatar_url)").eq("post_id", postId);
    if (data) setReactionList(data.map((r: any) => ({...r, users: Array.isArray(r.users) ? r.users[0] ?? null : r.users})));
    setLoadingReactions(false);
  }

  async function fetchPosts(append = false, customOffset = 0) {
    if (!currentUser) return;
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const schoolId = selectedSchool === "own" || selectedSchool === "all" ? currentUser.school_id : selectedSchool;
      const { data, error } = await supabase.rpc("get_feed_posts", { p_school_id: schoolId, p_user_id: currentUser.id, p_limit: 20, p_offset: customOffset });
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
          if (row.user_reaction) { userReaction = REACTIONS[REACTION_VALUES.indexOf(row.user_reaction)] || null; }
          return {
            id: row.id, user_id: row.user_id, content: row.content, tag: row.tag,
            images: row.images, created_at: row.created_at, edited_at: row.edited_at, school_id: row.school_id,
            reactionCounts, userReaction, commentCount: Number(row.comment_count) || 0,
            users: { full_name: row.full_name, avatar_url: row.avatar_url, school_id: row.user_school_id },
          };
        });
        if (append) { setPosts(prev => { const ids = new Set(prev.map(p => p.id)); return [...prev, ...mapped.filter((p: Post) => !ids.has(p.id))]; }); }
        else { setPosts(mapped); setOffset(0); }
        setHasMore(mapped.length === 20);
        if (!append) setOffset(20); else setOffset(prev => prev + 20);
      }
    } catch (err) { console.error("fetchPosts error:", err); }
    finally { setLoading(false); setLoadingMore(false); }
  }

  async function fetchQuadPosts() {
    if (!currentUser) return;
    setQuadLoading(true);
    let query = supabase
      .from("posts")
      .select("id, user_id, content, tag, images, created_at, school_id, expires_at, location, edited_at, users(full_name, avatar_url, school_id)")
      .eq("type", "quad")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(30);
    if (selectedSchool === "own") { query = query.eq("school_id", currentUser.school_id); }
    else if (selectedSchool !== "all") { query = query.eq("school_id", selectedSchool); }
    const { data } = await query;
    if (data) {
      const now = new Date();
      const postIds = data.map((p: any) => p.id);
      const { data: commentCounts } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);
      const countMap: Record<string, number> = {};
      (commentCounts || []).forEach((c: any) => {
        countMap[c.post_id] = (countMap[c.post_id] || 0) + 1;
      });
      const enriched = data.map((post: any) => {
        const isExpired = post.expires_at ? new Date(post.expires_at) < now : false;
        return { ...post, commentCount: countMap[post.id] || 0, isExpired };
      });
      const active = enriched.filter(p => !p.isExpired);
      setQuadPosts(active.map((p) => ({...p, users: Array.isArray(p.users) ? p.users[0] ?? null : p.users})));
    }
    setQuadLoading(false);
  }

  async function loadMore() {
    if (loadingMore || !hasMore || !currentUser) return;
    await fetchPosts(true, offset);
  }

  async function handlePost() {
    if (!postContent.trim() || !currentUser) return;
    setPosting(true); setPostError("");
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
        user_id: currentUser.id, school_id: currentUser.school_id, type: "feed",
        content: postContent.trim(), tag: selectedTag || null,
        images: imageUrls.length > 0 ? imageUrls : null,
        is_anonymous: false, is_flagged: false, is_hidden: false, is_under_review: false,
        upvotes: 0, downvotes: 0, warning_count: 0,
      });
      if (error) throw error;
      setPostContent(""); setSelectedTag(""); setSelectedImages([]); setImagePreviews([]);
      fetchPosts();
    } catch (err: unknown) { setPostError(err instanceof Error ? err.message : "Failed to post. Try again."); }
    finally { setPosting(false); }
  }

  async function handleQuadPost() {
    if (!quadContent.trim() || !currentUser) return;
    if (!quadTag) { setQuadPostError("Please select a tag."); return; }
    if (HANGOUT_TAG_SET.has(quadTag) && !quadLocation.trim()) { setQuadPostError("Please enter your location for hangout posts."); return; }
    setQuadPosting(true); setQuadPostError("");
    try {
      let imageUrl: string | null = null;
      if (quadImage) {
        const ext = quadImage.name.split(".").pop();
        const path = "quad/" + currentUser.id + "/" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
        const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, quadImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("posts").insert({
        user_id: currentUser.id, school_id: currentUser.school_id, type: "quad",
        content: quadContent.trim(), tag: quadTag,
        images: imageUrl ? [imageUrl] : null,
        location: quadLocation.trim() || null,
        is_anonymous: false, is_flagged: false, is_hidden: false, is_under_review: false,
        upvotes: 0, downvotes: 0, warning_count: 0, expires_at: expiresAt,
      });
      if (error) throw error;
      setQuadContent(""); setQuadTag(""); setQuadLocation("");
      setQuadImage(null); setQuadImagePreview("");
      setShowQuadComposer(false);
      showToast("Posted! Expires in 6 hours.");
      fetchQuadPosts();
    } catch (err: unknown) { setQuadPostError(err instanceof Error ? err.message : "Failed to post. Try again."); }
    finally { setQuadPosting(false); }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024 && (f.type === "image/jpeg" || f.type === "image/png"));
    const combined = [...selectedImages, ...valid].slice(0, 4);
    setSelectedImages(combined);
    setImagePreviews(prev => { prev.forEach(url => URL.revokeObjectURL(url)); return combined.map(f => URL.createObjectURL(f)); });
  }

  function handleQuadImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB"); return; }
    setQuadImage(file);
    setQuadImagePreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  }

  function removeImage(index: number) {
    const imgs = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(imgs);
    setImagePreviews(prev => { prev.forEach(url => URL.revokeObjectURL(url)); return imgs.map(f => URL.createObjectURL(f)); });
  }

  async function handleReaction(postId: string, emoji: string) {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const reactionValue = REACTION_VALUES[REACTIONS.indexOf(emoji)] || "like";
    const isUnreacting = post.userReaction === emoji;
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
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const newCounts = { ...p.reactionCounts };
      if (isUnliking) {
        const prev_emoji = p.userReaction!;
        newCounts[prev_emoji] = Math.max(0, (newCounts[prev_emoji] || 1) - 1);
        if (newCounts[prev_emoji] === 0) delete newCounts[prev_emoji];
      } else { newCounts[likeEmoji] = (newCounts[likeEmoji] || 0) + 1; }
      return { ...p, reactionCounts: newCounts, userReaction: isUnliking ? null : likeEmoji };
    }));
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

  function startLongPress(postId: string) { longPressTimer.current = setTimeout(() => { setShowReactionPicker(postId); }, 500); }
  function cancelLongPress() { if (longPressTimer.current) clearTimeout(longPressTimer.current); }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleEditPost(postId: string) {
    if (!editContent.trim()) return;
    const { error } = await supabase.from("posts").update({ content: editContent.trim(), edited_at: new Date().toISOString() }).eq("id", postId);
    if (!error) { setEditingPost(null); setEditContent(""); showToast("Post updated!"); activeTab === "quad" ? fetchQuadPosts() : fetchPosts(); }
  }

  async function handleDeletePost(postId: string) {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) { setShowDeleteConfirm(null); showToast("Post deleted!"); activeTab === "quad" ? fetchQuadPosts() : fetchPosts(); }
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

  function getTimeLeft(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return h + "h " + m + "m left";
    return m + "m left";
  }

  function getTotalReactions(counts: Record<string, number>) { return Object.values(counts).reduce((a, b) => a + b, 0); }
  function getTopReactions(counts: Record<string, number>) { return Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k); }

  function getSchoolLabel() {
    if (selectedSchool === "own") { const s = schools.find(s => s.id === currentUser?.school_id); return s ? s.abbreviation : "My School"; }
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

  function getTagColor(tag: string) { return HANGOUT_TAG_SET.has(tag) ? "#1D9E75" : "#F59E0B"; }
  function getTagBg(tag: string) { return HANGOUT_TAG_SET.has(tag) ? "#E1F5EE" : "#FEF3C7"; }

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      <AppHeader
        currentUser={currentUser}
        schools={schools}
        selectedSchool={selectedSchool}
        unreadCount={unreadCount}
        onSchoolPickerToggle={() => setShowSchoolPicker(!showSchoolPicker)}
      />

      {showSchoolPicker && <SchoolPicker schools={schools} currentUser={currentUser} selectedSchool={selectedSchool} onSelect={setSelectedSchool} onClose={() => setShowSchoolPicker(false)} />}

      {/* Tab Bar */}
      <div style={{display: "flex", backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", position: "sticky", top: "56px", zIndex: 100}}>
        <button onClick={() => setActiveTab("feeds")}
          style={{flex: 1, padding: "12px 0", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: activeTab === "feeds" ? 700 : 500, fontSize: "0.875rem", color: activeTab === "feeds" ? "#1D9E75" : "#888", borderBottom: activeTab === "feeds" ? "2px solid #1D9E75" : "2px solid transparent", transition: "all 0.15s"}}>
          📢 Feeds
        </button>
        <button onClick={() => setActiveTab("quad")}
          style={{flex: 1, padding: "12px 0", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: activeTab === "quad" ? 700 : 500, fontSize: "0.875rem", color: activeTab === "quad" ? "#1D9E75" : "#888", borderBottom: activeTab === "quad" ? "2px solid #1D9E75" : "2px solid transparent", transition: "all 0.15s"}}>
          🗺️ Quad
        </button>
      </div>

      {/* Reaction Slide Panel — Feeds only */}
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
                    <div onClick={() => router.push(`/profile/${r.user_id}`)} style={{position: "relative", flexShrink: 0, cursor: "pointer"}}>
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

      {/* ===== FEEDS TAB ===== */}
      {activeTab === "feeds" && (
        <>
          {/* Feeds Composer — Compact Row */}
          <div style={{backgroundColor: "#fff", padding: "10px 16px", borderBottom: "1px solid #F0F0F0"}}>
            <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
              {currentUser?.avatar_url
                ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                : <div style={{width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#E1F5EE", border: "2px solid #1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
              }
              <button onClick={() => setShowFeedsComposer(true)}
                style={{flex: 1, textAlign: "left", backgroundColor: "#F7F7F7", border: "1px solid #F0F0F0", borderRadius: "20px", padding: "9px 14px", fontSize: "0.875rem", color: "#aaa", cursor: "pointer", fontFamily: "inherit"}}>
                What's happening, {currentUser?.full_name?.split(" ")[0] || "ka-Konek"}?
              </button>
              <button onClick={() => fileInputRef.current?.click()} style={{background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0}} title="Add photos">
                <Image src="/photos.png" alt="photos" width={22} height={22} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple style={{display: "none"}} onChange={(e) => { handleImageSelect(e); setShowFeedsComposer(true); }} />
            </div>
          </div>

          {/* Feeds Composer Modal */}
          {showFeedsComposer && (
            <>
              <div onClick={() => { setShowFeedsComposer(false); setPostContent(""); setSelectedTag(""); setSelectedImages([]); setImagePreviews([]); setPostError(""); }} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
              <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "0 0 32px"}}>
                <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "12px auto 0"}}></div>
                <div style={{padding: "12px 16px 10px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A"}}>Create Post</span>
                  <button onClick={() => { setShowFeedsComposer(false); setPostContent(""); setSelectedTag(""); setSelectedImages([]); setImagePreviews([]); setPostError(""); }} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.1rem", padding: "4px"}}>✕</button>
                </div>
                <div style={{padding: "12px 16px"}}>
                  <div style={{display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px"}}>
                    {currentUser?.avatar_url
                      ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                      : <div style={{width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#E1F5EE", border: "2px solid #1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
                    }
                    <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A", alignSelf: "center"}}>{currentUser?.full_name}</div>
                  </div>
                  <textarea
                    autoFocus
                    placeholder={`What's happening, ${currentUser?.full_name?.split(" ")[0] || "ka-Konek"}?`}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={4}
                    style={{width: "100%", border: "none", padding: "0", fontSize: "0.95rem", color: "#1A1A1A", backgroundColor: "#fff", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box", lineHeight: 1.5}}
                  />
                  {imagePreviews.length > 0 && (
                    <div style={{display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap"}}>
                      {imagePreviews.map((src, i) => (
                        <div key={i} style={{position: "relative"}}>
                          <img src={src} alt="" style={{width: "72px", height: "72px", objectFit: "cover", borderRadius: "8px"}} />
                          <button onClick={() => removeImage(i)} style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>x</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap"}}>
                    {TAGS.map(tag => (
                      <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                        style={{padding: "4px 10px", borderRadius: "12px", border: "1px solid " + (selectedTag === tag ? "#1D9E75" : "#F0F0F0"), backgroundColor: selectedTag === tag ? "#E1F5EE" : "#F7F7F7", color: selectedTag === tag ? "#1D9E75" : "#888", fontSize: "0.72rem", fontWeight: selectedTag === tag ? 700 : 400, cursor: "pointer", fontFamily: "inherit"}}>
                        {tag}
                      </button>
                    ))}
                  </div>
                  {postError && <div style={{color: "#EF4444", fontSize: "0.75rem", marginTop: "6px"}}>{postError}</div>}
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid #F0F0F0", paddingTop: "12px"}}>
                    <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
                      <button onClick={() => fileInputRef.current?.click()} style={{background: "none", border: "none", cursor: "pointer", padding: "0"}} title="Add photos"><Image src="/photos.png" alt="photos" width={22} height={22} /></button>
                      <span style={{fontSize: "0.7rem", color: "#aaa"}}>{selectedImages.length}/4 photos</span>
                    </div>
                    <button onClick={() => { handlePost(); setShowFeedsComposer(false); }} disabled={posting || !postContent.trim()}
                      style={{backgroundColor: posting || !postContent.trim() ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "9px 24px", fontWeight: 700, fontSize: "0.85rem", cursor: posting || !postContent.trim() ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                      {posting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Feeds List */}
          <div style={{flex: 1, paddingBottom: "80px"}}>
            {loading ? (
              <div>
                <style>{`@keyframes shimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } }`}</style>
                {[1,2,3].map(i => (
                  <div key={i} style={{backgroundColor: "#fff", marginBottom: "8px", padding: "12px 16px"}}>
                    <div style={{display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px"}}>
                      <div style={{width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", flexShrink: 0}} />
                      <div style={{flex: 1}}>
                        <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "6px", width: "40%"}} />
                        <div style={{height: "10px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", width: "25%"}} />
                      </div>
                    </div>
                    <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "8px"}} />
                    <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "8px", width: "80%"}} />
                    <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", width: "60%"}} />
                  </div>
                ))}
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
                  <div onClick={() => router.push(`/profile/${post.user_id}`)} style={{cursor: "pointer"}}>
                    {post.users?.avatar_url
                      ? <img src={post.users.avatar_url} alt="" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover"}} />
                      : <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1rem"}}>{post.users?.full_name?.charAt(0).toUpperCase()}</div>
                    }
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A", display: "flex", alignItems: "center"}}>{post.users?.full_name}{verifiedUsers.has(post.user_id) && <VerifiedBadge />}</div>
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
                  <div style={{padding: "0 12px"}}>
                    <PhotoGrid images={post.images} onImageClick={(i) => { setViewerImages(post.images!); setViewerIndex(i); }} />
                  </div>
                )}
                <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 16px"}}></div>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px"}}>
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
                    <button onClick={async () => { const result = await shareContent("Konek", post.content?.slice(0, 80) || "Check this out on Konek!", "/feeds/" + post.id); if (result === "copied") showToast("Link copied!"); }} style={{background: "none", border: "none", cursor: "pointer", padding: "6px 4px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit"}}>
                      <Image src="/share.png" alt="share" width={20} height={20} style={{opacity: 0.5}} />
                    </button>
                  </div>
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
            {loadingMore && (
              <div style={{textAlign: "center", padding: "16px", color: "#888", fontSize: "0.85rem"}}>
                <div style={{display: "inline-block", width: "20px", height: "20px", border: "2px solid #E0E0E0", borderTopColor: "#1D9E75", borderRadius: "50%", animation: "spin 0.8s linear infinite"}} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div style={{textAlign: "center", padding: "16px", color: "#aaa", fontSize: "0.78rem"}}>You've seen all posts</div>
            )}
            <div ref={feedBottomRef} style={{height: "1px"}} />
          </div>
        </>
      )}

      {/* ===== QUAD TAB ===== */}
      {activeTab === "quad" && (
        <>
          {/* Quad Composer — Compact Row */}
          <div style={{backgroundColor: "#fff", padding: "10px 16px", borderBottom: "1px solid #F0F0F0"}}>
            <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
              {currentUser?.avatar_url
                ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                : <div style={{width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#E1F5EE", border: "2px solid #1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
              }
              <button onClick={() => setShowQuadComposer(true)}
                style={{flex: 1, textAlign: "left", backgroundColor: "#F7F7F7", border: "1px solid #F0F0F0", borderRadius: "20px", padding: "9px 14px", fontSize: "0.875rem", color: "#aaa", cursor: "pointer", fontFamily: "inherit"}}>
                Hangout or need help?
              </button>
              <button onClick={() => quadFileInputRef.current?.click()} style={{background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0}} title="Add photo">
                <Image src="/photos.png" alt="photos" width={22} height={22} />
              </button>
              <input ref={quadFileInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={(e) => { handleQuadImageSelect(e); setShowQuadComposer(true); }} />
            </div>
          </div>

          {/* Quad Composer Modal */}
          {showQuadComposer && (
            <>
              <div onClick={() => { setShowQuadComposer(false); setQuadContent(""); setQuadTag(""); setQuadLocation(""); setQuadImage(null); setQuadImagePreview(""); setQuadPostError(""); }} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
              <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "0 0 32px"}}>
                <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "12px auto 0"}}></div>
                <div style={{padding: "12px 16px 10px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A"}}>Post to Quad</span>
                  <button onClick={() => { setShowQuadComposer(false); setQuadContent(""); setQuadTag(""); setQuadLocation(""); setQuadImage(null); setQuadImagePreview(""); setQuadPostError(""); }} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.1rem", padding: "4px"}}>✕</button>
                </div>
                <div style={{padding: "12px 16px"}}>
                  <div style={{display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px"}}>
                    {currentUser?.avatar_url
                      ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                      : <div style={{width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#E1F5EE", border: "2px solid #1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
                    }
                    <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A", alignSelf: "center"}}>{currentUser?.full_name}</div>
                  </div>
                  <textarea
                    autoFocus
                    placeholder="Hangout or need help? Post it here..."
                    value={quadContent}
                    onChange={(e) => setQuadContent(e.target.value)}
                    rows={4}
                    style={{width: "100%", border: "none", padding: "0", fontSize: "0.95rem", color: "#1A1A1A", backgroundColor: "#fff", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box", lineHeight: 1.5}}
                  />
                  {HANGOUT_TAG_SET.has(quadTag) && (
                    <div style={{marginTop: "8px"}}>
                      <input
                        placeholder="📍 Nasaan ka? (e.g. Library, Canteen, Gym)"
                        value={quadLocation}
                        onChange={e => setQuadLocation(e.target.value)}
                        style={{width: "100%", border: "1px solid #1D9E75", borderRadius: "10px", padding: "8px 12px", fontSize: "0.82rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box", color: "#1A1A1A"}}
                      />
                    </div>
                  )}
                  {quadImagePreview && (
                    <div style={{position: "relative", display: "inline-block", marginTop: "8px"}}>
                      <img src={quadImagePreview} alt="" style={{width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px"}} />
                      <button onClick={() => { setQuadImage(null); setQuadImagePreview(""); }} style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>x</button>
                    </div>
                  )}
                  <div style={{marginTop: "10px", position: "relative"}}>
                    <button onClick={() => setShowTagPicker(!showTagPicker)}
                      style={{width: "100%", padding: "9px 14px", borderRadius: "10px", border: "1px solid " + (quadTag ? (HANGOUT_TAG_SET.has(quadTag) ? "#1D9E75" : "#F59E0B") : "#F0F0F0"), backgroundColor: quadTag ? (HANGOUT_TAG_SET.has(quadTag) ? "#E1F5EE" : "#FEF3C7") : "#F7F7F7", color: quadTag ? (HANGOUT_TAG_SET.has(quadTag) ? "#1D9E75" : "#F59E0B") : "#888", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                      <span>{quadTag || "Select a tag (required)"}</span>
                      <span style={{fontSize: "0.7rem"}}>{showTagPicker ? "▲" : "▾"}</span>
                    </button>
                    {showTagPicker && (
                      <>
                        <div onClick={() => setShowTagPicker(false)} style={{position: "fixed", inset: 0, zIndex: 550}} />
                        <div style={{position: "absolute", bottom: "46px", left: 0, right: 0, backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 600, overflowY: "auto", maxHeight: "260px", border: "1px solid #F0F0F0"}}>
                          <div style={{padding: "8px 12px 4px", fontSize: "0.68rem", color: "#888", fontWeight: 700, letterSpacing: "0.05em"}}>🟢 HANGOUT</div>
                          {HANGOUT_TAGS.map(tag => (
                            <button key={tag} onClick={() => { setQuadTag(tag); setShowTagPicker(false); }}
                              style={{width: "100%", padding: "9px 16px", border: "none", borderBottom: "1px solid #F0F0F0", backgroundColor: quadTag === tag ? "#E1F5EE" : "#fff", color: quadTag === tag ? "#1D9E75" : "#1A1A1A", fontWeight: quadTag === tag ? 700 : 400, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", textAlign: "left"}}>
                              {tag}
                            </button>
                          ))}
                          <div style={{padding: "8px 12px 4px", fontSize: "0.68rem", color: "#888", fontWeight: 700, letterSpacing: "0.05em"}}>🟡 HELP</div>
                          {HELP_TAGS.map(tag => (
                            <button key={tag} onClick={() => { setQuadTag(tag); setShowTagPicker(false); }}
                              style={{width: "100%", padding: "9px 16px", border: "none", borderBottom: "1px solid #F0F0F0", backgroundColor: quadTag === tag ? "#FEF3C7" : "#fff", color: quadTag === tag ? "#F59E0B" : "#1A1A1A", fontWeight: quadTag === tag ? 700 : 400, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", textAlign: "left"}}>
                              {tag}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {quadPostError && <div style={{color: "#EF4444", fontSize: "0.75rem", marginTop: "6px"}}>{quadPostError}</div>}
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid #F0F0F0", paddingTop: "12px"}}>
                    <button onClick={() => quadFileInputRef.current?.click()} style={{background: "none", border: "none", cursor: "pointer", padding: "0"}} title="Add photo">
                      <Image src="/photos.png" alt="photos" width={22} height={22} />
                    </button>
                    <button onClick={() => handleQuadPost()} disabled={quadPosting || !quadContent.trim() || !quadTag}
                      style={{backgroundColor: quadPosting || !quadContent.trim() || !quadTag ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "9px 24px", fontWeight: 700, fontSize: "0.85rem", cursor: quadPosting || !quadContent.trim() || !quadTag ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                      {quadPosting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Quad Feed */}
          <div style={{flex: 1, paddingBottom: "80px"}}>
            {quadLoading ? (
              <div style={{textAlign: "center", padding: "48px 16px", color: "#888"}}>
                <div style={{fontSize: "2rem", marginBottom: "8px"}}>⏳</div>
                <div style={{fontSize: "0.85rem"}}>Loading quad posts...</div>
              </div>
            ) : quadPosts.length === 0 ? (
              <div style={{textAlign: "center", padding: "48px 16px"}}>
                <div style={{fontSize: "3rem", marginBottom: "12px"}}>🗺️</div>
                <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem", marginBottom: "6px"}}>Walay quad posts pa!</div>
                <div style={{color: "#888", fontSize: "0.8rem"}}>Post a hangout or ask for help!</div>
              </div>
            ) : quadPosts.map(post => (
              <div key={post.id} style={{backgroundColor: post.isExpired ? "#F7F7F7" : "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0", opacity: post.isExpired ? 0.7 : 1}}>
                <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
                  {post.isExpired ? (
                    <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0}}>⏰</div>
                  ) : post.users?.avatar_url ? (
                    <img onClick={() => router.push(`/profile/${post.user_id}`)} src={post.users.avatar_url} alt="" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", cursor: "pointer"}} />
                  ) : (
                    <div onClick={() => router.push(`/profile/${post.user_id}`)} style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1rem", cursor: "pointer"}}>{post.users?.full_name?.charAt(0).toUpperCase()}</div>
                  )}
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 700, fontSize: "0.875rem", color: post.isExpired ? "#888" : "#1A1A1A"}}>{post.isExpired ? "Expired Post" : post.users?.full_name}</div>
                    <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px", display: "flex", alignItems: "center", gap: "6px"}}>
                      {formatTime(post.created_at)}
                      {post.edited_at && <span style={{marginLeft: "6px", color: "#aaa", fontSize: "0.68rem", fontStyle: "italic"}}>· Edited</span>}
                      {post.tag && <span style={{padding: "2px 8px", borderRadius: "10px", backgroundColor: post.isExpired ? "#E0E0E0" : getTagBg(post.tag), color: post.isExpired ? "#888" : getTagColor(post.tag), fontWeight: 600, fontSize: "0.68rem"}}>{post.tag}</span>}
                    </div>
                  </div>
                  {!post.isExpired && post.expires_at && (
                    <div style={{fontSize: "0.65rem", color: "#F59E0B", fontWeight: 600, backgroundColor: "#FEF3C7", padding: "3px 8px", borderRadius: "10px", whiteSpace: "nowrap"}}>
                      ⏱ {getTimeLeft(post.expires_at)}
                    </div>
                  )}
                  {!post.isExpired && currentUser?.id === post.user_id && (
                    <button onClick={() => setShowMenu(showMenu === post.id ? null : post.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem", padding: "4px"}}>•••</button>
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
                      <button onClick={async () => { const result = await shareContent("Konek Quad", post.content?.slice(0, 80) || "Check this out on Konek!", "/quad/" + post.id); if (result === "copied") showToast("Link copied!"); }} style={{background: "none", border: "1px solid #F0F0F0", borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                        <Image src="/share.png" alt="share" width={16} height={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <BottomNav active="/feeds" unreadMessages={unreadMessages} />

      {toast && (
        <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>
      )}

      {showMenu && (
        <>
          <div onClick={() => setShowMenu(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
            <button onClick={() => { const p = activeTab === "quad" ? quadPosts.find(p => p.id === showMenu) : posts.find(p => p.id === showMenu); if (p) { setEditingPost(p.id); setEditContent(p.content); } setShowMenu(null); }}
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
          posterName={posts.find(p => p.images?.includes(viewerImages[0]))?.users?.full_name}
          posterAvatar={posts.find(p => p.images?.includes(viewerImages[0]))?.users?.avatar_url}
          timestamp={posts.find(p => p.images?.includes(viewerImages[0]))?.created_at}
          likeCount={Object.values(posts.find(p => p.images?.includes(viewerImages[0]))?.reactionCounts || {}).reduce((a,b) => a+b, 0)}
          commentCount={posts.find(p => p.images?.includes(viewerImages[0]))?.commentCount}
        />
      )}
    </div>
  );
}
