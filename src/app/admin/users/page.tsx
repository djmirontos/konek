'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type User = { id: string; full_name: string; avatar_url: string | null; role: string; };
type ManagedUser = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_banned: boolean;
  ban_count: number;
  verification_status: string;
  created_at: string;
  phone_number: string | null;
  school?: { name: string; abbreviation: string; } | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "banned" | "pending">("all");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (currentUser) fetchUsers(); }, [filter, currentUser]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) { router.push("/feeds"); return; }
    setCurrentUser(userData);
  }

  async function fetchUsers() {
    setLoading(true);
    let query = supabase.from("users").select("id, full_name, avatar_url, role, is_banned, ban_count, verification_status, created_at, phone_number, schools(name, abbreviation)").order("created_at", { ascending: false }).limit(100);
    if (filter === "banned") query = query.eq("is_banned", true);
    if (filter === "pending") query = query.eq("verification_status", "pending");
    const { data } = await query;
    if (data) setUsers(data.map((u: any) => ({ ...u, school: Array.isArray(u.schools) ? u.schools[0] ?? null : u.schools })));
    setLoading(false);
  }

  async function handleBan(userId: string) {
    if (currentUser?.role !== "admin") { showToast("Only admins can ban users."); return; }
    setActing(userId);
    const user = users.find(u => u.id === userId);
    await supabase.from("users").update({ is_banned: !user?.is_banned }).eq("id", userId);
    showToast(user?.is_banned ? "User unbanned." : "User banned.");
    fetchUsers();
    setActing(null);
    setShowMenu(null);
  }

  async function handleChangeRole(userId: string) {
    if (currentUser?.role !== "admin") { showToast("Only admins can change roles."); return; }
    if (!newRole) return;
    setActing(userId);
    await supabase.from("users").update({ role: newRole }).eq("id", userId);
    showToast("Role updated to " + newRole + ".");
    setShowRoleModal(null);
    setNewRole("");
    fetchUsers();
    setActing(null);
  }

  async function handleWarn(userId: string) {
    setActing(userId);
    await supabase.from("notifications").insert({
      recipient_id: userId, sender_id: currentUser?.id, type: "system",
      message: "⚠️ Your account has received a warning from the Konek moderation team. Please review our community guidelines.", is_read: false,
    });
    showToast("Warning sent to user.");
    setActing(null);
    setShowMenu(null);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  const filtered = users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone_number?.includes(search));

  const ROLES = ["student", "moderator", "admin"];

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      {toast && <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>}

      {showRoleModal && (
        <>
          <div onClick={() => setShowRoleModal(null)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "20px 16px 32px"}}>
            <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A", marginBottom: "12px"}}>Change Role</div>
            {ROLES.map(role => (
              <button key={role} onClick={() => setNewRole(role)}
                style={{width: "100%", padding: "12px 16px", border: "none", borderBottom: "1px solid #F0F0F0", backgroundColor: newRole === role ? "#E1F5EE" : "#fff", color: newRole === role ? "#1D9E75" : "#1A1A1A", fontWeight: newRole === role ? 700 : 400, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit", textAlign: "left", textTransform: "capitalize"}}>
                {role}
              </button>
            ))}
            <div style={{display: "flex", gap: "10px", marginTop: "12px"}}>
              <button onClick={() => setShowRoleModal(null)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={() => handleChangeRole(showRoleModal)} disabled={!newRole || acting === showRoleModal}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Save</button>
            </div>
          </div>
        </>
      )}

      <div style={{backgroundColor: "#1D9E75", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/admin")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "0", width: "36px"}}>‹</button>
        <div style={{fontWeight: 800, fontSize: "1rem", color: "#fff", letterSpacing: "0.05em"}}>USER MANAGEMENT</div>
        <div style={{width: "36px"}}></div>
      </div>

      <div style={{backgroundColor: "#fff", padding: "10px 16px", borderBottom: "1px solid #F0F0F0"}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "20px", padding: "9px 16px", fontSize: "0.85rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
      </div>

      <div style={{display: "flex", backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0"}}>
        {(["all", "banned", "pending"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            style={{flex: 1, padding: "10px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", color: filter === tab ? "#1D9E75" : "#888", borderBottom: filter === tab ? "2px solid #1D9E75" : "2px solid transparent", textTransform: "capitalize"}}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{flex: 1, paddingBottom: "32px"}}>
        {loading ? (
          <div style={{textAlign: "center", padding: "48px", color: "#888", fontSize: "0.85rem"}}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign: "center", padding: "64px 16px"}}>
            <div style={{fontSize: "3rem", marginBottom: "12px"}}>👥</div>
            <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem"}}>No users found</div>
          </div>
        ) : filtered.map(user => (
          <div key={user.id} style={{backgroundColor: "#fff", marginBottom: "1px", borderBottom: "1px solid #F0F0F0", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px"}}>
            <div onClick={() => router.push("/profile/" + user.id)} style={{position: "relative", flexShrink: 0, cursor: "pointer"}}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" style={{width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: "2px solid #1D9E75"}} />
                : <div style={{width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1rem", border: "2px solid #1D9E75"}}>{user.full_name?.charAt(0).toUpperCase()}</div>
              }
              {user.is_banned && <div style={{position: "absolute", bottom: "-2px", right: "-2px", backgroundColor: "#EF4444", borderRadius: "50%", width: "14px", height: "14px", fontSize: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"}}>🚫</div>}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontWeight: 700, fontSize: "0.875rem", color: user.is_banned ? "#888" : "#1A1A1A"}}>{user.full_name}</div>
              <div style={{fontSize: "0.72rem", color: "#888"}}>{user.school?.abbreviation || "—"} · {user.role} · Joined {formatDate(user.created_at)}</div>
              <div style={{display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap"}}>
                {user.verification_status === "pending" && <span style={{backgroundColor: "#FEF3C7", color: "#F59E0B", padding: "2px 8px", borderRadius: "8px", fontSize: "0.65rem", fontWeight: 700}}>ID Pending</span>}
                {user.verification_status === "approved" && <span style={{backgroundColor: "#E1F5EE", color: "#1D9E75", padding: "2px 8px", borderRadius: "8px", fontSize: "0.65rem", fontWeight: 700}}>Verified</span>}
                {user.is_banned && <span style={{backgroundColor: "#FEF2F2", color: "#EF4444", padding: "2px 8px", borderRadius: "8px", fontSize: "0.65rem", fontWeight: 700}}>Banned</span>}
                {user.ban_count > 0 && <span style={{backgroundColor: "#F7F7F7", color: "#888", padding: "2px 8px", borderRadius: "8px", fontSize: "0.65rem", fontWeight: 700}}>{user.ban_count} ban{user.ban_count > 1 ? "s" : ""}</span>}
              </div>
            </div>
            <button onClick={() => setShowMenu(showMenu === user.id ? null : user.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem", padding: "4px", flexShrink: 0}}>•••</button>
            {showMenu === user.id && (
              <>
                <div onClick={() => setShowMenu(null)} style={{position: "fixed", inset: 0, zIndex: 400}} />
                <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
                  <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
                  <div style={{padding: "0 16px 10px", fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A"}}>{user.full_name}</div>
                  <button onClick={() => handleWarn(user.id)} style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#F59E0B"}}>⚠️ Send Warning</button>
                  {currentUser?.role === "admin" && (
                    <>
                      <button onClick={() => { setShowRoleModal(user.id); setNewRole(user.role); setShowMenu(null); }} style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#1A1A1A"}}>🎭 Change Role</button>
                      <button onClick={() => handleBan(user.id)} style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#EF4444"}}>{user.is_banned ? "✅ Unban User" : "🚫 Ban User"}</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
