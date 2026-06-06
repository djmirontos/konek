'use client'
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type ErrorLog = {
  id: string;
  created_at: string;
  user_id: string | null;
  module: string;
  action: string;
  error_message: string;
  error_stack: string;
  metadata: Record<string, unknown>;
  users?: { full_name: string } | null;
};

const MODULE_COLORS: Record<string, string> = {
  feeds: "#3B82F6",
  soapbox: "#8B5CF6",
  bazaar: "#F59E0B",
  living: "#10B981",
  messages: "#EC4899",
  auth: "#EF4444",
  profile: "#6366F1",
  admin: "#F97316",
};

function timeAgo(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (d < 60) return d + "s ago";
  if (d < 3600) return Math.floor(d / 60) + "m ago";
  if (d < 86400) return Math.floor(d / 3600) + "h ago";
  return Math.floor(d / 86400) + "d ago";
}

export default function AdminErrorsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [modules, setModules] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { initPage(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!userData || !["admin", "moderator"].includes(userData.role)) { router.push("/feeds"); return; }
    fetchLogs();
  }

  async function fetchLogs() {
    setLoading(true);
    const query = supabase
      .from("error_logs")
      .select("id, created_at, user_id, module, action, error_message, error_stack, metadata, users(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (moduleFilter !== "all") query.eq("module", moduleFilter);

    const { data } = await query;
    if (data) {
      setLogs(data as any);
      const uniqueModules = [...new Set(data.map((l: any) => l.module))];
      setModules(uniqueModules);
    }
    setLoading(false);
  }

  async function clearAllLogs() {
    setClearing(true);
    await supabase.from("error_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setLogs([]);
    setClearing(false);
    showToast("All error logs cleared.");
  }

  useEffect(() => { fetchLogs(); }, [moduleFilter]);

  return (
    <div style={{minHeight: "100vh", backgroundColor: "#F7F7F7", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: "40px"}}>

      {/* Header */}
      <div style={{backgroundColor: "#2BB39A", padding: "16px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/admin")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.2rem", padding: "4px"}}>←</button>
        <div style={{flex: 1}}>
          <div style={{color: "#fff", fontWeight: 700, fontSize: "1rem"}}>Error Logs</div>
          <div style={{color: "rgba(255,255,255,0.8)", fontSize: "0.72rem"}}>{logs.length} errors logged</div>
        </div>
        <button onClick={fetchLogs} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.1rem"}}>↻</button>
      </div>

      {/* Module Filter */}
      <div style={{backgroundColor: "#fff", padding: "10px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", gap: "6px", overflowX: "auto"}}>
        {["all", ...modules].map(m => (
          <button key={m} onClick={() => setModuleFilter(m)}
            style={{padding: "5px 12px", borderRadius: "20px", border: "none", whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: moduleFilter === m ? 700 : 500,
              backgroundColor: moduleFilter === m ? (MODULE_COLORS[m] || "#2BB39A") : "#F7F7F7",
              color: moduleFilter === m ? "#fff" : "#555"}}>
            {m === "all" ? "All" : m}
          </button>
        ))}
      </div>

      <div style={{padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px"}}>

        {/* Clear All Button */}
        {logs.length > 0 && (
          <button onClick={clearAllLogs} disabled={clearing}
            style={{width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2", color: "#EF4444", fontWeight: 700, fontSize: "0.82rem", cursor: clearing ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
            {clearing ? "Clearing..." : "Clear All Logs"}
          </button>
        )}

        {/* Logs List */}
        {loading ? (
          <div style={{textAlign: "center", padding: "40px", color: "#888"}}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{textAlign: "center", padding: "40px"}}>
            <div style={{fontSize: "2.5rem", marginBottom: "8px"}}>✅</div>
            <div style={{fontWeight: 700, color: "#1a1a1a", marginBottom: "4px"}}>No errors logged</div>
            <div style={{fontSize: "0.82rem", color: "#888"}}>Everything is running smoothly.</div>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} onClick={() => setSelectedLog(log)}
              style={{backgroundColor: "#fff", borderRadius: "12px", padding: "12px 14px", border: "1px solid #F0F0F0", cursor: "pointer"}}>
              <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px"}}>
                <span style={{padding: "2px 8px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: 700, backgroundColor: MODULE_COLORS[log.module] || "#888", color: "#fff"}}>
                  {log.module}
                </span>
                <span style={{fontSize: "0.72rem", color: "#888"}}>{log.action}</span>
                <span style={{marginLeft: "auto", fontSize: "0.65rem", color: "#aaa"}}>{timeAgo(log.created_at)}</span>
              </div>
              <div style={{fontSize: "0.8rem", color: "#EF4444", fontWeight: 600, marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                {log.error_message}
              </div>
              <div style={{fontSize: "0.7rem", color: "#888"}}>
                {log.users?.full_name || (log.user_id ? "User " + log.user_id.slice(0, 8) : "Anonymous")}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Detail Modal */}
      {selectedLog && (
        <>
          <div onClick={() => setSelectedLog(null)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 200}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px,100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 201, maxHeight: "80vh", overflowY: "auto"}}>
            <div style={{padding: "16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, backgroundColor: "#fff"}}>
              <div style={{fontWeight: 700, fontSize: "0.95rem"}}>Error Detail</div>
              <button onClick={() => setSelectedLog(null)} style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#888"}}>✕</button>
            </div>
            <div style={{padding: "16px", display: "flex", flexDirection: "column", gap: "12px"}}>
              <div style={{display: "flex", gap: "8px", flexWrap: "wrap"}}>
                <span style={{padding: "3px 10px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: MODULE_COLORS[selectedLog.module] || "#888", color: "#fff"}}>{selectedLog.module}</span>
                <span style={{padding: "3px 10px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#F7F7F7", color: "#555"}}>{selectedLog.action}</span>
              </div>
              {[
                { label: "Time", value: new Date(selectedLog.created_at).toLocaleString() },
                { label: "User", value: selectedLog.users?.full_name || selectedLog.user_id || "Anonymous" },
                { label: "Error", value: selectedLog.error_message },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{fontSize: "0.68rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px"}}>{label}</div>
                  <div style={{fontSize: "0.82rem", color: "#1a1a1a", backgroundColor: "#F7F7F7", borderRadius: "8px", padding: "8px 10px"}}>{value}</div>
                </div>
              ))}
              {selectedLog.error_stack && (
                <div>
                  <div style={{fontSize: "0.68rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px"}}>Stack Trace</div>
                  <pre style={{fontSize: "0.65rem", color: "#EF4444", backgroundColor: "#FEF2F2", borderRadius: "8px", padding: "10px", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0}}>{selectedLog.error_stack}</pre>
                </div>
              )}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div style={{fontSize: "0.68rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px"}}>Metadata</div>
                  <pre style={{fontSize: "0.65rem", color: "#555", backgroundColor: "#F7F7F7", borderRadius: "8px", padding: "10px", overflowX: "auto", whiteSpace: "pre-wrap", margin: 0}}>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1a1a1a", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600, zIndex: 500, whiteSpace: "nowrap"}}>
          {toast}
        </div>
      )}
    </div>
  );
}
