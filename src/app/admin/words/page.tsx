'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Word = { id: string; word: string; type: string; is_active: boolean; created_at: string; };

export default function AdminWordsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"adjective" | "noun">("adjective");
  const [newWord, setNewWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewPseudonym, setPreviewPseudonym] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (words.length > 0) generatePreview(); }, [words]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!userData || userData.role !== "admin") { router.push("/admin"); return; }
    fetchWords();
  }

  async function fetchWords() {
    setLoading(true);
    const { data } = await supabase
      .from("pseudonym_words")
      .select("id, word, type, is_active, created_at")
      .order("word");
    if (data) setWords(data);
    setLoading(false);
  }

  function generatePreview() {
    const adjs = words.filter(w => w.type === "adjective" && w.is_active).map(w => w.word);
    const nouns = words.filter(w => w.type === "noun" && w.is_active).map(w => w.word);
    if (adjs.length === 0 || nouns.length === 0) return;
    const adj = adjs[Math.floor(Math.random() * adjs.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    setPreviewPseudonym(adj + " na " + noun + " #" + num);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleAdd() {
    const clean = newWord.trim();
    if (!clean) return;
    setAdding(true);
    const { error } = await supabase.from("pseudonym_words").insert({ word: clean, type: activeTab, is_active: true });
    if (error) { showToast("Error: " + error.message); }
    else { showToast(clean + " added!"); setNewWord(""); fetchWords(); }
    setAdding(false);
  }

  async function handleToggle(word: Word) {
    await supabase.from("pseudonym_words").update({ is_active: !word.is_active }).eq("id", word.id);
    setWords(prev => prev.map(w => w.id === word.id ? { ...w, is_active: !w.is_active } : w));
    showToast(word.word + (word.is_active ? " deactivated" : " activated"));
  }

  async function handleDelete(word: Word) {
    if (!confirm("Delete \"" + word.word + "\"? This cannot be undone.")) return;
    await supabase.from("pseudonym_words").delete().eq("id", word.id);
    setWords(prev => prev.filter(w => w.id !== word.id));
    showToast(word.word + " deleted!");
  }

  async function handleSaveEdit(id: string) {
    const clean = editWord.trim();
    if (!clean) return;
    setSaving(true);
    await supabase.from("pseudonym_words").update({ word: clean }).eq("id", id);
    setWords(prev => prev.map(w => w.id === id ? { ...w, word: clean } : w));
    setEditingId(null);
    setEditWord("");
    setSaving(false);
    showToast("Word updated!");
  }

  const filtered = words.filter(w =>
    w.type === activeTab &&
    w.word.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = filtered.filter(w => w.is_active).length;
  const inactiveCount = filtered.filter(w => !w.is_active).length;

  return (
    <div style={{minHeight: "100vh", background: "#F0F2F5", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      {toast && <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>}

      {/* Header */}
      <div style={{backgroundColor: "#2BB39A", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.push("/admin")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "0", width: "36px"}}>‹</button>
        <div style={{fontWeight: 800, fontSize: "1rem", color: "#fff", letterSpacing: "0.05em"}}>WORD MANAGER</div>
        <div style={{width: "36px"}}></div>
      </div>

      {/* Preview Card */}
      <div style={{margin: "12px 12px 0", backgroundColor: "#fff", borderRadius: "14px", padding: "14px 16px", boxShadow: "0 2px 8px rgba(43,179,154,0.1)", border: "1.5px solid #CBF7E5"}}>
        <div style={{fontSize: "0.7rem", color: "#2BB39A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px"}}>Sample Pseudonym Preview</div>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <div style={{fontWeight: 800, fontSize: "1rem", color: "#0F2E27"}}>{previewPseudonym || "Loading..."}</div>
          <button onClick={generatePreview} style={{background: "none", border: "1px solid #2BB39A", borderRadius: "20px", padding: "4px 12px", fontSize: "0.75rem", color: "#2BB39A", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>🎲 Shuffle</button>
        </div>
        <div style={{fontSize: "0.7rem", color: "#888", marginTop: "6px"}}>
          {words.filter(w => w.type === "adjective" && w.is_active).length} active adjectives · {words.filter(w => w.type === "noun" && w.is_active).length} active nouns
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{display: "flex", backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", margin: "12px 0 0"}}>
        {(["adjective", "noun"] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSearch(""); setEditingId(null); }}
            style={{flex: 1, padding: "12px 0", border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", color: activeTab === tab ? "#2BB39A" : "#888", borderBottom: activeTab === tab ? "2px solid #2BB39A" : "2px solid transparent", textTransform: "capitalize"}}>
            {tab === "adjective" ? "🎭 Adjectives" : "🐟 Nouns"} ({words.filter(w => w.type === tab && w.is_active).length})
          </button>
        ))}
      </div>

      {/* Add New Word */}
      <div style={{padding: "12px 12px 0"}}>
        <div style={{backgroundColor: "#fff", borderRadius: "14px", padding: "12px 14px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", display: "flex", gap: "8px", alignItems: "center"}}>
          <input
            type="text"
            placeholder={"Add new " + activeTab + "..."}
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            style={{flex: 1, border: "1px solid #E8F8F5", borderRadius: "10px", padding: "8px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7"}}
          />
          <button onClick={handleAdd} disabled={adding || !newWord.trim()}
            style={{backgroundColor: adding || !newWord.trim() ? "#ccc" : "#2BB39A", color: "#fff", border: "none", borderRadius: "10px", padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: adding || !newWord.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
            {adding ? "..." : "+ Add"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{padding: "10px 12px 0"}}>
        <input
          type="text"
          placeholder={"Search " + activeTab + "s..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "8px 12px", fontSize: "0.82rem", fontFamily: "inherit", outline: "none", backgroundColor: "#fff", boxSizing: "border-box"}}
        />
      </div>

      {/* Stats */}
      <div style={{padding: "8px 12px 4px", display: "flex", gap: "8px"}}>
        <span style={{fontSize: "0.72rem", color: "#2BB39A", fontWeight: 600, backgroundColor: "#E1F5EE", padding: "2px 8px", borderRadius: "8px"}}>✓ {activeCount} active</span>
        {inactiveCount > 0 && <span style={{fontSize: "0.72rem", color: "#888", fontWeight: 600, backgroundColor: "#F0F0F0", padding: "2px 8px", borderRadius: "8px"}}>✕ {inactiveCount} inactive</span>}
      </div>

      {/* Word List */}
      <div style={{flex: 1, padding: "0 12px 80px"}}>
        {loading ? (
          <div style={{textAlign: "center", padding: "32px", color: "#888"}}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign: "center", padding: "32px"}}>
            <div style={{fontSize: "2.5rem", marginBottom: "8px"}}>🔍</div>
            <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "0.95rem"}}>No words found</div>
          </div>
        ) : filtered.map(word => (
          <div key={word.id} style={{backgroundColor: "#fff", borderRadius: "12px", padding: "10px 14px", marginBottom: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "10px", opacity: word.is_active ? 1 : 0.5}}>
            {editingId === word.id ? (
              <>
                <input
                  value={editWord}
                  onChange={e => setEditWord(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveEdit(word.id)}
                  autoFocus
                  style={{flex: 1, border: "1px solid #2BB39A", borderRadius: "8px", padding: "6px 10px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none"}}
                />
                <button onClick={() => handleSaveEdit(word.id)} disabled={saving}
                  style={{backgroundColor: "#2BB39A", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>
                  {saving ? "..." : "Save"}
                </button>
                <button onClick={() => { setEditingId(null); setEditWord(""); }}
                  style={{background: "none", border: "1px solid #F0F0F0", borderRadius: "8px", padding: "6px 10px", fontSize: "0.75rem", color: "#888", cursor: "pointer", fontFamily: "inherit"}}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div style={{flex: 1}}>
                  <span style={{fontWeight: 600, fontSize: "0.875rem", color: word.is_active ? "#1A1A1A" : "#aaa"}}>{word.word}</span>
                  {!word.is_active && <span style={{fontSize: "0.68rem", color: "#aaa", marginLeft: "6px", fontStyle: "italic"}}>inactive</span>}
                </div>
                <button onClick={() => { setEditingId(word.id); setEditWord(word.word); }}
                  style={{background: "none", border: "1px solid #F0F0F0", borderRadius: "8px", padding: "5px 10px", fontSize: "0.72rem", color: "#555", cursor: "pointer", fontFamily: "inherit"}}>
                  ✏️
                </button>
                <button onClick={() => handleToggle(word)}
                  style={{background: "none", border: "1px solid " + (word.is_active ? "#F59E0B" : "#2BB39A"), borderRadius: "8px", padding: "5px 10px", fontSize: "0.72rem", color: word.is_active ? "#F59E0B" : "#2BB39A", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
                  {word.is_active ? "Hide" : "Show"}
                </button>
                <button onClick={() => handleDelete(word)}
                  style={{background: "none", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "5px 10px", fontSize: "0.72rem", color: "#EF4444", cursor: "pointer", fontFamily: "inherit"}}>
                  🗑️
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
