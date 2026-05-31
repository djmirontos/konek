'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type User = { id: string; full_name: string; avatar_url: string | null; role: string; };
type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  listing_id: string | null;
  boarding_house_id: string | null;
  reporter?: { full_name: string; } | null;
  post?: { content: string; user_id: string; type: string; users?: { full_name: string; } | null; } | null;
};

export default function AdminReportsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "resolved">("pending");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (currentUser) fetchReports(); }, [filter, currentUser]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) { router.push("/feeds"); return; }
    setCurrentUser(userData);
  }

  async function fetchReports() {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("*, reporter:reporter_id(full_name)")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const enriched = await Promise.all(data.map(async (r) => {
        let post = null;
        if (r.post_id) {
          const { data: p } = await supabase.from("posts").select("content, user_id, type, users(full_name)").eq("id", r.post_id).single();
          if (p) post = { ...p, users: Array.isArray(p.users) ? p.users[0] ?? null : p.users };
        }
        return { ...r, reporter: Array.isArray(r.reporter) ? r.reporter[0] ?? null : r.reporter, post };
      }));
      setReports(enriched);
    }
    setLoading(false);
  }

  async function handleDismiss(reportId: string) {
    setActing(reportId);
    await supabase.from("reports").update({ status: "resolved", resolved_by: currentUser?.id, resolved_at: new Date().toISOString() }).eq("id", reportId);
    showToast("Report dismissed.");
    fetchReports();
    setActing(null);
  }

  async function handleHidePost(reportId: string, postId: string) {
    setActing(reportId);
    await supabase.from("posts").update({ is_hidden: true }).eq("id", postId);
    await supabase.from("reports").update({ status: "resolved", resolved_by: currentUser?.id, resolved_at: new Date().toISOString() }).eq("id", reportId);
    showToast("Post hidden.");
    fetchReports();
    setActing(null);
  }

  async function handleBanUser(reportId: string, userId: string) {
    if (currentUser?.role !== "admin") { showToast("Only admins can ban users."); return; }
    setActing(reportId);
    await supabase.from("users").update({ is_banned: true, ban_count: supabase.rpc("increment_ban_count", { user_id: userId }) }).eq("id", userId);
    await supabase.from("reports").update({ status: "resolved", resolved_by: currentUser?.id, resolved_at: new Date().toISOString() }).eq("id", reportId);
    showToast("User banned.");
    fetchReports();
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

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      {toast && <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>}

      <div style={{backgroundColor: "#1D9E75", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/admin")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "0", width: "36px"}}>‹</button>
        <div style={{fontWeight: 800, fontSize: "1rem", color: "#fff", letterSpacing: "0.05em"}}>REPORTS QUEUE</div>
        <div style={{width: "36px"}}></div>
      </div>

      <div style={{display: "flex", backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0"}}>
        {(["pending", "resolved"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            style={{flex: 1, padding: "12px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", color: filter === tab ? "#1D9E75" : "#888", borderBottom: filter === tab ? "2px solid #1D9E75" : "2px solid transparent", textTransform: "capitalize"}}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{flex: 1, paddingBottom: "32px"}}>
        {loading ? (
          <div style={{textAlign: "center", padding: "48px", color: "#888", fontSize: "0.85rem"}}>Loading reports...</div>
        ) : reports.length === 0 ? (
          <div style={{textAlign: "center", padding: "64px 16px"}}>
            <div style={{fontSize: "3rem", marginBottom: "12px"}}>✅</div>
            <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem"}}>No {filter} reports</div>
          </div>
        ) : reports.map(report => (
          <div key={report.id} style={{backgroundColor: "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0", padding: "14px 16px"}}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px"}}>
              <div>
                <span style={{backgroundColor: "#FEF2F2", color: "#EF4444", padding: "3px 10px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700}}>{report.reason}</span>
              </div>
              <span style={{fontSize: "0.72rem", color: "#888"}}>{formatTime(report.created_at)}</span>
            </div>
            <div style={{fontSize: "0.78rem", color: "#888", marginBottom: "6px"}}>Reported by: <span style={{fontWeight: 600, color: "#1A1A1A"}}>{report.reporter?.full_name || "Unknown"}</span></div>
            {report.details && <div style={{fontSize: "0.8rem", color: "#555", marginBottom: "8px", fontStyle: "italic"}}>"{report.details}"</div>}
            {report.post && (
              <div style={{backgroundColor: "#F7F7F7", borderRadius: "10px", padding: "10px 12px", marginBottom: "10px"}}>
                <div style={{fontSize: "0.7rem", color: "#888", marginBottom: "4px", fontWeight: 600}}>POST BY {report.post.users?.full_name?.toUpperCase() || "UNKNOWN"}</div>
                <div style={{fontSize: "0.82rem", color: "#1A1A1A", lineHeight: 1.4}}>{report.post.content?.slice(0, 200)}{(report.post.content?.length || 0) > 200 ? "..." : ""}</div>
              </div>
            )}
            {filter === "pending" && (
              <div style={{display: "flex", gap: "8px", flexWrap: "wrap"}}>
                <button onClick={() => handleDismiss(report.id)} disabled={acting === report.id}
                  style={{padding: "7px 14px", borderRadius: "10px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
                  Dismiss
                </button>
                {report.post_id && (
                  <button onClick={() => handleHidePost(report.id, report.post_id!)} disabled={acting === report.id}
                    style={{padding: "7px 14px", borderRadius: "10px", border: "none", backgroundColor: "#FEF2F2", color: "#EF4444", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
                    Hide Post
                  </button>
                )}
                {report.post?.user_id && currentUser?.role === "admin" && (
                  <button onClick={() => handleBanUser(report.id, report.post!.user_id)} disabled={acting === report.id}
                    style={{padding: "7px 14px", borderRadius: "10px", border: "none", backgroundColor: "#1A1A1A", color: "#fff", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
                    Ban User
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
