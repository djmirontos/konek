'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type User = { id: string; full_name: string; avatar_url: string | null; role: string; };
type VerificationRequest = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  verification_status: string;
  verification_front_url: string | null;
  verification_back_url: string | null;
  verification_submitted_at: string | null;
  verification_rejection_reason: string | null;
  school_id: string;
  school?: { name: string; abbreviation: string; } | null;
};

export default function AdminVerificationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [toast, setToast] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (currentUser) fetchRequests(); }, [filter, currentUser]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) { router.push("/feeds"); return; }
    setCurrentUser(userData);
  }

  async function fetchRequests() {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, verification_status, verification_front_url, verification_back_url, verification_submitted_at, school_id, schools(name, abbreviation)")
      .eq("verification_status", filter)
      .order("verification_submitted_at", { ascending: true })
      .limit(50);
    if (data) {
      setRequests(data.map((r: any) => ({ ...r, school: Array.isArray(r.schools) ? r.schools[0] ?? null : r.schools })));
    }
    setLoading(false);
  }

  async function handleApprove(userId: string) {
    setActing(userId);
    await supabase.from("users").update({
      verification_status: "approved",
      verification_reviewed_at: new Date().toISOString(),
      verified_by: currentUser?.id,
    }).eq("id", userId);
    // Award verified_student badge
    await supabase.from("user_badges").upsert({ user_id: userId, badge_code: "verified_student", awarded_by: currentUser?.id }, { onConflict: "user_id,badge_code" });
    showToast("Student verified!");
    fetchRequests();
    setActing(null);
  }

  async function handleReject(userId: string) {
    if (!rejectReason.trim()) { showToast("Please enter a rejection reason."); return; }
    setActing(userId);
    await supabase.from("users").update({
      verification_status: "rejected",
      verification_reviewed_at: new Date().toISOString(),
      verified_by: currentUser?.id,
      verification_rejection_reason: rejectReason.trim(),
    }).eq("id", userId);
    showToast("Verification rejected.");
    setShowRejectModal(null);
    setRejectReason("");
    fetchRequests();
    setActing(null);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function formatTime(ts: string | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      {toast && <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>}

      {/* Image Viewer */}
      {viewImage && (
        <>
          <div onClick={() => setViewImage(null)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.9)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center"}}>
            <img src={viewImage} alt="ID" style={{maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px"}} />
            <button onClick={() => setViewImage(null)} style={{position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.2rem", width: "36px", height: "36px", borderRadius: "50%"}}>✕</button>
          </div>
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <>
          <div onClick={() => setShowRejectModal(null)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "20px 16px 32px"}}>
            <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A", marginBottom: "12px"}}>Rejection Reason</div>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="e.g. ID is not clear, please resubmit..."
              style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            <div style={{display: "flex", gap: "10px", marginTop: "12px"}}>
              <button onClick={() => setShowRejectModal(null)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={() => handleReject(showRejectModal)} disabled={acting === showRejectModal}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>
                Reject
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{backgroundColor: "#1D9E75", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/admin")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "0", width: "36px"}}>‹</button>
        <div style={{fontWeight: 800, fontSize: "1rem", color: "#fff", letterSpacing: "0.05em"}}>VERIFICATION</div>
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
            <div style={{fontSize: "3rem", marginBottom: "12px"}}>🎓</div>
            <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem"}}>No {filter} verifications</div>
          </div>
        ) : requests.map(req => (
          <div key={req.id} style={{backgroundColor: "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0", padding: "14px 16px"}}>
            <div style={{display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px"}}>
              {req.avatar_url
                ? <img src={req.avatar_url} alt="" style={{width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover"}} />
                : <div style={{width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1rem"}}>{req.full_name?.charAt(0).toUpperCase()}</div>
              }
              <div style={{flex: 1}}>
                <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>{req.full_name}</div>
                <div style={{fontSize: "0.75rem", color: "#888"}}>{req.school?.name || "Unknown School"}</div>
                <div style={{fontSize: "0.72rem", color: "#aaa", marginTop: "2px"}}>Submitted: {formatTime(req.verification_submitted_at)}</div>
              </div>
            </div>
            <div style={{display: "flex", gap: "10px", marginBottom: "12px"}}>
              {req.verification_front_url && (
                <div onClick={() => setViewImage(req.verification_front_url)} style={{cursor: "pointer", flex: 1}}>
                  <div style={{fontSize: "0.68rem", color: "#888", fontWeight: 600, marginBottom: "4px"}}>FRONT ID</div>
                  <img src={req.verification_front_url} alt="Front ID" style={{width: "100%", height: "100px", objectFit: "cover", borderRadius: "8px", border: "1px solid #F0F0F0"}} />
                </div>
              )}
              {req.verification_back_url && (
                <div onClick={() => setViewImage(req.verification_back_url)} style={{cursor: "pointer", flex: 1}}>
                  <div style={{fontSize: "0.68rem", color: "#888", fontWeight: 600, marginBottom: "4px"}}>BACK ID</div>
                  <img src={req.verification_back_url} alt="Back ID" style={{width: "100%", height: "100px", objectFit: "cover", borderRadius: "8px", border: "1px solid #F0F0F0"}} />
                </div>
              )}
            </div>
            {filter === "pending" && (
              <div style={{display: "flex", gap: "8px"}}>
                <button onClick={() => setShowRejectModal(req.id)} disabled={acting === req.id}
                  style={{flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#EF4444", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>
                  Reject
                </button>
                <button onClick={() => handleApprove(req.id)} disabled={acting === req.id}
                  style={{flex: 1, padding: "10px", borderRadius: "10px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>
                  {acting === req.id ? "Processing..." : "Approve ✓"}
                </button>
              </div>
            )}
            {filter === "rejected" && req.verification_rejection_reason && (
              <div style={{backgroundColor: "#FEF2F2", borderRadius: "10px", padding: "10px 12px"}}>
                <div style={{fontSize: "0.72rem", color: "#EF4444", fontWeight: 700, marginBottom: "3px"}}>REJECTION REASON</div>
                <div style={{fontSize: "0.82rem", color: "#1A1A1A"}}>{req.verification_rejection_reason}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
