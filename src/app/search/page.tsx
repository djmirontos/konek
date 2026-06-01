'use client'
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type School = { id: string; name: string; abbreviation: string; };

type SearchUser = { id: string; full_name: string; avatar_url: string | null; school_id: string; isVerified?: boolean; school?: School; };
type SearchPost = { id: string; user_id: string; content: string; created_at: string; users: { full_name: string; avatar_url: string | null; } | null; };
type SearchListing = { id: string; title: string; price: number | null; images: string[] | null; school_id: string; users: { full_name: string; avatar_url: string | null; } | null; isVerified?: boolean; };
type SearchBH = { id: string; name: string; address: string | null; price_per_month: number | null; images: string[] | null; school_id: string; users: { full_name: string; avatar_url: string | null; } | null; };
type SearchQuad = { id: string; content: string; tag: string | null; created_at: string; location: string | null; users: { full_name: string; avatar_url: string | null; } | null; };

const TABS = ["All", "People", "Posts", "Bazaar", "Living", "Quad", "Schools"];

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

function VerifiedBadge() {
  return (
    <span title="Verified Student" style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: "15px", height: "15px", backgroundColor: "#1D9E75", borderRadius: "50%", marginLeft: "4px", flexShrink: 0, verticalAlign: "middle"}}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </span>
  );
}

