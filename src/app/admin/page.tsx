'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type Stats = {
  totalUsers: number;
  newUsersToday: number;
  totalPostsToday: number;
  pendingReports: number;
  pendingVerifications: number;
  pendingSchoolRequests: number;
  activeQuadPosts: number;
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { initPage(); }, []);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) {
      router.push("/feeds"); return;
    }
    setCurrentUser(userData);
    await fetchStats();
    setLoading(false);
  }

  async function fetchStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      { count: totalUsers },
      { count: newUsersToday },
      { count: totalPostsToday },
      { count: pendingReports },
      { count: pendingVerifications },
      { count: pendingSchoolRequests },
      { count: activeQuadPosts },
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("school_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("type", "quad").eq("is_hidden", false).gt("expires_at", new Date().toISOString()),
    ]);

    setStats({
      totalUsers: totalUsers || 0,
      newUsersToday: newUsersToday || 0,
      totalPostsToday: totalPostsToday || 0,
      pendingReports: pendingReports || 0,
      pendingVerifications: pendingVerifications || 0,
      pendingSchoolRequests: pendingSchoolRequests || 0,
      activeQuadPosts: activeQuadPosts || 0,
    });
  }

  const MENU = [
    { label: "Reports Queue", icon: "🚨", route: "/admin/reports", badge: stats?.pendingReports, desc: "Review flagged content" },
    { label: "Verification", icon: "🎓", route: "/admin/verification", badge: stats?.pendingVerifications, desc: "Approve student IDs" },
    { label: "Users", icon: "👥", route: "/admin/users", badge: null, desc: "Manage all users" },
    { label: "Content", icon: "📋", route: "/admin/content", badge: null, desc: "Moderate posts" },
    { label: "School Requests", icon: "🏫", route: "/admin/schools", badge: stats?.pendingSchoolRequests, desc: "Approve new schools" },
  ];

  if (loading) return (
    <div style={{minHeight: "100vh", backgroundColor: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      <div style={{color: "#fff", fontSize: "0.9rem", fontWeight: 600}}>Loading admin panel...</div>
    </div>
  );

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {/* Header */}
      <div style={{backgroundColor: "#1D9E75", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/feeds")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "0", width: "36px"}}>‹</button>
        <div style={{textAlign: "center"}}>
          <div style={{fontWeight: 800, fontSize: "1rem", color: "#fff", letterSpacing: "0.05em"}}>ADMIN PANEL</div>
          <div style={{fontSize: "0.65rem", color: "rgba(255,255,255,0.8)", marginTop: "1px"}}>{currentUser?.full_name} · {currentUser?.role}</div>
        </div>
        <div style={{width: "36px"}}></div>
      </div>

      {/* Stats Grid */}
      <div style={{padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>
        {[
          { label: "Total Users", value: stats?.totalUsers, icon: "👥", color: "#1D9E75" },
          { label: "New Today", value: stats?.newUsersToday, icon: "🆕", color: "#3B82F6" },
          { label: "Posts Today", value: stats?.totalPostsToday, icon: "📝", color: "#8B5CF6" },
          { label: "Active Quad", value: stats?.activeQuadPosts, icon: "🗺️", color: "#F59E0B" },
        ].map((stat, i) => (
          <div key={i} style={{backgroundColor: "#fff", borderRadius: "14px", padding: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize: "1.6rem", marginBottom: "6px"}}>{stat.icon}</div>
            <div style={{fontSize: "1.6rem", fontWeight: 800, color: stat.color, lineHeight: 1}}>{stat.value ?? "—"}</div>
            <div style={{fontSize: "0.72rem", color: "#888", marginTop: "4px", fontWeight: 500}}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Alert Cards */}
      {(stats?.pendingReports || 0) > 0 && (
        <div onClick={() => router.push("/admin/reports")} style={{margin: "0 16px 10px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer"}}>
          <span style={{fontSize: "1.3rem"}}>🚨</span>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, fontSize: "0.85rem", color: "#EF4444"}}>{stats?.pendingReports} Pending Reports</div>
            <div style={{fontSize: "0.75rem", color: "#888"}}>Tap to review flagged content</div>
          </div>
          <span style={{color: "#EF4444", fontSize: "1.1rem"}}>›</span>
        </div>
      )}
      {(stats?.pendingVerifications || 0) > 0 && (
        <div onClick={() => router.push("/admin/verification")} style={{margin: "0 16px 10px", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer"}}>
          <span style={{fontSize: "1.3rem"}}>🎓</span>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, fontSize: "0.85rem", color: "#3B82F6"}}>{stats?.pendingVerifications} Verification Requests</div>
            <div style={{fontSize: "0.75rem", color: "#888"}}>Students waiting for approval</div>
          </div>
          <span style={{color: "#3B82F6", fontSize: "1.1rem"}}>›</span>
        </div>
      )}
      {(stats?.pendingSchoolRequests || 0) > 0 && (
        <div onClick={() => router.push("/admin/schools")} style={{margin: "0 16px 10px", backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer"}}>
          <span style={{fontSize: "1.3rem"}}>🏫</span>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, fontSize: "0.85rem", color: "#1D9E75"}}>{stats?.pendingSchoolRequests} School Requests</div>
            <div style={{fontSize: "0.75rem", color: "#888"}}>New schools waiting for approval</div>
          </div>
          <span style={{color: "#1D9E75", fontSize: "1.1rem"}}>›</span>
        </div>
      )}

      {/* Menu Grid */}
      <div style={{padding: "6px 16px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>
        {MENU.map((item, i) => (
          <div key={i} onClick={() => router.push(item.route)}
            style={{backgroundColor: "#fff", borderRadius: "14px", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer", position: "relative"}}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F7F7F7")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
            {item.badge ? (
              <div style={{position: "absolute", top: "10px", right: "10px", backgroundColor: "#EF4444", color: "#fff", borderRadius: "10px", padding: "1px 7px", fontSize: "0.65rem", fontWeight: 700}}>{item.badge}</div>
            ) : null}
            <div style={{fontSize: "1.8rem", marginBottom: "8px"}}>{item.icon}</div>
            <div style={{fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A", marginBottom: "3px"}}>{item.label}</div>
            <div style={{fontSize: "0.72rem", color: "#888"}}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
