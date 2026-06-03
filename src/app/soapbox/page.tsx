'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { shareContent } from "@/lib/share";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";
import ReactionButton, { CONFESSION_REACTIONS as REACTION_SET } from "@/components/ReactionButton";
import AppHeader from "@/components/AppHeader";
import SchoolPicker from "@/components/SchoolPicker";
import { useRouter } from "next/navigation";
import { useSchool } from "@/context/SchoolContext";
import EmojiPicker from "@/components/EmojiPicker";


const ADJECTIVES = [
  "Tamad", "Sungit", "Buang", "Maldito", "Gigante", "Liit", "Paborito", "Bantog", "Tapang", "Matabil",
  "Malandi", "Makulit", "Matigas", "Mahirap", "Mayaman", "Bibo", "Torpe", "Bungog", "Ambisyoso", "Desperado",
  "Loko", "Siraulo", "Gwapo", "Pangit", "Mabait", "Maingay", "Tahimik", "Inggitero", "Palahubog", "Sigurista",
  "Paaway", "Romantiko", "Traydor", "Loyalista", "Mapanghusga", "Chismoso", "Interesado", "Confusado", "Suplado", "Friendly",
  "Makulay", "Malungkot", "Masaya", "Mainit", "Malamig", "Mabango", "Mabaho", "Matamis", "Mapait", "Maalat",
  "Gutom", "Busog", "Tulog", "Gising", "Nerbiyoso", "Excited", "Abala", "Libre", "Kuripot", "Gastador",
  "Matalino", "Bobo", "Mausisa", "Balimbing", "Mapagkumpitensya", "Makasarili", "Mapagbigay", "Mahilig", "Mainggitin", "Mapagtaka",
  "Walang-Kwenta", "Palaaway", "Palamura", "Palakibo", "Palainom", "Palikero", "Palaengot", "Palaisip", "Pabibo",
  "Kwela", "Petiks", "Arte", "Landian", "Marupok", "Fragile", "Savage", "Chill", "Kilig",
  "Bitter", "Petmalu", "Lodi", "Beshie", "Selos", "Manhid", "Feelingero", "Deadma", "Jologs", "Baduy",
  "Tambaloslos", "Bigaon", "Batignawong"
];

const NOUNS = [
  "Kalabaw", "Pusit", "Bangus", "Kamote", "Baboy", "Manok", "Isda", "Bato", "Payong", "Kutsilyo",
  "Tilapia", "Tulingan", "Galunggong", "Daing", "Tinapa", "Sardinas", "Danggit", "Hito", "Palaka", "Butiki",
  "Ipis", "Langgam", "Lamok", "Daga", "Pusa", "Aso", "Kabayo", "Baka", "Kambing",
  "Itlog", "Saging", "Mangga", "Kaimito", "Bayabas", "Siniguelas", "Atis", "Langka",
  "Durian", "Lanzones", "Rambutan", "Santol", "Papaya", "Melon", "Pipino", "Ampalaya", "Sibuyas", "Bawang",
  "Luya", "Paminta", "Asin", "Asukal", "Kanin", "Bigas", "Lugaw", "Pancit", "Mami",
  "Siopao", "Turon", "Bibingka", "Puto", "Kutsinta", "Palitaw", "Biko", "Suman", "Halo-halo",
  "Buko", "Taho", "Balut", "Penoy", "Isaw", "Betamax", "Kikiam", "Kwek-kwek", "Fishball", "Tempura",
  "Jeepney", "Tricycle", "Pedicab", "Tsinelas", "Sombrero", "Salakot", "Baro", "Saya", "Kamison", "Tapis",
  "Banga", "Palayok", "Kawali", "Kutsara", "Tinidor", "Sandok", "Walis", "Pugon", "Kalan", "Banig",
  "Tinabal", "Balbacua"
];

function generatePseudonym(userId: string, postSeed: string): string {
  let hash = 0;
  const str = userId + postSeed;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const adj = ADJECTIVES[abs % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(abs / ADJECTIVES.length) % NOUNS.length];
  const num = (abs % 999) + 1;
  return adj + " na " + noun + " #" + num;
}



