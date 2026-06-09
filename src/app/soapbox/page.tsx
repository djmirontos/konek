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

function getTrustLevel(xp: number | undefined | null) {
  if (!xp || xp < 100) return null;
  if (xp >= 1000) return { label: "Legend",  emoji: "👑", bg: "#FAEEDA", color: "#633806" };
  if (xp >= 500)  return { label: "Trusted",  emoji: "⭐", bg: "#E6F1FB", color: "#185FA5" };
  return { label: "Regular", emoji: "🌿", bg: "#EAF3DE", color: "#3B6D11" };
}

const MOODS = [
  { emoji: "😊", label: "Happy",        value: "happy",        bg: "#EAF3DE", color: "#3B6D11" },
  { emoji: "😤", label: "Frustrated",   value: "frustrated",   bg: "#FAECE7", color: "#712B13" },
  { emoji: "💭", label: "Overthinking", value: "overthinking", bg: "#EEEDFE", color: "#3C3489" },
  { emoji: "😰", label: "Stressed",     value: "stressed",     bg: "#FAEEDA", color: "#633806" },
  { emoji: "🤩", label: "Excited",      value: "excited",      bg: "#E6F1FB", color: "#0C447C" },
  { emoji: "🥺", label: "Sad",          value: "sad",          bg: "#FBEAF0", color: "#72243E" },
  { emoji: "🤯", label: "Overwhelmed",  value: "overwhelmed",  bg: "#FCEBEB", color: "#791F1F" },
  { emoji: "🤔", label: "Curious",      value: "curious",      bg: "#E1F5EE", color: "#085041" },
  { emoji: "🙏", label: "Grateful",     value: "grateful",     bg: "#EEEDFE", color: "#3C3489" },
  { emoji: "😴", label: "Tired",        value: "tired",        bg: "#F1EFE8", color: "#444441" },
];

function getMood(value: string | null | undefined) {
  if (!value) return null;
  return MOODS.find(m => m.value === value) || null;
}

// Pseudonym words loaded from DB — see fetchPseudonymWords()
let ADJECTIVES: string[] = [];
let NOUNS: string[] = [];

