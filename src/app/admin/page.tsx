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
  const [showNewToday, setShowNewToday] = useState(false);
  const [newTodayUsers, setNewTodayUsers] = useState<{id:string;full_name:string;avatar_url:string|null;school_id:string;created_at:string;schools?:{abbreviation:string}|null}[]>([]);
  const [showPostsToday, setShowPostsToday] = useState(false);
  const [postsTodayList, setPostsTodayList] = useState<{id:string;content:string;type:string;created_at:string;user_id:string;real_name:string;avatar_url:string|null;anonymous_name:string|null}[]>([]);
  const [showActiveQuad, setShowActiveQuad] = useState(false);
  const [activeQuadList, setActiveQuadList] = useState<{id:string;content:string;created_at:string;expires_at:string;real_name:string;avatar_url:string|null}[]>([]);

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

  async function fetchNewTodayUsers() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, school_id, created_at, schools(abbreviation)")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });
    if (data) setNewTodayUsers(data.map((u: any) => ({
      ...u,
      schools: Array.isArray(u.schools) ? u.schools[0] ?? null : u.schools,
    })));
    setShowNewToday(true);
  }

  async function fetchPostsToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("posts")
      .select("id, content, type, created_at, user_id, pseudonym, is_anonymous, users(full_name, avatar_url)")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });
    if (data) setPostsTodayList(data.map((p: any) => ({
      id: p.id,
      content: p.content,
      type: p.type,
      created_at: p.created_at,
      user_id: p.user_id,
      real_name: Array.isArray(p.users) ? p.users[0]?.full_name ?? "Unknown" : p.users?.full_name ?? "Unknown",
      avatar_url: Array.isArray(p.users) ? p.users[0]?.avatar_url ?? null : p.users?.avatar_url ?? null,
      anonymous_name: p.is_anonymous ? (p.pseudonym || "Anonymous") : null,
    })));
    setShowPostsToday(true);
  }

  async function fetchActiveQuad() {
    const { data } = await supabase
      .from("posts")
      .select("id, content, created_at, expires_at, user_id, users(full_name, avatar_url)")
      .eq("type", "quad")
      .eq("is_hidden", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (data) setActiveQuadList(data.map((p: any) => ({
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      expires_at: p.expires_at,
      real_name: Array.isArray(p.users) ? p.users[0]?.full_name ?? "Unknown" : p.users?.full_name ?? "Unknown",
      avatar_url: Array.isArray(p.users) ? p.users[0]?.avatar_url ?? null : p.users?.avatar_url ?? null,
    })));
    setShowActiveQuad(true);
  }

  const MENU = [
    { label: "Reports Queue", icon: "🚨", route: "/admin/reports", badge: stats?.pendingReports, desc: "Review flagged content" },
    { label: "Verification", icon: "🎓", route: "/admin/verification", badge: stats?.pendingVerifications, desc: "Approve student IDs" },
    { label: "Users", icon: "👥", route: "/admin/users", badge: null, desc: "Manage all users" },
    { label: "Content", icon: "📋", route: "/admin/content", badge: null, desc: "Moderate posts" },
    { label: "School Requests", icon: "🏫", route: "/admin/schools", badge: stats?.pendingSchoolRequests, desc: "Approve new schools" },
    { label: "Retention", icon: "📊", route: "/admin/retention", badge: null, desc: "Analytics & active users" },
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
          { label: "New Today", value: stats?.newUsersToday, icon: "🆕", color: "#3B82F6", onClick: fetchNewTodayUsers },
          { label: "Posts Today", value: stats?.totalPostsToday, icon: "📝", color: "#8B5CF6", onClick: fetchPostsToday },
          { label: "Active Quad", value: stats?.activeQuadPosts, icon: "🗺️", color: "#F59E0B", onClick: fetchActiveQuad },
        ].map((stat, i) => (
          <div key={i} onClick={(stat as any).onClick} style={{backgroundColor: "#fff", borderRadius: "14px", padding: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: (stat as any).onClick ? "pointer" : "default"}}>
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
      {/* POSTS TODAY BOTTOM SHEET */}
      {showPostsToday && (
        <>
          <div onClick={() => setShowPostsToday(false)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, maxHeight: "75vh", display: "flex", flexDirection: "column"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "12px auto 0"}}></div>
            <div style={{padding: "14px 16px 10px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A"}}>Posts Today — {postsTodayList.length}</div>
              <button onClick={() => setShowPostsToday(false)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.1rem"}}>x</button>
            </div>
            <div style={{overflowY: "auto", flex: 1, paddingBottom: "24px"}}>
              {postsTodayList.length === 0 ? (
                <div style={{textAlign: "center", padding: "32px", color: "#888", fontSize: "0.85rem"}}>No posts today yet.</div>
              ) : postsTodayList.map(p => (
                <div key={p.id} onClick={() => { setShowPostsToday(false); router.push("/feeds/" + p.id); }}
                  style={{display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #F0F0F0", cursor: "pointer"}}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                    : <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0}}>{p.real_name?.charAt(0).toUpperCase()}</div>
                  }
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px", flexWrap: "wrap"}}>
                      <span style={{fontWeight: 700, fontSize: "0.82rem", color: "#1A1A1A"}}>{p.real_name}</span>
                      {p.anonymous_name && <span style={{fontSize: "0.7rem", color: "#888", backgroundColor: "#F0F0F0", padding: "1px 6px", borderRadius: "8px"}}>as {p.anonymous_name}</span>}
                      <span style={{fontSize: "0.65rem", color: "#fff", backgroundColor: p.type === "confession" ? "#F59E0B" : p.type === "soapbox" ? "#8B5CF6" : "#1D9E75", padding: "1px 6px", borderRadius: "8px", textTransform: "capitalize"}}>{p.type}</span>
                    </div>
                    <div style={{fontSize: "0.78rem", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{p.content}</div>
                    <div style={{fontSize: "0.65rem", color: "#AAA", marginTop: "2px"}}>{new Date(p.created_at).toLocaleTimeString("en-PH", {hour: "2-digit", minute: "2-digit"})}</div>
                  </div>
                  <span style={{color: "#1D9E75", fontSize: "1.1rem"}}>›</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ACTIVE QUAD BOTTOM SHEET */}
      {showActiveQuad && (
        <>
          <div onClick={() => setShowActiveQuad(false)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, maxHeight: "75vh", display: "flex", flexDirection: "column"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "12px auto 0"}}></div>
            <div style={{padding: "14px 16px 10px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A"}}>Active Quad Posts — {activeQuadList.length}</div>
              <button onClick={() => setShowActiveQuad(false)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.1rem"}}>x</button>
            </div>
            <div style={{overflowY: "auto", flex: 1, paddingBottom: "24px"}}>
              {activeQuadList.length === 0 ? (
                <div style={{textAlign: "center", padding: "32px", color: "#888", fontSize: "0.85rem"}}>No active quad posts.</div>
              ) : activeQuadList.map(p => (
                <div key={p.id} onClick={() => { setShowActiveQuad(false); router.push("/quad/" + p.id); }}
                  style={{display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #F0F0F0", cursor: "pointer"}}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                    : <div style={{width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0}}>{p.real_name?.charAt(0).toUpperCase()}</div>
                  }
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontWeight: 700, fontSize: "0.82rem", color: "#1A1A1A", marginBottom: "2px"}}>{p.real_name}</div>
                    <div style={{fontSize: "0.78rem", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{p.content}</div>
                    <div style={{fontSize: "0.65rem", color: "#F59E0B", marginTop: "2px"}}>Expires: {new Date(p.expires_at).toLocaleString("en-PH", {month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"})}</div>
                  </div>
                  <span style={{color: "#1D9E75", fontSize: "1.1rem"}}>›</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* NEW TODAY BOTTOM SHEET */}
      {showNewToday && (
        <>
          <div onClick={() => setShowNewToday(false)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, maxHeight: "75vh", display: "flex", flexDirection: "column"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "12px auto 0"}}></div>
            <div style={{padding: "14px 16px 10px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A"}}>🆕 New Today — {newTodayUsers.length} user{newTodayUsers.length !== 1 ? "s" : ""}</div>
              <button onClick={() => setShowNewToday(false)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.1rem"}}>✕</button>
            </div>
            <div style={{overflowY: "auto", flex: 1, paddingBottom: "24px"}}>
              {newTodayUsers.length === 0 ? (
                <div style={{textAlign: "center", padding: "32px", color: "#888", fontSize: "0.85rem"}}>No new signups today yet.</div>
              ) : newTodayUsers.map(u => (
                <div key={u.id} onClick={() => { setShowNewToday(false); router.push("/profile/" + u.id); }}
                  style={{display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #F0F0F0", cursor: "pointer"}}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F7F7F7")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" style={{width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                    : <div style={{width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1rem", flexShrink: 0}}>{u.full_name?.charAt(0).toUpperCase()}</div>
                  }
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A"}}>{u.full_name}</div>
                    <div style={{fontSize: "0.72rem", color: "#888"}}>{(u.schools as any)?.abbreviation || "—"} · {new Date(u.created_at).toLocaleTimeString("en-PH", {hour: "2-digit", minute: "2-digit"})}</div>
                  </div>
                  <span style={{color: "#1D9E75", fontSize: "1.1rem"}}>›</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