type School = { id: string; name: string; abbreviation: string; };
type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type SoapboxPost = {
  id: string; user_id: string; content: string; tag: string | null;
  images: string[] | null; created_at: string; school_id: string;
  pseudonym: string | null; upvotes: number; downvotes: number;
  userVote?: "upvote" | "downvote" | null;
  commentCount?: number;
  edited_at?: string | null;
};
type ConfessionPost = {
  id: string; user_id: string; content: string;
  images: string[] | null; created_at: string; school_id: string;
  pseudonym: string | null;
  reactionCounts: { love: number; sad: number; haha: number; laban: number };
  userReaction: string | null;
  commentCount: number;
  edited_at?: string | null;
};
type Notification = {
  id: string; message: string; is_read: boolean; created_at: string; post_id: string | null; type: string;
};

export default function SoapboxPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confessionFileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- shared state ---
  const [activeTab, setActiveTab] = useState<"soapbox" | "confession">("soapbox");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const { selectedSchool, setSelectedSchool } = useSchool();
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toast, setToast] = useState("");

  // --- soapbox state ---
  const [posts, setPosts] = useState<SoapboxPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [showSoapboxEmoji, setShowSoapboxEmoji] = useState(false);
  const [showConfessionEmoji, setShowConfessionEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [postError, setPostError] = useState("");
  const [myPseudonym, setMyPseudonym] = useState("");
  const [postSeed] = useState(() => Date.now().toString());
  const [showPhotoWarning, setShowPhotoWarning] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // --- confession state ---
  const [confessions, setConfessions] = useState<ConfessionPost[]>([]);
  const [confessionLoading, setConfessionLoading] = useState(true);
  const [confessionPosting, setConfessionPosting] = useState(false);
  const [confessionContent, setConfessionContent] = useState("");
  const [confessionImage, setConfessionImage] = useState<File | null>(null);
  const [confessionImagePreview, setConfessionImagePreview] = useState<string>("");
  const [confessionError, setConfessionError] = useState("");
  const [confessionSeed] = useState(() => (Date.now() + 1).toString());
  const [myConfessionPseudonym, setMyConfessionPseudonym] = useState("");
  const [showConfessionPhotoWarning, setShowConfessionPhotoWarning] = useState(false);
  const [confessionMenu, setConfessionMenu] = useState<string | null>(null);
  const [editingConfession, setEditingConfession] = useState<string | null>(null);
  const [editConfessionContent, setEditConfessionContent] = useState("");
  const [showDeleteConfessionConfirm, setShowDeleteConfessionConfirm] = useState<string | null>(null);
  const [topConfessions, setTopConfessions] = useState<ConfessionPost[]>([]);

  useEffect(() => { initPage(); }, []);

  useEffect(() => {
    if (currentUser) {
      if (activeTab === "soapbox") {
        fetchPosts();
        setMyPseudonym(generatePseudonym(currentUser.id, postSeed));
      } else {
        fetchConfessions();
        setMyConfessionPseudonym(generatePseudonym(currentUser.id, confessionSeed));
      }
    }
  }, [currentUser, selectedSchool, activeTab]);

  useEffect(() => {
  
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

  return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

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



  // ===================== SOAPBOX =====================

  async function fetchPosts() {
    if (!currentUser) return;
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("id, user_id, content, tag, images, created_at, school_id, pseudonym, upvotes, downvotes, edited_at")
      .eq("type", "soapbox")
      .eq("is_hidden", false)
      .order("upvotes", { ascending: false })
      .limit(30);
    if (selectedSchool === "own") query = query.eq("school_id", currentUser.school_id);
    else if (selectedSchool !== "all") query = query.eq("school_id", selectedSchool);
    const { data } = await query;
    if (data) {
      const enriched = await Promise.all(data.map(async (post) => {
        const { data: myVote } = await supabase.from("reactions").select("type").eq("post_id", post.id).eq("user_id", currentUser.id).single();
        const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id);
        return { ...post, userVote: myVote ? (myVote.type as "upvote" | "downvote") : null, commentCount: count || 0 };
      }));
      setPosts(enriched);
    }
    setLoading(false);
  }

  async function handlePost() {
    if (!postContent.trim() || !currentUser) return;
    setPosting(true); setPostError("");
    try {
      let imageUrl: string | null = null;
      if (selectedImage) {
        const ext = selectedImage.name.split(".").pop();
        const path = "soapbox/" + currentUser.id + "/" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
        const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, selectedImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const pseudonym = generatePseudonym(currentUser.id, postSeed);
      const { error } = await supabase.from("posts").insert({
        user_id: currentUser.id, school_id: currentUser.school_id, type: "soapbox",
        content: postContent.trim(), tag: null,
        images: imageUrl ? [imageUrl] : null, is_anonymous: true, pseudonym,
        is_flagged: false, is_hidden: false, is_under_review: false,
        upvotes: 0, downvotes: 0, warning_count: 0,
      });
      if (error) throw error;
      setPostContent(""); setSelectedImage(null); setImagePreview("");
      showToast("Posted anonymously!"); fetchPosts();
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : "Failed to post. Try again.");
    } finally { setPosting(false); }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB"); return; }
    setSelectedImage(file);
    setImagePreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setShowPhotoWarning(false);
  }

  async function handleVote(postId: string, voteType: "upvote" | "downvote") {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.userVote === voteType) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
      await supabase.from("posts").update({
        upvotes: voteType === "upvote" ? Math.max(0, post.upvotes - 1) : post.upvotes,
        downvotes: voteType === "downvote" ? Math.max(0, post.downvotes - 1) : post.downvotes,
      }).eq("id", postId);
    } else {
      if (post.userVote) {
        await supabase.from("reactions").update({ type: voteType }).eq("post_id", postId).eq("user_id", currentUser.id);
        await supabase.from("posts").update({
          upvotes: voteType === "upvote" ? post.upvotes + 1 : Math.max(0, post.upvotes - 1),
          downvotes: voteType === "downvote" ? post.downvotes + 1 : Math.max(0, post.downvotes - 1),
        }).eq("id", postId);
      } else {
        await supabase.from("reactions").upsert({ post_id: postId, user_id: currentUser.id, type: voteType }, { onConflict: "post_id,user_id" });
        await supabase.from("posts").update({
          upvotes: voteType === "upvote" ? post.upvotes + 1 : post.upvotes,
          downvotes: voteType === "downvote" ? post.downvotes + 1 : post.downvotes,
        }).eq("id", postId);
      }
    }
    fetchPosts();
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

  // ===================== CONFESSIONS =====================

  async function fetchConfessions() {
    if (!currentUser) return;
    setConfessionLoading(true);
    let query = supabase
      .from("posts")
      .select("id, user_id, content, images, created_at, school_id, pseudonym, edited_at")
      .eq("type", "confession")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(30);
    if (selectedSchool === "own") query = query.eq("school_id", currentUser.school_id);
    else if (selectedSchool !== "all") query = query.eq("school_id", selectedSchool);
    const { data } = await query;
    if (data) {
      const enriched = await Promise.all(data.map(async (post) => {
        const { data: allReactions } = await supabase.from("reactions").select("type, user_id").eq("post_id", post.id);
        const counts = { love: 0, sad: 0, haha: 0, laban: 0 };
        let userReaction: string | null = null;
        (allReactions || []).forEach((r) => {
          if (r.type in counts) counts[r.type as keyof typeof counts]++;
          if (r.user_id === currentUser.id) userReaction = r.type;
        });
        const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id);
        return { ...post, reactionCounts: counts, userReaction, commentCount: count || 0 };
      }));
      setConfessions(enriched);
      // compute top 3 this week
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thisWeek = enriched.filter(p => p.created_at >= oneWeekAgo);
      const scored = thisWeek.map(p => ({
        ...p,
        score: (p.reactionCounts.laban * 4) + (p.reactionCounts.love * 3) + (p.commentCount * 5),
      })).sort((a, b) => b.score - a.score).slice(0, 3);
      setTopConfessions(scored);
    }
    setConfessionLoading(false);
  }

  async function handleConfessionPost() {
    if (!confessionContent.trim() || !currentUser) return;
    setConfessionPosting(true); setConfessionError("");
    try {
      let imageUrl: string | null = null;
      if (confessionImage) {
        const ext = confessionImage.name.split(".").pop();
        const path = "confession/" + currentUser.id + "/" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
        const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, confessionImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const pseudonym = generatePseudonym(currentUser.id, confessionSeed);
      const { error } = await supabase.from("posts").insert({
        user_id: currentUser.id, school_id: currentUser.school_id, type: "confession",
        content: confessionContent.trim(), tag: null,
        images: imageUrl ? [imageUrl] : null, is_anonymous: true, pseudonym,
        is_flagged: false, is_hidden: false, is_under_review: false,
        upvotes: 0, downvotes: 0, warning_count: 0,
      });
      if (error) throw error;
      setConfessionContent(""); setConfessionImage(null); setConfessionImagePreview("");
      showToast("Confession posted anonymously!"); fetchConfessions();
    } catch (err: unknown) {
      setConfessionError(err instanceof Error ? err.message : "Failed to post. Try again.");
    } finally { setConfessionPosting(false); }
  }

  function handleConfessionImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB"); return; }
    setConfessionImage(file);
    setConfessionImagePreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setShowConfessionPhotoWarning(false);
  }

  async function handleConfessionReact(postId: string, reactionType: string) {
    if (!currentUser) return;
    const confession = confessions.find(c => c.id === postId);
    if (!confession) return;

    // optimistic update
    const prev = { ...confession.reactionCounts };
    const prevUser = confession.userReaction;
    const newCounts = { ...confession.reactionCounts };
    if (prevUser && prevUser in newCounts) newCounts[prevUser as keyof typeof newCounts] = Math.max(0, newCounts[prevUser as keyof typeof newCounts] - 1);
    const isSame = prevUser === reactionType;
    if (!isSame) newCounts[reactionType as keyof typeof newCounts]++;
    setConfessions(cs => cs.map(c => c.id === postId ? { ...c, reactionCounts: newCounts, userReaction: isSame ? null : reactionType } : c));

    try {
      if (isSame) {
        await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
      } else {
        await supabase.from("reactions").upsert({ post_id: postId, user_id: currentUser.id, type: reactionType }, { onConflict: "post_id,user_id" });
      }
    } catch {
      // rollback
      setConfessions(cs => cs.map(c => c.id === postId ? { ...c, reactionCounts: prev, userReaction: prevUser } : c));
    }
  }

  async function handleEditConfession(postId: string) {
    if (!editConfessionContent.trim()) return;
    const { error } = await supabase.from("posts").update({ content: editConfessionContent.trim(), edited_at: new Date().toISOString() }).eq("id", postId);
    if (!error) { setEditingConfession(null); setEditConfessionContent(""); showToast("Confession updated!"); fetchConfessions(); }
  }

  async function handleDeleteConfession(postId: string) {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) { setShowDeleteConfessionConfirm(null); showToast("Confession deleted!"); fetchConfessions(); }
  }

  // ===================== SHARED =====================

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function formatTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  function getNotifIcon(type: string) {
    if (type === "reaction") return "👍";
    if (type === "comment") return "💬";
    if (type === "reply") return "↩️";
    return "🔔";
  }

  // ===================== RENDER =====================

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {toast && (
        <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>
          {toast}
        </div>
      )}

      <AppHeader
        currentUser={currentUser} schools={schools} pageName="SHOUT OUT"
        selectedSchool={selectedSchool} unreadCount={unreadCount}
        onSchoolPickerToggle={() => setShowSchoolPicker(!showSchoolPicker)}
      />

      {showSchoolPicker && <SchoolPicker schools={schools} currentUser={currentUser} selectedSchool={selectedSchool} onSelect={setSelectedSchool} onClose={() => setShowSchoolPicker(false)} />}

      {/* TAB BAR */}
      <div style={{backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", display: "flex"}}>
        <button onClick={() => setActiveTab("soapbox")}
          style={{flex: 1, padding: "12px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
            color: activeTab === "soapbox" ? "#1D9E75" : "#888",
            borderBottom: activeTab === "soapbox" ? "2px solid #1D9E75" : "2px solid transparent"}}>
          📣 Shout Out
        </button>
        <button onClick={() => setActiveTab("confession")}
          style={{flex: 1, padding: "12px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
            color: activeTab === "confession" ? "#1D9E75" : "#888",
            borderBottom: activeTab === "confession" ? "2px solid #1D9E75" : "2px solid transparent"}}>
          💌 Confession Board
        </button>
      </div>

      {/* ===== SOAPBOX TAB ===== */}
      {activeTab === "soapbox" && (
        <>
          <div style={{backgroundColor: "#fff", padding: "12px 16px", borderBottom: "1px solid #F0F0F0"}}>
            <div style={{backgroundColor: "#E1F5EE", borderRadius: "10px", padding: "10px 12px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px"}}>
              <span style={{fontSize: "1rem"}}>🎭</span>
              <div>
                <div style={{fontSize: "0.7rem", color: "#0F6E56", fontWeight: 600}}>You are posting as:</div>
                <div style={{fontSize: "0.82rem", color: "#1D9E75", fontWeight: 700}}>{myPseudonym}</div>
              </div>
            </div>
            <textarea placeholder="What's on your mind today? Share anonymously in any language."
              value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={3}
              style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            {imagePreview && (
              <div style={{position: "relative", display: "inline-block", marginTop: "8px"}}>
                <img src={imagePreview} alt="" style={{width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px"}} />
                <button onClick={() => { setSelectedImage(null); setImagePreview(""); }}
                  style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>✕</button>
              </div>
            )}
            {showPhotoWarning && (
              <div style={{backgroundColor: "#FEF2F2", border: "1px solid #EF4444", borderRadius: "8px", padding: "8px 12px", marginTop: "8px", fontSize: "0.75rem", color: "#EF4444", lineHeight: 1.4}}>
                Photos may reveal your identity. Post with caution.
                <div style={{display: "flex", gap: "8px", marginTop: "8px"}}>
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>I Understand, Add Photo</button>
                  <button onClick={() => setShowPhotoWarning(false)}
                    style={{backgroundColor: "#F7F7F7", color: "#888", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap"}}>

            </div>
            {postError && <div style={{color: "#EF4444", fontSize: "0.75rem", marginTop: "6px"}}>{postError}</div>}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px"}}>
              <button onClick={() => !selectedImage && setShowPhotoWarning(true)}
                style={{background: "none", border: "none", cursor: "pointer", padding: "0", opacity: selectedImage ? 0.4 : 1}}>
                <Image src="/photos.png" alt="photos" width={22} height={22} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleImageSelect} />
              <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                <button onClick={() => setShowSoapboxEmoji(!showSoapboxEmoji)}
                  style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "4px", opacity: 0.6}}>
                  😊
                </button>
                <button onClick={handlePost} disabled={posting || !postContent.trim()}
                  style={{backgroundColor: posting || !postContent.trim() ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontWeight: 700, fontSize: "0.8rem", cursor: posting || !postContent.trim() ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
            {showSoapboxEmoji && (
              <EmojiPicker
                onSelect={(emoji) => { setPostContent(prev => prev + emoji); setShowSoapboxEmoji(false); }}
                onClose={() => setShowSoapboxEmoji(false)}
              />
            )}
          </div>

          <div style={{flex: 1, paddingBottom: "80px"}}>
            {loading ? (
              <div style={{textAlign: "center", padding: "48px 16px", color: "#888"}}>
                <div style={{fontSize: "2rem", marginBottom: "8px"}}>⏳</div>
                <div style={{fontSize: "0.85rem"}}>Loading posts...</div>
              </div>
            ) : posts.length === 0 ? (
              <div style={{textAlign: "center", padding: "48px 16px"}}>
                <div style={{fontSize: "3rem", marginBottom: "12px"}}>🎭</div>
                <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem", marginBottom: "6px"}}>No shoutouts yet!</div>
                <div style={{color: "#888", fontSize: "0.8rem"}}>Be the first to vent. Anonymous ka, promise!</div>
              </div>
            ) : posts.map(post => (
              <div key={post.id} style={{backgroundColor: "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0"}}>
                <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
                  <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0}}>🎭</div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A"}}>{post.pseudonym}</div>
                    <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px"}}>
                      {formatTime(post.created_at)}
                      {post.edited_at && <span style={{marginLeft: "6px", color: "#aaa", fontSize: "0.68rem", fontStyle: "italic"}}>· Edited</span>}

                    </div>
                  </div>
                  {currentUser?.id === post.user_id && (
                    <button onClick={() => setShowMenu(showMenu === post.id ? null : post.id)}
                      style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem", padding: "4px"}}>•••</button>
                  )}
                </div>
                <div style={{padding: "0 16px 10px", fontSize: "0.9rem", color: "#1A1A1A", lineHeight: 1.5}}>{post.content}</div>
                {post.images && post.images.length > 0 && (
                  <div style={{marginBottom: "8px"}}>
                    <img src={post.images[0]} alt="" style={{width: "100%", maxHeight: "300px", objectFit: "cover"}} />
                  </div>
                )}
                <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 16px"}}></div>
                <div style={{display: "flex", padding: "6px 12px", alignItems: "center", gap: "8px"}}>
                  <button onClick={() => handleVote(post.id, "upvote")}
                    style={{background: post.userVote === "upvote" ? "#E1F5EE" : "none", border: "1px solid " + (post.userVote === "upvote" ? "#1D9E75" : "#F0F0F0"), borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                    <span style={{fontSize: "0.9rem", color: post.userVote === "upvote" ? "#1D9E75" : "#888"}}>▲</span>
                    <span style={{fontSize: "0.8rem", fontWeight: 700, color: post.userVote === "upvote" ? "#1D9E75" : "#888"}}>{post.upvotes}</span>
                  </button>
                  <button onClick={() => handleVote(post.id, "downvote")}
                    style={{background: post.userVote === "downvote" ? "#FEF2F2" : "none", border: "1px solid " + (post.userVote === "downvote" ? "#EF4444" : "#F0F0F0"), borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                    <span style={{fontSize: "0.9rem", color: post.userVote === "downvote" ? "#EF4444" : "#888"}}>▼</span>
                    <span style={{fontSize: "0.8rem", fontWeight: 700, color: post.userVote === "downvote" ? "#EF4444" : "#888"}}>{post.downvotes}</span>
                  </button>
                  <button onClick={() => router.push("/soapbox/" + post.id)}
                    style={{background: "none", border: "1px solid #F0F0F0", borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                    <Image src="/comment.png" alt="comment" width={16} height={16} />
                    <span style={{fontSize: "0.8rem", color: "#888", fontWeight: 600}}>{post.commentCount || 0}</span>
                  </button>
                  <button style={{background: "none", border: "1px solid #F0F0F0", borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                    <Image src="/share.png" alt="share" width={16} height={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== CONFESSION TAB ===== */}
      {activeTab === "confession" && (
        <>
          <div style={{backgroundColor: "#fff", padding: "12px 16px", borderBottom: "1px solid #F0F0F0"}}>
            <div style={{backgroundColor: "#E1F5EE", borderRadius: "10px", padding: "10px 12px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px"}}>
              <span style={{fontSize: "1rem"}}>💌</span>
              <div>
                <div style={{fontSize: "0.7rem", color: "#0F6E56", fontWeight: 600}}>You are confessing as:</div>
                <div style={{fontSize: "0.82rem", color: "#1D9E75", fontWeight: 700}}>{myConfessionPseudonym}</div>
              </div>
            </div>
            <textarea placeholder="Want to confess your feelings? Your identity stays anonymous."
              value={confessionContent} onChange={(e) => setConfessionContent(e.target.value)} rows={3}
              style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            {confessionImagePreview && (
              <div style={{position: "relative", display: "inline-block", marginTop: "8px"}}>
                <img src={confessionImagePreview} alt="" style={{width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px"}} />
                <button onClick={() => { setConfessionImage(null); setConfessionImagePreview(""); }}
                  style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>✕</button>
              </div>
            )}
            {showConfessionPhotoWarning && (
              <div style={{backgroundColor: "#FEF2F2", border: "1px solid #EF4444", borderRadius: "8px", padding: "8px 12px", marginTop: "8px", fontSize: "0.75rem", color: "#EF4444", lineHeight: 1.4}}>
                Photos may reveal your identity. Post with caution.
                <div style={{display: "flex", gap: "8px", marginTop: "8px"}}>
                  <button onClick={() => confessionFileInputRef.current?.click()}
                    style={{backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>I Understand, Add Photo</button>
                  <button onClick={() => setShowConfessionPhotoWarning(false)}
                    style={{backgroundColor: "#F7F7F7", color: "#888", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                </div>
              </div>
            )}
            {confessionError && <div style={{color: "#EF4444", fontSize: "0.75rem", marginTop: "6px"}}>{confessionError}</div>}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px"}}>
              <button onClick={() => !confessionImage && setShowConfessionPhotoWarning(true)}
                style={{background: "none", border: "none", cursor: "pointer", padding: "0", opacity: confessionImage ? 0.4 : 1}}>
                <Image src="/photos.png" alt="photos" width={22} height={22} />
              </button>
              <input ref={confessionFileInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleConfessionImageSelect} />
              <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                <button onClick={() => setShowConfessionEmoji(!showConfessionEmoji)}
                  style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "4px", opacity: 0.6}}>
                  😊
                </button>
                <button onClick={handleConfessionPost} disabled={confessionPosting || !confessionContent.trim()}
                  style={{backgroundColor: confessionPosting || !confessionContent.trim() ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontWeight: 700, fontSize: "0.8rem", cursor: confessionPosting || !confessionContent.trim() ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                  {confessionPosting ? "Posting..." : "Confess"}
                </button>
              </div>
            </div>
            {showConfessionEmoji && (
              <EmojiPicker
                onSelect={(emoji) => { setConfessionContent(prev => prev + emoji); setShowConfessionEmoji(false); }}
                onClose={() => setShowConfessionEmoji(false)}
              />
            )}
          </div>

          <div style={{flex: 1, paddingBottom: "80px"}}>

            {/* TOP CONFESSIONS THIS WEEK */}
            {topConfessions.length > 0 && (
              <div style={{backgroundColor: "#fff", marginBottom: "8px", padding: "14px 16px", borderBottom: "1px solid #F0F0F0"}}>
                <div style={{display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px"}}>
                  <span style={{fontSize: "1rem"}}>🔥</span>
                  <span style={{fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A"}}>Top Confessions This Week</span>
                </div>
                {topConfessions.map((c, idx) => (
                  <div key={c.id} onClick={() => router.push("/soapbox/" + c.id)}
                    style={{display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: idx < topConfessions.length - 1 ? "12px" : 0, cursor: "pointer"}}>
                    <div style={{width: "24px", height: "24px", borderRadius: "50%", backgroundColor: idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : "#CD7F32", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#fff", flexShrink: 0}}>
                      {idx + 1}
                    </div>
                    <div style={{flex: 1}}>
                      <div style={{fontSize: "0.82rem", color: "#1A1A1A", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"}}>{c.content}</div>
                      <div style={{display: "flex", gap: "8px", marginTop: "4px"}}>
                        <span style={{fontSize: "0.68rem", color: "#888"}}>{c.reactionCounts.laban} Laban</span>
                        <span style={{fontSize: "0.68rem", color: "#888"}}>{c.reactionCounts.love} Love</span>
                        <span style={{fontSize: "0.68rem", color: "#888"}}>{c.commentCount} comments</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {confessionLoading ? (
              <div style={{textAlign: "center", padding: "48px 16px", color: "#888"}}>
                <div style={{fontSize: "2rem", marginBottom: "8px"}}>⏳</div>
                <div style={{fontSize: "0.85rem"}}>Loading confessions...</div>
              </div>
            ) : confessions.length === 0 ? (
              <div style={{textAlign: "center", padding: "48px 16px"}}>
                <div style={{fontSize: "3rem", marginBottom: "12px"}}>💌</div>
                <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem", marginBottom: "6px"}}>No confessions yet!</div>
                <div style={{color: "#888", fontSize: "0.8rem"}}>Be the first to share. Safe ka diri, promise.</div>
              </div>
            ) : confessions.map(confession => (
              <div key={confession.id} style={{backgroundColor: "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0"}}>
                <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
                  <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#4A1D6F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0}}>💌</div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A"}}>{confession.pseudonym}</div>
                    <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px"}}>
                      {formatTime(confession.created_at)}
                      {confession.edited_at && <span style={{marginLeft: "6px", color: "#aaa", fontSize: "0.68rem", fontStyle: "italic"}}>· Edited</span>}
                    </div>
                  </div>
                  {currentUser?.id === confession.user_id && (
                    <button onClick={() => setConfessionMenu(confessionMenu === confession.id ? null : confession.id)}
                      style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem", padding: "4px"}}>•••</button>
                  )}
                </div>
                <div style={{padding: "0 16px 10px", fontSize: "0.9rem", color: "#1A1A1A", lineHeight: 1.5}}>{confession.content}</div>
                {confession.images && confession.images.length > 0 && (
                  <div style={{marginBottom: "8px"}}>
                    <img src={confession.images[0]} alt="" style={{width: "100%", maxHeight: "300px", objectFit: "contain"}} />
                  </div>
                )}

                <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 16px"}}></div>
                <div style={{display: "flex", padding: "6px 12px", alignItems: "center", gap: "8px", position: "relative"}}>
                  <ReactionButton
                    postId={confession.id}
                    userReaction={confession.userReaction || null}
                    reactionCounts={confession.reactionCounts as Record<string, number>}
                    reactions={REACTION_SET}
                    onReact={handleConfessionReact}
                  />

                  <button onClick={() => router.push("/soapbox/" + confession.id)}
                    style={{background: "none", border: "1px solid #F0F0F0", borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                    <Image src="/comment.png" alt="comment" width={16} height={16} />
                    <span style={{fontSize: "0.8rem", color: "#888", fontWeight: 600}}>{confession.commentCount}</span>
                  </button>
                  <button style={{background: "none", border: "1px solid #F0F0F0", borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                    <Image src="/share.png" alt="share" width={16} height={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* BOTTOM NAV */}
      <BottomNav active="/soapbox" />

      {/* SOAPBOX MODALS */}
      {showMenu && (
        <>
          <div onClick={() => setShowMenu(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
            <button onClick={() => { const p = posts.find(p => p.id === showMenu); if (p) { setEditingPost(p.id); setEditContent(p.content); } setShowMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1A1A1A"}}>
              Edit Post
            </button>
            <button onClick={() => { setShowDeleteConfirm(showMenu); setShowMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
              Delete Post
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

      {/* CONFESSION MODALS */}
      {confessionMenu && (
        <>
          <div onClick={() => setConfessionMenu(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
            <button onClick={() => { const c = confessions.find(c => c.id === confessionMenu); if (c) { setEditingConfession(c.id); setEditConfessionContent(c.content); } setConfessionMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1A1A1A"}}>
              Edit Confession
            </button>
            <button onClick={() => { setShowDeleteConfessionConfirm(confessionMenu); setConfessionMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
              Delete Confession
            </button>
          </div>
        </>
      )}
      {editingConfession && (
        <>
          <div onClick={() => setEditingConfession(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "16px 16px 32px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto 16px"}}></div>
            <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A", marginBottom: "12px"}}>Edit Confession</div>
            <textarea value={editConfessionContent} onChange={e => setEditConfessionContent(e.target.value)} rows={4}
              style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            <div style={{display: "flex", gap: "10px", marginTop: "12px", justifyContent: "flex-end"}}>
              <button onClick={() => setEditingConfession(null)} style={{padding: "9px 20px", borderRadius: "20px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={() => handleEditConfession(editingConfession)} style={{padding: "9px 20px", borderRadius: "20px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>Save</button>
            </div>
          </div>
        </>
      )}
      {showDeleteConfessionConfirm && (
        <>
          <div onClick={() => setShowDeleteConfessionConfirm(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "24px 16px 32px"}}>
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "8px", textAlign: "center"}}>Delete Confession?</div>
            <div style={{fontSize: "0.85rem", color: "#888", textAlign: "center", marginBottom: "20px"}}>This cannot be undone.</div>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowDeleteConfessionConfirm(null)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={() => handleDeleteConfession(showDeleteConfessionConfirm)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Delete</button>
            </div>
          </div>
        </>
      )}



    </div>
  );
}