function Skeleton() {
  return (
    <div style={{padding: "14px 16px", borderBottom: "1px solid #F0F0F0"}}>
      <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
        <div style={{width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#F0F0F0", flexShrink: 0}} />
        <div style={{flex: 1}}>
          <div style={{width: "140px", height: "13px", backgroundColor: "#F0F0F0", borderRadius: "4px", marginBottom: "7px"}} />
          <div style={{width: "90px", height: "11px", backgroundColor: "#F0F0F0", borderRadius: "4px"}} />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [allSchools, setAllSchools] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [people, setPeople] = useState<SearchUser[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [boardingHouses, setBoardingHouses] = useState<SearchBH[]>([]);
  const [quadPosts, setQuadPosts] = useState<SearchQuad[]>([]);
  const [schoolResults, setSchoolResults] = useState<School[]>([]);

  useEffect(() => {
    initPage();
    setTimeout(() => inputRef.current?.focus(), 100);
    const saved = localStorage.getItem("konek_recent_searches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    const { data: schoolData } = await supabase.from("schools").select("id, name, abbreviation").order("name");
    if (schoolData) setSchools(schoolData);
    const { data: badges } = await supabase.from("user_badges").select("user_id").eq("badge_code", "verified_student");
    if (badges) setVerifiedIds(new Set(badges.map((b: {user_id: string}) => b.user_id)));
  }

  function saveRecentSearch(q: string) {
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem("konek_recent_searches", JSON.stringify(updated));
  }

  function removeRecentSearch(q: string) {
    const updated = recentSearches.filter(s => s !== q);
    setRecentSearches(updated);
    localStorage.setItem("konek_recent_searches", JSON.stringify(updated));
  }

  const doSearch = useCallback(async (q: string) => {
    if (!currentUser || q.trim().length < 2) {
      setPeople([]); setPosts([]); setListings([]); setBoardingHouses([]); setQuadPosts([]); setSchoolResults([]);
      return;
    }
    setLoading(true);
    const schoolId = currentUser.school_id;
    const term = "%" + q.trim() + "%";

    try {
      const [peopleRes, postsRes, listingsRes, bhRes, quadRes, schoolsRes] = await Promise.all([
        supabase.from("users").select("id, full_name, avatar_url, school_id").ilike("full_name", term).limit(10),
        supabase.from("posts").select("id, user_id, content, created_at, users(full_name, avatar_url)").eq("type", "feed").eq("is_hidden", false).ilike("content", term).order("created_at", { ascending: false }).limit(10),
        supabase.from("listings").select("id, title, price, images, school_id, users(full_name, avatar_url)").eq("is_sold", false).ilike("title", term).order("created_at", { ascending: false }).limit(10),
        supabase.from("boarding_houses").select("id, name, address, price_per_month, images, school_id, users(full_name, avatar_url)").ilike("name", term).order("created_at", { ascending: false }).limit(10),
        supabase.from("posts").select("id, user_id, content, tag, created_at, location, users(full_name, avatar_url)").eq("type", "quad").eq("is_hidden", false).ilike("content", term).order("created_at", { ascending: false }).limit(10),
        supabase.from("schools").select("id, name, abbreviation").ilike("name", term).limit(10),
      ]);

      const filterBySchool = (items: any[]) => allSchools ? items : items.filter((i: any) => i.school_id === schoolId);

      setPeople((peopleRes.data || []).map((u: any) => ({ ...u, isVerified: verifiedIds.has(u.id), school: schools.find(s => s.id === u.school_id) })));
      setPosts((postsRes.data || []).map((p: any) => ({ ...p, users: Array.isArray(p.users) ? p.users[0] ?? null : p.users })));
      setListings(filterBySchool(listingsRes.data || []).map((l: any) => ({ ...l, isVerified: verifiedIds.has(l.user_id) })));
      setBoardingHouses(filterBySchool(bhRes.data || []).map((b: any) => ({ ...b, users: Array.isArray(b.users) ? b.users[0] ?? null : b.users })));
      setQuadPosts((quadRes.data || []).map((q: any) => ({ ...q, users: Array.isArray(q.users) ? q.users[0] ?? null : q.users })));
      setSchoolResults(schoolsRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [currentUser, allSchools, verifiedIds, schools]);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { doSearch(val); }, 350);
  }

  function handleRecentTap(q: string) {
    setQuery(q);
    doSearch(q);
  }

  function handleSubmit() {
    if (query.trim().length >= 2) {
      saveRecentSearch(query.trim());
      doSearch(query);
    }
  }

  const hasResults = people.length + posts.length + listings.length + boardingHouses.length + quadPosts.length + schoolResults.length > 0;

  function renderPeople() {
    return people.map(u => (
      <div key={u.id} onClick={() => router.push("/profile/" + u.id)} style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", backgroundColor: "#fff"}}>
        {u.avatar_url
          ? <img src={u.avatar_url} alt="" style={{width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
          : <div style={{width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1rem", flexShrink: 0}}>{u.full_name?.charAt(0).toUpperCase()}</div>
        }
        <div style={{flex: 1}}>
          <div style={{display: "flex", alignItems: "center", fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>{u.full_name}{u.isVerified && <VerifiedBadge />}</div>
          <div style={{fontSize: "0.75rem", color: "#888", marginTop: "2px"}}>{u.school?.abbreviation || "Student"}</div>
        </div>
      </div>
    ));
  }

  function renderPosts() {
    return posts.map(p => (
      <div key={p.id} onClick={() => router.push("/feeds/" + p.id)} style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", backgroundColor: "#fff", cursor: "pointer"}}>
        <div style={{display: "flex", gap: "10px", alignItems: "center", marginBottom: "6px"}}>
          {p.users?.avatar_url
            ? <img src={p.users.avatar_url} alt="" style={{width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover"}} />
            : <div style={{width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.8rem"}}>{p.users?.full_name?.charAt(0).toUpperCase()}</div>
          }
          <div>
            <div style={{fontWeight: 700, fontSize: "0.82rem", color: "#1A1A1A"}}>{p.users?.full_name}</div>
            <div style={{fontSize: "0.7rem", color: "#888"}}>{timeAgo(p.created_at)}</div>
          </div>
        </div>
        <div style={{fontSize: "0.85rem", color: "#444", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"}}>{p.content}</div>
      </div>
    ));
  }

  function renderListings() {
    return listings.map(l => (
      <div key={l.id} onClick={() => router.push("/bazaar/" + l.id)} style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", gap: "12px", alignItems: "center", backgroundColor: "#fff", cursor: "pointer"}}>
        {l.images?.[0]
          ? <img src={l.images[0]} alt="" style={{width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0}} />
          : <div style={{width: "56px", height: "56px", borderRadius: "10px", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0}}>🛍️</div>
        }
        <div style={{flex: 1}}>
          <div style={{fontWeight: 700, fontSize: "0.88rem", color: "#1A1A1A", marginBottom: "3px"}}>{l.title}</div>
          <div style={{fontSize: "0.82rem", color: "#1D9E75", fontWeight: 700, marginBottom: "3px"}}>₱{l.price?.toLocaleString() || "Free"}</div>
          <div style={{display: "flex", alignItems: "center", fontSize: "0.72rem", color: "#888"}}>
            {l.users?.full_name}{l.isVerified && <VerifiedBadge />}
          </div>
        </div>
      </div>
    ));
  }

  function renderBH() {
    return boardingHouses.map(b => (
      <div key={b.id} onClick={() => router.push("/living/" + b.id)} style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", gap: "12px", alignItems: "center", backgroundColor: "#fff", cursor: "pointer"}}>
        {b.images?.[0]
          ? <img src={b.images[0]} alt="" style={{width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0}} />
          : <div style={{width: "56px", height: "56px", borderRadius: "10px", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0}}>🏠</div>
        }
        <div style={{flex: 1}}>
          <div style={{fontWeight: 700, fontSize: "0.88rem", color: "#1A1A1A", marginBottom: "3px"}}>{b.name}</div>
          {b.address && <div style={{fontSize: "0.75rem", color: "#888", marginBottom: "3px"}}>📍 {b.address}</div>}
          <div style={{fontSize: "0.82rem", color: "#1D9E75", fontWeight: 700}}>₱{b.price_per_month?.toLocaleString() || "Negotiable"}/mo</div>
        </div>
      </div>
    ));
  }

  function renderQuad() {
    return quadPosts.map(q => (
      <div key={q.id} onClick={() => router.push("/feeds/" + q.id)} style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", backgroundColor: "#fff", cursor: "pointer"}}>
        <div style={{display: "flex", gap: "10px", alignItems: "center", marginBottom: "6px"}}>
          {q.users?.avatar_url
            ? <img src={q.users.avatar_url} alt="" style={{width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover"}} />
            : <div style={{width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.8rem"}}>{q.users?.full_name?.charAt(0).toUpperCase()}</div>
          }
          <div>
            <div style={{fontWeight: 700, fontSize: "0.82rem", color: "#1A1A1A"}}>{q.users?.full_name}</div>
            <div style={{fontSize: "0.7rem", color: "#888"}}>{timeAgo(q.created_at)}{q.location && " · 📍 " + q.location}</div>
          </div>
        </div>
        <div style={{fontSize: "0.85rem", color: "#444", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"}}>{q.content}</div>
        {q.tag && <div style={{display: "inline-block", backgroundColor: "#E1F5EE", color: "#0F6E56", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", marginTop: "6px", fontWeight: 600}}>{q.tag}</div>}
      </div>
    ));
  }

  function renderSchools() {
    return schoolResults.map(s => (
      <div key={s.id} style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#fff"}}>
        <div style={{width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "1rem", flexShrink: 0}}>{s.abbreviation?.charAt(0)}</div>
        <div>
          <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>{s.name}</div>
          <div style={{fontSize: "0.75rem", color: "#888"}}>{s.abbreviation}</div>
        </div>
      </div>
    ));
  }

  function renderSection(title: string, items: React.ReactNode[], count: number) {
    if (count === 0) return null;
    return (
      <div style={{marginBottom: "8px"}}>
        <div style={{padding: "8px 16px 4px", fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: "#F7F7F7"}}>{title}</div>
        {items}
      </div>
    );
  }

  function renderAll() {
    return (
      <>
        {renderSection("People", renderPeople(), people.length)}
        {renderSection("Posts", renderPosts(), posts.length)}
        {renderSection("Bazaar", renderListings(), listings.length)}
        {renderSection("Living", renderBH(), boardingHouses.length)}
        {renderSection("Quad", renderQuad(), quadPosts.length)}
        {renderSection("Schools", renderSchools(), schoolResults.length)}
      </>
    );
  }

  function renderTabContent() {
    if (loading) return [1,2,3,4].map(i => <Skeleton key={i} />);
    if (!hasResults && query.length >= 2) {
      return (
        <div style={{textAlign: "center", padding: "60px 24px"}}>
          <div style={{fontSize: "2.5rem", marginBottom: "12px"}}>🔍</div>
          <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "6px"}}>No results found</div>
          <div style={{fontSize: "0.82rem", color: "#888"}}>Try different keywords or switch to All Schools</div>
        </div>
      );
    }
    switch (activeTab) {
      case "All": return renderAll();
      case "People": return renderPeople();
      case "Posts": return renderPosts();
      case "Bazaar": return renderListings();
      case "Living": return renderBH();
      case "Quad": return renderQuad();
      case "Schools": return renderSchools();
      default: return renderAll();
    }
  }

  return (
    <div style={{minHeight: "100vh", backgroundColor: "#F7F7F7", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", flexDirection: "column"}}>

      {/* SEARCH HEADER */}
      <div style={{backgroundColor: "#1D9E75", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.back()} style={{background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer", padding: "4px", lineHeight: 1, flexShrink: 0}}>←</button>
        <div style={{flex: 1, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "12px", display: "flex", alignItems: "center", padding: "8px 12px", gap: "8px"}}>
          <span style={{color: "rgba(255,255,255,0.8)", fontSize: "1rem"}}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Search Konek..."
            style={{flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: "0.9rem", fontFamily: "inherit"}}
          />
          {query.length > 0 && (
            <button onClick={() => { setQuery(""); setPeople([]); setPosts([]); setListings([]); setBoardingHouses([]); setQuadPosts([]); setSchoolResults([]); }} style={{background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: "1rem", padding: "0", lineHeight: 1}}>✕</button>
          )}
        </div>
      </div>

      {/* SCHOOL SCOPE TOGGLE */}
      <div style={{backgroundColor: "#fff", padding: "10px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: "12px"}}>
        <span style={{fontSize: "0.78rem", color: "#888", fontWeight: 600}}>Scope:</span>
        <button onClick={() => { setAllSchools(false); if (query.length >= 2) doSearch(query); }}
          style={{padding: "4px 12px", borderRadius: "20px", border: "none", backgroundColor: !allSchools ? "#1D9E75" : "#F0F0F0", color: !allSchools ? "#fff" : "#888", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>
          My School
        </button>
        <button onClick={() => { setAllSchools(true); if (query.length >= 2) doSearch(query); }}
          style={{padding: "4px 12px", borderRadius: "20px", border: "none", backgroundColor: allSchools ? "#1D9E75" : "#F0F0F0", color: allSchools ? "#fff" : "#888", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>
          All Schools
        </button>
      </div>

      {/* TABS */}
      {query.length >= 2 && (
        <div style={{backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", display: "flex", overflowX: "auto", scrollbarWidth: "none", position: "sticky", top: "60px", zIndex: 99}}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{flexShrink: 0, padding: "10px 14px", border: "none", background: "none", fontFamily: "inherit", fontWeight: activeTab === tab ? 700 : 500, fontSize: "0.8rem", color: activeTab === tab ? "#1D9E75" : "#888", borderBottom: activeTab === tab ? "2px solid #1D9E75" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap"}}>
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* RECENT SEARCHES */}
      {query.length === 0 && recentSearches.length > 0 && (
        <div style={{backgroundColor: "#fff", marginBottom: "8px"}}>
          <div style={{padding: "12px 16px 4px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <span style={{fontSize: "0.78rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em"}}>Recent</span>
            <button onClick={() => { setRecentSearches([]); localStorage.removeItem("konek_recent_searches"); }} style={{background: "none", border: "none", color: "#1D9E75", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>Clear all</button>
          </div>
          {recentSearches.map(s => (
            <div key={s} style={{display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #F0F0F0", gap: "12px"}}>
              <span style={{fontSize: "1rem", color: "#888"}}>🕐</span>
              <span onClick={() => handleRecentTap(s)} style={{flex: 1, fontSize: "0.88rem", color: "#1A1A1A", cursor: "pointer"}}>{s}</span>
              <button onClick={() => removeRecentSearch(s)} style={{background: "none", border: "none", color: "#bbb", cursor: "pointer", fontSize: "1rem", padding: "0", lineHeight: 1}}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {query.length === 0 && recentSearches.length === 0 && (
        <div style={{textAlign: "center", padding: "60px 24px"}}>
          <div style={{fontSize: "3rem", marginBottom: "12px"}}>🔍</div>
          <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "6px"}}>Search Konek</div>
          <div style={{fontSize: "0.82rem", color: "#888"}}>Find students, posts, listings, rooms, and more</div>
        </div>
      )}

      {/* RESULTS */}
      {query.length >= 2 && (
        <div style={{flex: 1}}>
          {renderTabContent()}
        </div>
      )}

    </div>
  );
}
