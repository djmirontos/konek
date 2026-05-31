'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type User = { id: string; full_name: string; avatar_url: string | null; role: string; };
type Post = {
  id: string;
  content: string;
  type: string;
  is_hidden: boolean;
  created_at: string;
  user_id: string;
  school_id: string;
  users?: { full_name: string; avatar_url: string | null; } | null;
  schools?: { abbreviation: string; } | null;
};

export default function AdminContentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "feed" | "soapbox" | "quad" | "confession">("all");
  const [showHidden, setShowHidden] = useState(false);
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (currentUser) fetchPosts(); }, [typeFilter, showHidden, currentUser]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) { router.push("/feeds"); return; }
    setCurrentUser(userData);
  }

  async function fetchPosts() {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("id, content, type, is_hidden, created_at, user_id, school_id, users(full_name, avatar_url), schools(abbreviation)")
      .eq("is_hidden", showHidden)
      .order("created_at", { ascending: false })
      .limit(50);
    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    const { data } = await query;
    if (data) setPosts(data.map((p: any) => ({
      ...p,
      users: Array.isArray(p.users) ? p.users[0] ?? null : p.users,
      schools: Array.isArray(p.schools) ? p.schools[0] ?? null : p.schools,
    })));
    setLoading(false);
  }

  async function handleToggleHide(post: Post) {
    setActing(post.id);
    await supabase.from("posts").update({ is_hidden: !post.is_hidden }).eq("id", post.id);
    showToast(post.is_hidden ? "Post unhidden." : "Post hidden.");
    fetchPosts();
    setActing(null);
  }

  async function handleDelete(postId: string) {
    if (currentUser?.role !== "admin") { showToast("Only admins can delete posts."); return; }
    setActing(postId);
    await supabase.from("posts").delete().eq("id", postId);
    showToast("Post deleted.");
    setShowDeleteConfirm(null);
    fetchPosts();
    setActing(null);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function formatTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  function getTypeColor(type: string) {
    if (type === "feed") return { bg: "#E1F5EE", color: "#1D9E75" };
    if (type === "soapbox") return { bg: "#FEF3C7", color: "#F59E0B" };
    if (type === "quad") return { bg: "#EFF6FF", color: "#3B82F6" };
    if (type === "confession") return { bg: "#FDF4FF", color: "#A855F7" };
    return { bg: "#F7F7F7", color: "#888" };
  }

  const TYPE_FILTERS = ["all", "feed", "soapbox", "quad", "confession"] as const;

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      {toast && <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>}

      {showDeleteConfirm && (
        <>
          <div onClick={() => setShowDeleteConfirm(null)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "24px 16px 32px"}}>
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "8px", textAlign: "center"}}>Delete Post?</div>
            <div style={{fontSize: "0.85rem", color: "#888", textAlign: "center", marginBottom: "20px"}}>This cannot be undone.</div>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowDeleteConfirm(null)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Delete</button>
            </div>
          </div>
        </>
      )}

      <div style={{backgroundColor: "#1D9E75", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/admin")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "0", width: "36px"}}>‹</button>
        <div style={{fontWeight: 800, fontSize: "1rem", color: "#fff", letterSpacing: "0.05em"}}>CONTENT</div>
        <button onClick={() => setShowHidden(!showHidden)}
          style={{backgroundColor: "rgba(255,255,255,0.2)", border: "none", borderRadius: "12px", padding: "5px 10px", color: "#fff", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
          {showHidden ? "Visible" : "Hidden"}
        </button>
      </div>

      <div style={{backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", overflowX: "auto", display: "flex", padding: "0 8px"}}>
        {TYPE_FILTERS.map(tab => (
          <button key={tab} onClick={() => setTypeFilter(tab)}
            style={{padding: "10px 14px", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", color: typeFilter === tab ? "#1D9E75" : "#888", borderBottom: typeFilter === tab ? "2px solid #1D9E75" : "2px solid transparent", whiteSpace: "nowrap", textTransform: "capitalize", flexShrink: 0}}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{flex: 1, paddingBottom: "32px"}}>
        {loading ? (
          <div style={{textAlign: "center", padding: "48px", color: "#888", fontSize: "0.85rem"}}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={{textAlign: "center", padding: "64px 16px"}}>
            <div style={{fontSize: "3rem", marginBottom: "12px"}}>📋</div>
            <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem"}}>No posts found</div>
          </div>
        ) : posts.map(post => {
          const typeStyle = getTypeColor(post.type);
          return (
            <div key={post.id} style={{backgroundColor: "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0", padding: "14px 16px"}}>
              <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px"}}>
                {post.users?.avatar_url
                  ? <img src={post.users.avatar_url} alt="" style={{width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                  : <div style={{width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{post.users?.full_name?.charAt(0).toUpperCase()}</div>
                }
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontWeight: 700, fontSize: "0.82rem", color: "#1A1A1A"}}>{post.users?.full_name || "Unknown"}</div>
                  <div style={{fontSize: "0.7rem", color: "#888"}}>{post.schools?.abbreviation || "—"} · {formatTime(post.created_at)}</div>
                </div>
                <span style={{backgroundColor: typeStyle.bg, color: typeStyle.color, padding: "3px 10px", borderRadius: "10px", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0, textTransform: "capitalize"}}>{post.type}</span>
              </div>
              <div style={{fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.5, marginBottom: "10px"}}>{post.content?.slice(0, 200)}{(post.content?.length || 0) > 200 ? "..." : ""}</div>
              <div style={{display: "flex", gap: "8px"}}>
                <button onClick={() => handleToggleHide(post)} disabled={acting === post.id}
                  style={{flex: 1, padding: "8px", borderRadius: "10px", border: "1px solid #F0F0F0", backgroundColor: post.is_hidden ? "#E1F5EE" : "#FEF2F2", color: post.is_hidden ? "#1D9E75" : "#EF4444", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit"}}>
                  {post.is_hidden ? "Unhide" : "Hide"}
                </button>
                {currentUser?.role === "admin" && (
                  <button onClick={() => setShowDeleteConfirm(post.id)} disabled={acting === post.id}
                    style={{padding: "8px 16px", borderRadius: "10px", border: "none", backgroundColor: "#1A1A1A", color: "#fff", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit"}}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