function generatePseudonym(userId: string, postSeed: string): string {
  if (ADJECTIVES.length === 0 || NOUNS.length === 0) return "Anonymous";
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
  trust_xp?: number | null;
  mood?: string | null;
};
type ConfessionPost = {
  id: string; user_id: string; content: string;
  images: string[] | null; created_at: string; school_id: string;
  pseudonym: string | null;
  reactionCounts: { love: number; sad: number; haha: number; laban: number };
  userReaction: string | null;
  commentCount: number;
  edited_at?: string | null;
  mood?: string | null;
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

  const [activeTab, setActiveTab] = useState<"soapbox" | "confession">("soapbox");
  const [pseudonymWordsLoaded, setPseudonymWordsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const { selectedSchool, setSelectedSchool } = useSchool();
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toast, setToast] = useState("");

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
  const [showComposerSheet, setShowComposerSheet] = useState(false);
  const [showConfessionSheet, setShowConfessionSheet] = useState(false);

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedConfessionMood, setSelectedConfessionMood] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [confessionMoodFilter, setConfessionMoodFilter] = useState<string | null>(null);

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
        // Only generate pseudonym if words are loaded
        if (pseudonymWordsLoaded) {
          setMyPseudonym(generatePseudonym(currentUser.id, postSeed));
        }
      } else {
        fetchConfessions();
        // Only generate pseudonym if words are loaded
        if (pseudonymWordsLoaded) {
          setMyConfessionPseudonym(generatePseudonym(currentUser.id, confessionSeed));
        }
      }
    }
  }, [currentUser, selectedSchool, activeTab, pseudonymWordsLoaded]);

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
    fetchPseudonymWords(userData?.id);
    fetchUnreadCount(userData);
  }

  async function fetchUnreadCount(user: User | null) {
    if (!user) return;
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("is_read", false);
    setUnreadCount(count || 0);
  }

  async function fetchPseudonymWords(userId?: string) {
    const { data } = await supabase
      .from("pseudonym_words")
      .select("word, type")
      .eq("is_active", true)
      .order("word");
    if (data) {
      ADJECTIVES = data.filter((w: any) => w.type === "adjective").map((w: any) => w.word);
      NOUNS = data.filter((w: any) => w.type === "noun").map((w: any) => w.word);
      setPseudonymWordsLoaded(true);
      // Now generate pseudonyms with loaded words
      if (userId) {
        setMyPseudonym(generatePseudonym(userId, postSeed));
        setMyConfessionPseudonym(generatePseudonym(userId, confessionSeed));
      }
    }
  }

  async function fetchPosts() {
    if (!currentUser) return;
    setLoading(true);
    const schoolId = selectedSchool === "all" ? null : selectedSchool === "own" ? currentUser.school_id : selectedSchool;
    const { data, error } = await supabase.rpc("get_soapbox_posts", {
      p_school_id: schoolId,
      p_user_id: currentUser.id,
      p_limit: 30,
      p_offset: 0
    });
    if (data) {
      const enriched = data.map((row: any) => ({
        id: row.id, user_id: row.user_id, content: row.content,
        tag: row.tag, images: row.images, created_at: row.created_at,
        edited_at: row.edited_at, school_id: row.school_id,
        pseudonym: row.pseudonym, upvotes: row.upvotes, downvotes: row.downvotes,
        mood: row.mood, commentCount: Number(row.comment_count),
        userVote: row.user_vote || null
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
        user_id: currentUser.id, school_id: (selectedSchool === "all" || selectedSchool === "own") ? currentUser.school_id : selectedSchool, type: "soapbox",
        content: postContent.trim(), tag: null,
        images: imageUrl ? [imageUrl] : null, is_anonymous: true, pseudonym,
        is_flagged: false, is_hidden: false, is_under_review: false,
        upvotes: 0, downvotes: 0, warning_count: 0,
        mood: selectedMood,
      });
      if (error) throw error;
      setPostContent(""); setSelectedImage(null); setImagePreview(""); setSelectedMood(null); setShowComposerSheet(false);
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

  async function fetchConfessions() {
    if (!currentUser) return;
    setConfessionLoading(true);
    const schoolId = selectedSchool === "all" ? null : selectedSchool === "own" ? currentUser.school_id : selectedSchool;
    const { data } = await supabase.rpc("get_confession_posts", {
      p_school_id: schoolId,
      p_user_id: currentUser.id,
      p_limit: 30,
      p_offset: 0
    });
    if (data) {
      const enriched = data.map((row: any) => ({
        id: row.id, user_id: row.user_id, content: row.content,
        images: row.images, created_at: row.created_at,
        edited_at: row.edited_at, school_id: row.school_id,
        pseudonym: row.pseudonym, mood: row.mood,
        commentCount: Number(row.comment_count),
        reactionCounts: {
          love: Number(row.love_count),
          sad: Number(row.sad_count),
          haha: Number(row.haha_count),
          laban: Number(row.laban_count)
        },
        userReaction: row.user_reaction || null
      }));
      setConfessions(enriched);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thisWeek = enriched.filter((p: any) => p.created_at >= oneWeekAgo);
      const scored = thisWeek.map((p: any) => ({
        ...p,
        score: (p.reactionCounts.laban * 4) + (p.reactionCounts.love * 3) + (p.commentCount * 5),
      })).sort((a: any, b: any) => b.score - a.score).slice(0, 3);
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
        user_id: currentUser.id, school_id: (selectedSchool === "all" || selectedSchool === "own") ? currentUser.school_id : selectedSchool, type: "confession",
        content: confessionContent.trim(), tag: null,
        images: imageUrl ? [imageUrl] : null, is_anonymous: true, pseudonym,
        is_flagged: false, is_hidden: false, is_under_review: false,
        upvotes: 0, downvotes: 0, warning_count: 0,
        mood: selectedConfessionMood,
      });
      if (error) throw error;
      setConfessionContent(""); setConfessionImage(null); setConfessionImagePreview(""); setSelectedConfessionMood(null); setShowConfessionSheet(false);
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

  const filteredPosts = moodFilter ? posts.filter(p => p.mood === moodFilter) : posts;
  const filteredConfessions = confessionMoodFilter ? confessions.filter(c => c.mood === confessionMoodFilter) : confessions;

  return (
    <div style={{minHeight: "100vh", background: "#F0F2F5", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {toast && (
        <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>
          {toast}
        </div>
      )}

      <AppHeader
        currentUser={currentUser} schools={schools} 
        selectedSchool={selectedSchool} unreadCount={unreadCount}
        onSchoolPickerToggle={() => setShowSchoolPicker(!showSchoolPicker)}
      />

      {showSchoolPicker && <SchoolPicker schools={schools} currentUser={currentUser} selectedSchool={selectedSchool} onSelect={setSelectedSchool} onClose={() => setShowSchoolPicker(false)} />}

      <div style={{backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", display: "flex"}}>
        <button onClick={() => setActiveTab("soapbox")}
          style={{flex: 1, padding: "12px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
            color: activeTab === "soapbox" ? "#2BB39A" : "#888",
            borderBottom: activeTab === "soapbox" ? "2px solid #2BB39A" : "2px solid transparent"}}>
          📣 Shout Out
        </button>
        <button onClick={() => setActiveTab("confession")}
          style={{flex: 1, padding: "12px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
            color: activeTab === "confession" ? "#2BB39A" : "#888",
            borderBottom: activeTab === "confession" ? "2px solid #2BB39A" : "2px solid transparent"}}>
          💌 Confession Board
        </button>
      </div>

      {activeTab === "soapbox" && (
        <>
          {/* COLLAPSED COMPOSER ROW */}
          <div style={{backgroundColor: "#fff", padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)"}}>
            <img src="/icon/anonymous.png" alt="anonymous" style={{width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
            <div onClick={() => setShowComposerSheet(true)}
              style={{flex: 1, backgroundColor: "#F7F7F7", borderRadius: "24px", padding: "10px 16px", fontSize: "0.875rem", color: "#aaa", cursor: "pointer", userSelect: "none", border: "1.5px solid #E8F8F5", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)"}}>
              What's on your mind?
            </div>
          </div>

          {/* COMPOSER BOTTOM SHEET */}
          {showComposerSheet && (
            <>
              <div onClick={() => { setShowComposerSheet(false); setPostContent(""); setSelectedMood(null); setSelectedImage(null); setImagePreview(""); setPostError(""); }}
                style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 400}} />
              <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, maxHeight: "90vh", overflowY: "auto"}}>
                {/* Drag handle */}
                <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 0"}} />
                {/* Sheet header */}
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 10px"}}>
                  <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A"}}>Create Post</div>
                  <button onClick={() => { setShowComposerSheet(false); setPostContent(""); setSelectedMood(null); setSelectedImage(null); setImagePreview(""); setPostError(""); }}
                    style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#888", padding: "4px", lineHeight: 1}}>✕</button>
                </div>
                {/* User identity row */}
                <div style={{display: "flex", alignItems: "center", gap: "10px", padding: "0 16px 12px"}}>
                  {currentUser?.avatar_url
                    ? <img src={currentUser.avatar_url} alt="" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                    : <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#2BB39A", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
                  }
                  <div>
                    <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A"}}>{currentUser?.full_name}</div>
                    <div style={{fontSize: "0.72rem", color: "#2BB39A", fontWeight: 500}}>Posting as {myPseudonym}</div>
                  </div>
                </div>
                {/* Text area */}
                <div style={{padding: "0 16px 12px"}}>
                  <textarea placeholder="What's on your mind? Share anonymously in any language."
                    value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={4} autoFocus
                    style={{width: "100%", border: "none", backgroundColor: "transparent", fontSize: "0.95rem", color: "#1A1A1A", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box", lineHeight: 1.6}} />
                  {imagePreview && (
                    <div style={{position: "relative", display: "inline-block", marginTop: "4px"}}>
                      <img src={imagePreview} alt="" style={{width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px"}} />
                      <button onClick={() => { setSelectedImage(null); setImagePreview(""); }}
                        style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>✕</button>
                    </div>
                  )}
                  {postError && <div style={{color: "#EF4444", fontSize: "0.75rem", marginTop: "6px"}}>{postError}</div>}
                </div>
                {/* Mood grid */}
                <div style={{padding: "0 16px 14px"}}>
                  <div style={{fontSize: "0.72rem", color: "#888", fontWeight: 600, marginBottom: "8px"}}>How are you feeling? <span style={{fontWeight: 400, color: "#bbb"}}>(optional)</span></div>
                  <div style={{display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px"}}>
                    {MOODS.map(mood => (
                      <button key={mood.value} onClick={() => setSelectedMood(selectedMood === mood.value ? null : mood.value)}
                        style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "8px 4px",
                          borderRadius: "10px",
                          border: selectedMood === mood.value ? "1px solid #1a8a4a" : "0.5px solid #F0F0F0",
                          backgroundColor: selectedMood === mood.value ? "#EAF3DE" : "#F7F7F7",
                          cursor: "pointer", fontFamily: "inherit"}}>
                        <span style={{fontSize: "1.1rem"}}>{mood.emoji}</span>
                        <span style={{fontSize: "0.62rem", color: selectedMood === mood.value ? "#3B6D11" : "#aaa", fontWeight: selectedMood === mood.value ? 500 : 400, textAlign: "center", lineHeight: 1.2}}>{mood.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Sheet footer */}
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px 32px", borderTop: "1px solid #F0F0F0"}}>
                  <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                    <button onClick={() => !selectedImage && setShowPhotoWarning(true)}
                      style={{background: "none", border: "none", cursor: "pointer", padding: "0", opacity: selectedImage ? 0.4 : 1}}>
                      <Image src="/photos.png" alt="photos" width={22} height={22} />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleImageSelect} />
                  </div>
                  <button onClick={async () => { await handlePost(); if (!postError) setShowComposerSheet(false); }} disabled={posting || !postContent.trim()}
                    style={{backgroundColor: posting || !postContent.trim() ? "#ccc" : "#2BB39A", color: "#fff", border: "none", borderRadius: "20px", padding: "9px 24px", fontWeight: 700, fontSize: "0.85rem", cursor: posting || !postContent.trim() ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                    {posting ? "Posting..." : "Post"}
                  </button>
                </div>
                {showPhotoWarning && (
                  <div style={{margin: "0 16px 16px", backgroundColor: "#FEF2F2", border: "1px solid #EF4444", borderRadius: "8px", padding: "8px 12px", fontSize: "0.75rem", color: "#EF4444", lineHeight: 1.4}}>
                    Photos may reveal your identity. Post with caution.
                    <div style={{display: "flex", gap: "8px", marginTop: "8px"}}>
                      <button onClick={() => fileInputRef.current?.click()}
                        style={{backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>I Understand, Add Photo</button>
                      <button onClick={() => setShowPhotoWarning(false)}
                        style={{backgroundColor: "#F7F7F7", color: "#888", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", padding: "10px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none"}}>
              <button onClick={() => setMoodFilter(null)}
                style={{flexShrink: 0, padding: "5px 14px", borderRadius: "20px", border: "1px solid " + (moodFilter === null ? "#2BB39A" : "#E8F8F5"),
                  backgroundColor: moodFilter === null ? "#E1F5EE" : "#F0FAF6", color: moodFilter === null ? "#0F6E56" : "#2BB39A",
                  fontWeight: moodFilter === null ? 700 : 500, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: moodFilter === null ? 1 : 0.75}}>
                All
              </button>
              {MOODS.map(mood => (
                <button key={mood.value} onClick={() => setMoodFilter(moodFilter === mood.value ? null : mood.value)}
                  style={{flexShrink: 0, padding: "5px 12px", borderRadius: "20px",
                    border: "1px solid " + (moodFilter === mood.value ? mood.color : "#F0F0F0"),
                    backgroundColor: moodFilter === mood.value ? mood.bg : "#F7F7F7",
                    color: moodFilter === mood.value ? mood.color : "#888",
                    fontWeight: moodFilter === mood.value ? 700 : 400,
                    fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
                  {mood.emoji} {mood.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{flex: 1, paddingBottom: "80px"}}>
            {loading ? (
              <div>
                <style>{`@keyframes shimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } }`}</style>
                {[1,2,3].map(i => (
                  <div key={i} style={{backgroundColor: "#fff", marginBottom: "10px", borderRadius: "14px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden", margin: "0 8px 10px", padding: "14px 16px"}}>
                    <div style={{display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px"}}>
                      <div style={{width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", flexShrink: 0}} />
                      <div style={{flex: 1}}>
                        <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "6px", width: "40%"}} />
                        <div style={{height: "10px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", width: "25%"}} />
                      </div>
                    </div>
                    <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "6px"}} />
                    <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", width: "75%"}} />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div style={{textAlign: "center", padding: "56px 24px"}}>
                <div style={{fontSize: "4rem", marginBottom: "16px", lineHeight: 1}}>🎭</div>
                <div style={{fontWeight: 800, color: "#1A1A1A", fontSize: "1.1rem", marginBottom: "8px"}}>
                  {moodFilter ? "No " + (getMood(moodFilter)?.label || "") + " posts yet!" : "No shoutouts yet!"}
                </div>
                <div style={{color: "#888", fontSize: "0.8rem"}}>
                  {moodFilter ? "Try a different mood filter." : "Be the first to vent. Anonymous ka, promise!"}
                </div>
              </div>
            ) : filteredPosts.map(post => {
              const mood = getMood(post.mood);
              return (
                <div key={post.id} style={{backgroundColor: "#fff", marginBottom: "10px", borderRadius: "14px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden", margin: "0 8px 10px"}}>
                  <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
                    <img src="/icon/anonymous.png" alt="anonymous" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.1)"}} />
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#2BB39A"}}>{post.pseudonym}</div>
                      <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap"}}>
                        {formatTime(post.created_at)}
                        {post.edited_at && <span style={{color: "#aaa", fontSize: "0.68rem", fontStyle: "italic"}}>· Edited</span>}
                        {post.school_id !== currentUser?.school_id && (() => { const s = schools.find(s => s.id === post.school_id); return s ? <span style={{display: "inline-flex", alignItems: "center", gap: "2px", backgroundColor: "#E8F8F5", color: "#2BB39A", fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: "8px"}}>🏫 {s.abbreviation}</span> : null; })()}
                        {mood && (
                          <span style={{display: "inline-flex", alignItems: "center", gap: "3px", backgroundColor: mood.bg, color: mood.color, fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: "10px"}}>
                            {mood.emoji} feeling {mood.label.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    {currentUser?.id === post.user_id && (
                      <button onClick={() => setShowMenu(showMenu === post.id ? null : post.id)}
                        style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem", padding: "4px"}}>•••</button>
                    )}
                  </div>
                  <div style={{padding: "0 16px 12px", fontSize: "0.92rem", color: "#1A1A1A", lineHeight: 1.6}}>{post.content}</div>
                  {post.images && post.images.length > 0 && (
                    <div style={{marginBottom: "8px"}}>
                      <img src={post.images[0]} alt="" loading="lazy" style={{width: "100%", maxHeight: "300px", objectFit: "cover"}} />
                    </div>
                  )}
                  <div style={{height: "1px", backgroundColor: "#F5F5F5", margin: "0 12px"}}></div>
                  <div style={{display: "flex", padding: "8px 12px", alignItems: "center", gap: "8px"}}>
                    <button onClick={() => handleVote(post.id, "upvote")}
                      style={{background: post.userVote === "upvote" ? "#E1F5EE" : "none", border: "1px solid " + (post.userVote === "upvote" ? "#2BB39A" : "#F0F0F0"), borderRadius: "20px", cursor: "pointer", padding: "5px 12px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                      <span style={{fontSize: "0.9rem", color: post.userVote === "upvote" ? "#2BB39A" : "#888"}}>▲</span>
                      <span style={{fontSize: "0.8rem", fontWeight: 700, color: post.userVote === "upvote" ? "#2BB39A" : "#888"}}>{post.upvotes}</span>
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
              );
            })}
          </div>
        </>
      )}

      {activeTab === "confession" && (
        <>
          {/* COLLAPSED CONFESSION COMPOSER ROW */}
          <div style={{backgroundColor: "#fff", padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)"}}>
            <img src="/icon/confess.png" alt="confession" style={{width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
            <div onClick={() => setShowConfessionSheet(true)}
              style={{flex: 1, backgroundColor: "#F7F7F7", borderRadius: "24px", padding: "10px 16px", fontSize: "0.875rem", color: "#aaa", cursor: "pointer", userSelect: "none", border: "1.5px solid #E8F8F5", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)"}}>
              Want to confess something?
            </div>
          </div>

          {/* CONFESSION BOTTOM SHEET */}
          {showConfessionSheet && (
            <>
              <div onClick={() => { setShowConfessionSheet(false); setConfessionContent(""); setSelectedConfessionMood(null); setConfessionImage(null); setConfessionImagePreview(""); setConfessionError(""); }}
                style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", zIndex: 400}} />
              <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, maxHeight: "90vh", overflowY: "auto"}}>
                <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 0"}} />
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 10px"}}>
                  <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A"}}>New Confession</div>
                  <button onClick={() => { setShowConfessionSheet(false); setConfessionContent(""); setSelectedConfessionMood(null); setConfessionImage(null); setConfessionImagePreview(""); setConfessionError(""); }}
                    style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#888", padding: "4px", lineHeight: 1}}>✕</button>
                </div>
                <div style={{display: "flex", alignItems: "center", gap: "10px", padding: "0 16px 12px"}}>
                  {currentUser?.avatar_url
                    ? <img src={currentUser.avatar_url} alt="" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                    : <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#2BB39A", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
                  }
                  <div>
                    <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A"}}>{currentUser?.full_name}</div>
                    <div style={{fontSize: "0.72rem", color: "#2BB39A", fontWeight: 500}}>Confessing as {myConfessionPseudonym}</div>
                  </div>
                </div>
                <div style={{padding: "0 16px 12px"}}>
                  <textarea placeholder="Want to confess your feelings? Your identity stays anonymous."
                    value={confessionContent} onChange={(e) => setConfessionContent(e.target.value)} rows={4} autoFocus
                    style={{width: "100%", border: "none", backgroundColor: "transparent", fontSize: "0.95rem", color: "#1A1A1A", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box", lineHeight: 1.6}} />
                  {confessionImagePreview && (
                    <div style={{position: "relative", display: "inline-block", marginTop: "4px"}}>
                      <img src={confessionImagePreview} alt="" style={{width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px"}} />
                      <button onClick={() => { setConfessionImage(null); setConfessionImagePreview(""); }}
                        style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>✕</button>
                    </div>
                  )}
                  {confessionError && <div style={{color: "#EF4444", fontSize: "0.75rem", marginTop: "6px"}}>{confessionError}</div>}
                </div>
                <div style={{padding: "0 16px 14px"}}>
                  <div style={{fontSize: "0.72rem", color: "#888", fontWeight: 600, marginBottom: "8px"}}>How are you feeling? <span style={{fontWeight: 400, color: "#bbb"}}>(optional)</span></div>
                  <div style={{display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px"}}>
                    {MOODS.map(mood => (
                      <button key={mood.value} onClick={() => setSelectedConfessionMood(selectedConfessionMood === mood.value ? null : mood.value)}
                        style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "8px 4px",
                          borderRadius: "10px",
                          border: selectedConfessionMood === mood.value ? "1px solid #1a8a4a" : "0.5px solid #F0F0F0",
                          backgroundColor: selectedConfessionMood === mood.value ? "#EAF3DE" : "#F7F7F7",
                          cursor: "pointer", fontFamily: "inherit"}}>
                        <span style={{fontSize: "1.1rem"}}>{mood.emoji}</span>
                        <span style={{fontSize: "0.62rem", color: selectedConfessionMood === mood.value ? "#3B6D11" : "#aaa", fontWeight: selectedConfessionMood === mood.value ? 500 : 400, textAlign: "center", lineHeight: 1.2}}>{mood.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px 32px", borderTop: "1px solid #F0F0F0"}}>
                  <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                    <button onClick={() => !confessionImage && setShowConfessionPhotoWarning(true)}
                      style={{background: "none", border: "none", cursor: "pointer", padding: "0", opacity: confessionImage ? 0.4 : 1}}>
                      <Image src="/photos.png" alt="photos" width={22} height={22} />
                    </button>
                    <input ref={confessionFileInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleConfessionImageSelect} />
                  </div>
                  <button onClick={async () => { await handleConfessionPost(); }} disabled={confessionPosting || !confessionContent.trim()}
                    style={{backgroundColor: confessionPosting || !confessionContent.trim() ? "#ccc" : "#2BB39A", color: "#fff", border: "none", borderRadius: "20px", padding: "9px 24px", fontWeight: 700, fontSize: "0.85rem", cursor: confessionPosting || !confessionContent.trim() ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                    {confessionPosting ? "Posting..." : "Confess"}
                  </button>
                </div>
                {showConfessionPhotoWarning && (
                  <div style={{margin: "0 16px 16px", backgroundColor: "#FEF2F2", border: "1px solid #EF4444", borderRadius: "8px", padding: "8px 12px", fontSize: "0.75rem", color: "#EF4444", lineHeight: 1.4}}>
                    Photos may reveal your identity. Post with caution.
                    <div style={{display: "flex", gap: "8px", marginTop: "8px"}}>
                      <button onClick={() => confessionFileInputRef.current?.click()}
                        style={{backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>I Understand, Add Photo</button>
                      <button onClick={() => setShowConfessionPhotoWarning(false)}
                        style={{backgroundColor: "#F7F7F7", color: "#888", border: "none", borderRadius: "8px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", padding: "10px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none"}}>
              <button onClick={() => setConfessionMoodFilter(null)}
                style={{flexShrink: 0, padding: "5px 14px", borderRadius: "20px", border: "1px solid " + (confessionMoodFilter === null ? "#2BB39A" : "#E8F8F5"),
                  backgroundColor: confessionMoodFilter === null ? "#E1F5EE" : "#F0FAF6", color: confessionMoodFilter === null ? "#0F6E56" : "#2BB39A",
                  fontWeight: confessionMoodFilter === null ? 700 : 500, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: confessionMoodFilter === null ? 1 : 0.75}}>
                All
              </button>
              {MOODS.map(mood => (
                <button key={mood.value} onClick={() => setConfessionMoodFilter(confessionMoodFilter === mood.value ? null : mood.value)}
                  style={{flexShrink: 0, padding: "5px 12px", borderRadius: "20px",
                    border: "1px solid " + (confessionMoodFilter === mood.value ? mood.color : "#F0F0F0"),
                    backgroundColor: confessionMoodFilter === mood.value ? mood.bg : "#F7F7F7",
                    color: confessionMoodFilter === mood.value ? mood.color : "#888",
                    fontWeight: confessionMoodFilter === mood.value ? 700 : 400,
                    fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
                  {mood.emoji} {mood.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{flex: 1, paddingBottom: "80px"}}>
            {topConfessions.length > 0 && !confessionMoodFilter && (
              <div style={{backgroundColor: "#fff", marginBottom: "10px", borderRadius: "14px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden", margin: "0 8px 10px", padding: "14px 16px"}}>
                <div style={{display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px"}}>
                  <span style={{fontSize: "1.1rem"}}>🔥</span>
                  <span style={{fontWeight: 700, fontSize: "0.88rem", color: "#1A1A1A"}}>Top Confessions This Week</span>
                </div>
                {topConfessions.map((c, idx) => (
                  <div key={c.id} onClick={() => router.push("/soapbox/" + c.id)}
                    style={{display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: idx < topConfessions.length - 1 ? "14px" : 0, cursor: "pointer", padding: "8px", borderRadius: "10px", backgroundColor: "#FAFAFA"}}>
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
              <div>
                <style>{`@keyframes shimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } }`}</style>
                {[1,2,3].map(i => (
                  <div key={i} style={{backgroundColor: "#fff", marginBottom: "10px", borderRadius: "14px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden", margin: "0 8px 10px", padding: "14px 16px"}}>
                    <div style={{display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px"}}>
                      <div style={{width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", flexShrink: 0}} />
                      <div style={{flex: 1}}>
                        <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "6px", width: "40%"}} />
                        <div style={{height: "10px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", width: "25%"}} />
                      </div>
                    </div>
                    <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "6px"}} />
                    <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", width: "75%"}} />
                  </div>
                ))}
              </div>
            ) : filteredConfessions.length === 0 ? (
              <div style={{textAlign: "center", padding: "56px 24px"}}>
                <div style={{fontSize: "4rem", marginBottom: "16px", lineHeight: 1}}>💌</div>
                <div style={{fontWeight: 800, color: "#1A1A1A", fontSize: "1.1rem", marginBottom: "8px"}}>
                  {confessionMoodFilter ? "No " + (getMood(confessionMoodFilter)?.label || "") + " confessions yet!" : "No confessions yet!"}
                </div>
                <div style={{color: "#2BB39A", fontSize: "0.85rem", fontWeight: 600}}>
                  {confessionMoodFilter ? "Try a different mood filter." : "Be the first to share. Safe ka diri, promise."}
                </div>
              </div>
            ) : filteredConfessions.map(confession => {
              const mood = getMood(confession.mood);
              return (
                <div key={confession.id} style={{backgroundColor: "#fff", marginBottom: "10px", borderRadius: "14px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden", margin: "0 8px 10px"}}>
                  <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
                    <img src="/icon/confess.png" alt="confession" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.1)"}} />
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#6B4C9A"}}>{confession.pseudonym}</div>
                      <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap"}}>
                        {formatTime(confession.created_at)}
                        {confession.edited_at && <span style={{color: "#aaa", fontSize: "0.68rem", fontStyle: "italic"}}>· Edited</span>}
                        {confession.school_id !== currentUser?.school_id && (() => { const s = schools.find(s => s.id === confession.school_id); return s ? <span style={{display: "inline-flex", alignItems: "center", gap: "2px", backgroundColor: "#E8F8F5", color: "#2BB39A", fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: "8px"}}>🏫 {s.abbreviation}</span> : null; })()}
                        {mood && (
                          <span style={{display: "inline-flex", alignItems: "center", gap: "3px", backgroundColor: mood.bg, color: mood.color, fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: "10px"}}>
                            {mood.emoji} feeling {mood.label.toLowerCase()}
                          </span>
                        )}
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
              );
            })}
          </div>
        </>
      )}

      <BottomNav active="/soapbox" />

      {showMenu && (
        <>
          <div onClick={() => setShowMenu(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
            <button onClick={() => { const p = posts.find(p => p.id === showMenu); if (p) { setEditingPost(p.id); setEditContent(p.content); } setShowMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1A1A1A"}}>Edit Post</button>
            <button onClick={() => { setShowDeleteConfirm(showMenu); setShowMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>Delete Post</button>
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
              <button onClick={() => handleEditPost(editingPost)} style={{padding: "9px 20px", borderRadius: "20px", border: "none", backgroundColor: "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>Save</button>
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
      {confessionMenu && (
        <>
          <div onClick={() => setConfessionMenu(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
            <button onClick={() => { const c = confessions.find(c => c.id === confessionMenu); if (c) { setEditingConfession(c.id); setEditConfessionContent(c.content); } setConfessionMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1A1A1A"}}>Edit Confession</button>
            <button onClick={() => { setShowDeleteConfessionConfirm(confessionMenu); setConfessionMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>Delete Confession</button>
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
              <button onClick={() => handleEditConfession(editingConfession)} style={{padding: "9px 20px", borderRadius: "20px", border: "none", backgroundColor: "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>Save</button>
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
