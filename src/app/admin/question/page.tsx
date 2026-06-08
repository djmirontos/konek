'use client'
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type School = { id: string; name: string; abbreviation: string; };
type Question = { id: string; question: string; asked_date: string; school_id: string; };
type BankQuestion = { id: string; question: string; created_at: string; is_active: boolean; };

export default function AdminQuestionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [todayQuestion, setTodayQuestion] = useState<Question | null>(null);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [answerCount, setAnswerCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"today"|"bank"|"add">("today");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showDeleteBank, setShowDeleteBank] = useState<string | null>(null);

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (selectedSchool) fetchTodayQuestion(); }, [selectedSchool]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!userData || !["admin", "moderator"].includes(userData.role)) { router.push("/feeds"); return; }
    const { data: schoolData } = await supabase.from("schools").select("id, name, abbreviation").order("name");
    if (schoolData) { setSchools(schoolData); if (schoolData.length > 0) setSelectedSchool(schoolData[0].id); }
    fetchBankQuestions();
  }

  async function fetchTodayQuestion() {
    if (!selectedSchool) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("daily_questions").select("id, question, asked_date, school_id").eq("school_id", selectedSchool).eq("asked_date", today).maybeSingle();
    setTodayQuestion(data || null);
    if (data) {
      const { count } = await supabase.from("question_answers").select("id", { count: "exact", head: true }).eq("question_id", data.id);
      setAnswerCount(count || 0);
    } else { setAnswerCount(0); }
  }

  async function fetchBankQuestions() {
    const { data } = await supabase.from("question_bank").select("id, question, created_at, is_active").order("created_at", { ascending: false });
    if (data) setBankQuestions(data);
  }

  async function postQuestion(q: string) {
    if (!q.trim() || !selectedSchool) return;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("daily_questions").upsert({
      school_id: selectedSchool, question: q.trim(), asked_date: today, created_by: user?.id
    }, { onConflict: "school_id,asked_date" });
    if (!error) { showToast("Question posted!"); setCustomQuestion(""); fetchTodayQuestion(); setActiveTab("today"); }
    else showToast("Error: " + error.message);
    setLoading(false);
  }

  async function deleteToday() {
    if (!todayQuestion) return;
    await supabase.from("daily_questions").delete().eq("id", todayQuestion.id);
    setTodayQuestion(null); setAnswerCount(0); showToast("Question deleted.");
  }

  async function addToBank() {
    if (!customQuestion.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("question_bank").insert({ question: customQuestion.trim(), created_by: user?.id });
    if (!error) { showToast("Added to bank!"); setCustomQuestion(""); fetchBankQuestions(); }
    setLoading(false);
  }

  async function updateBankQuestion() {
    if (!editingId || !editText.trim()) return;
    await supabase.from("question_bank").update({ question: editText.trim() }).eq("id", editingId);
    setEditingId(null); setEditText(""); fetchBankQuestions(); showToast("Question updated!");
  }

  async function deleteBankQuestion(id: string) {
    await supabase.from("question_bank").delete().eq("id", id);
    setShowDeleteBank(null); fetchBankQuestions(); showToast("Question removed from bank.");
  }

  const school = schools.find(s => s.id === selectedSchool);

  return (
    <div style={{minHeight: "100vh", backgroundColor: "#F7F7F7", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: "40px"}}>

      {/* Header */}
      <div style={{backgroundColor: "#2BB39A", padding: "16px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/admin")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.2rem", padding: "4px"}}>←</button>
        <div>
          <div style={{color: "#fff", fontWeight: 700, fontSize: "1rem"}}>Question of the Day</div>
          <div style={{color: "rgba(255,255,255,0.8)", fontSize: "0.72rem"}}>Manage daily questions per school</div>
        </div>
      </div>

      {/* School Selector */}
      <div style={{backgroundColor: "#fff", padding: "12px 16px", borderBottom: "1px solid #F0F0F0"}}>
        <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}
          style={{width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #E0E0E0", fontSize: "0.9rem", fontFamily: "inherit", color: "#1a1a1a", backgroundColor: "#F7F7F7", outline: "none"}}>
          {schools.map(s => <option key={s.id} value={s.id}>{s.abbreviation} — {s.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={{backgroundColor: "#fff", display: "flex", borderBottom: "1px solid #F0F0F0"}}>
        {(["today", "bank", "add"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{flex: 1, padding: "12px 0", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: activeTab === tab ? 700 : 500, fontSize: "0.82rem", color: activeTab === tab ? "#2BB39A" : "#888", borderBottom: activeTab === tab ? "2px solid #2BB39A" : "2px solid transparent"}}>
            {tab === "today" ? "📅 Today" : tab === "bank" ? "📚 Bank" : "➕ Add New"}
          </button>
        ))}
      </div>

      <div style={{padding: "16px", display: "flex", flexDirection: "column", gap: "12px"}}>

        {/* TODAY TAB */}
        {activeTab === "today" && (
          <>
            <div style={{backgroundColor: "#fff", borderRadius: "14px", padding: "14px 16px"}}>
              <div style={{fontSize: "0.72rem", fontWeight: 700, color: "#888", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em"}}>Today for {school?.abbreviation}</div>
              {todayQuestion ? (
                <>
                  <div style={{backgroundColor: "#E8F8F5", borderRadius: "10px", padding: "12px", marginBottom: "10px"}}>
                    <p style={{margin: "0 0 6px", fontWeight: 700, fontSize: "0.9rem", color: "#0F2E27"}}>{todayQuestion.question}</p>
                    <div style={{fontSize: "0.72rem", color: "#2BB39A", fontWeight: 600}}>{answerCount} answer{answerCount !== 1 ? "s" : ""} so far</div>
                  </div>
                  <button onClick={deleteToday} style={{width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2", color: "#EF4444", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>
                    Delete Today's Question
                  </button>
                </>
              ) : (
                <div style={{textAlign: "center", padding: "20px 0"}}>
                  <div style={{fontSize: "2rem", marginBottom: "8px"}}>💬</div>
                  <div style={{color: "#888", fontSize: "0.85rem", marginBottom: "12px"}}>No question set for today.</div>
                  <button onClick={() => setActiveTab("bank")} style={{backgroundColor: "#2BB39A", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 20px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>
                    Pick from Bank
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* BANK TAB */}
        {activeTab === "bank" && (
          <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
            {bankQuestions.map(q => (
              <div key={q.id} style={{backgroundColor: "#fff", borderRadius: "12px", padding: "12px 14px", border: "1px solid #F0F0F0"}}>
                {editingId === q.id ? (
                  <>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                      style={{width: "100%", border: "1px solid #E0E0E0", borderRadius: "8px", padding: "8px", fontSize: "0.85rem", fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box"}} />
                    <div style={{display: "flex", gap: "8px", marginTop: "8px"}}>
                      <button onClick={updateBankQuestion} style={{flex: 1, padding: "8px", borderRadius: "8px", border: "none", backgroundColor: "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit"}}>Save</button>
                      <button onClick={() => { setEditingId(null); setEditText(""); }} style={{flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #E0E0E0", backgroundColor: "#F7F7F7", color: "#555", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{margin: "0 0 10px", fontSize: "0.85rem", color: "#1a1a1a", lineHeight: 1.4}}>{q.question}</p>
                    <div style={{display: "flex", gap: "6px"}}>
                      <button onClick={() => postQuestion(q.question)} disabled={loading}
                        style={{flex: 2, padding: "7px", borderRadius: "8px", border: "none", backgroundColor: "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit"}}>
                        Post Today
                      </button>
                      <button onClick={() => { setEditingId(q.id); setEditText(q.question); }}
                        style={{flex: 1, padding: "7px", borderRadius: "8px", border: "1px solid #E0E0E0", backgroundColor: "#F7F7F7", color: "#555", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit"}}>
                        Edit
                      </button>
                      <button onClick={() => setShowDeleteBank(q.id)}
                        style={{flex: 1, padding: "7px", borderRadius: "8px", border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2", color: "#EF4444", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit"}}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ADD NEW TAB */}
        {activeTab === "add" && (
          <div style={{backgroundColor: "#fff", borderRadius: "14px", padding: "14px 16px"}}>
            <div style={{fontSize: "0.72rem", fontWeight: 700, color: "#888", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em"}}>New Question</div>
            <textarea value={customQuestion} onChange={e => setCustomQuestion(e.target.value)}
              placeholder="Type your question here..." rows={4}
              style={{width: "100%", border: "1px solid #E0E0E0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.9rem", fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box", color: "#1a1a1a"}} />
            <div style={{display: "flex", gap: "8px", marginTop: "10px"}}>
              <button onClick={addToBank} disabled={loading || !customQuestion.trim()}
                style={{flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #2BB39A", backgroundColor: "#fff", color: "#2BB39A", fontWeight: 700, fontSize: "0.85rem", cursor: loading || !customQuestion.trim() ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                Save to Bank
              </button>
              <button onClick={() => postQuestion(customQuestion)} disabled={loading || !customQuestion.trim()}
                style={{flex: 1, padding: "11px", borderRadius: "10px", border: "none", backgroundColor: loading || !customQuestion.trim() ? "#ccc" : "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: loading || !customQuestion.trim() ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                Post Today
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Bank Confirm */}
      {showDeleteBank && (
        <div style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"}}>
          <div style={{backgroundColor: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "320px", textAlign: "center"}}>
            <div style={{fontSize: "1.8rem", marginBottom: "10px"}}>🗑️</div>
            <h3 style={{margin: "0 0 8px", fontSize: "1rem", fontWeight: 700}}>Delete this question?</h3>
            <p style={{margin: "0 0 20px", fontSize: "0.82rem", color: "#888"}}>This will permanently remove it from the question bank.</p>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowDeleteBank(null)} style={{flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #E0E0E0", background: "#F7F7F7", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer"}}>Cancel</button>
              <button onClick={() => deleteBankQuestion(showDeleteBank)} style={{flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#EF4444", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer"}}>Delete</button>
            </div>
          </div>
        </div>
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
