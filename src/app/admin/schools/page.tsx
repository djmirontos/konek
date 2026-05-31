'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type User = { id: string; full_name: string; avatar_url: string | null; role: string; };
type SchoolRequest = {
  id: string;
  school_name: string;
  city: string;
  province: string;
  notes: string | null;
  status: string;
  created_at: string;
  requested_by_user_id: string | null;
  requester?: { full_name: string; } | null;
};

export default function AdminSchoolsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<SchoolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (currentUser) fetchRequests(); }, [filter, currentUser]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) { router.push("/feeds"); return; }
    if (userData.role !== "admin") { showToast("Only admins can manage school requests."); router.push("/admin"); return; }
    setCurrentUser(userData);
  }

  async function fetchRequests() {
    setLoading(true);
    const { data } = await supabase
      .from("school_requests")
      .select("*, requester:requested_by_user_id(full_name)")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    if (data) setRequests(data.map((r: any) => ({ ...r, requester: Array.isArray(r.requester) ? r.requester[0] ?? null : r.requester })));
    setLoading(false);
  }

  async function handleApprove(req: SchoolRequest) {
    setActing(req.id);
    // Add school to schools table
    const abbreviation = req.school_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 6);
    const { error } = await supabase.from("schools").insert({ name: req.school_name, abbreviation });
    if (error) { showToast("Error adding school: " + error.message); setActing(null); return; }
    await supabase.from("school_requests").update({ status: "approved" }).eq("id", req.id);
    showToast("School approved and added!");
    fetchRequests();
    setActing(null);
  }

  async function handleReject(reqId: string) {
    setActing(reqId);
    await supabase.from("school_requests").update({ status: "rejected" }).eq("id", reqId);
    showToast("Request rejected.");
    fetchRequests();
    setActing(null);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      {toast && <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>}

      <div style={{backgroundColor: "#1D9E75", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/admin")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "0", width: "36px"}}>‹</button>
        <div style={{fontWeight: 800, fontSize: "1rem", color: "#fff", letterSpacing: "0.05em"}}>SCHOOL REQUESTS</div>
        <div style={{width: "36px"}}></div>
      </div>

      <div style={{display: "flex", backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0"}}>
        {(["pending", "approved", "rejected"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            style={{flex: 1, padding: "12px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", color: filter === tab ? "#1D9E75" : "#888", borderBottom: filter === tab ? "2px solid #1D9E75" : "2px solid transparent", textTransform: "capitalize"}}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{flex: 1, paddingBottom: "32px"}}>
        {loading ? (
          <div style={{textAlign: "center", padding: "48px", color: "#888", fontSize: "0.85rem"}}>Loading...</div>
        ) : requests.length === 0 ? (
          <div style={{textAlign: "center", padding: "64px 16px"}}>
            <div style={{fontSize: "3rem", marginBottom: "12px"}}>🏫</div>
            <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem"}}>No {filter} school requests</div>
          </div>
        ) : requests.map(req => (
          <div key={req.id} style={{backgroundColor: "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0", padding: "14px 16px"}}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px"}}>
              <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>{req.school_name}</div>
              <span style={{fontSize: "0.72rem", color: "#888", flexShrink: 0, marginLeft: "8px"}}>{formatDate(req.created_at)}</span>
            </div>
            <div style={{fontSize: "0.8rem", color: "#555", marginBottom: "4px"}}>📍 {req.city}, {req.province}</div>
            {req.notes && <div style={{fontSize: "0.78rem", color: "#888", marginBottom: "8px", fontStyle: "italic"}}>"{req.notes}"</div>}
            <div style={{fontSize: "0.75rem", color: "#888", marginBottom: "10px"}}>Requested by: <span style={{fontWeight: 600, color: "#1A1A1A"}}>{req.requester?.full_name || "Unknown"}</span></div>
            {filter === "pending" && (
              <div style={{display: "flex", gap: "8px"}}>
                <button onClick={() => handleReject(req.id)} disabled={acting === req.id}
                  style={{flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#EF4444", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>
                  Reject
                </button>
                <button onClick={() => handleApprove(req)} disabled={acting === req.id}
                  style={{flex: 1, padding: "10px", borderRadius: "10px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>
                  {acting === req.id ? "Adding..." : "Approve ✓"}
                </button>
              </div>
            )}
            {filter === "approved" && <span style={{backgroundColor: "#E1F5EE", color: "#1D9E75", padding: "4px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700}}>✓ Added to Schools</span>}
            {filter === "rejected" && <span style={{backgroundColor: "#FEF2F2", color: "#EF4444", padding: "4px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700}}>✕ Rejected</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
