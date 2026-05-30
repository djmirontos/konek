'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type School = { id: string; name: string; abbreviation: string; };
type ProfileUser = {
  id: string; full_name: string; avatar_url: string | null;
  school_id: string; role: string; bio: string | null;
  phone_number: string | null; created_at: string;
};
type Post = {
  id: string; content: string; tag: string | null; type: string;
  images: string[] | null; created_at: string;
};
type Listing = {
  id: string; title: string; price: number | null; images: string[] | null;
  category: string; condition: string; is_sold: boolean; created_at: string;
};
type LivingPost = {
  id: string; title: string; description: string; price_per_month: number | null;
  post_type: string; address: string | null; images: string[] | null;
  is_fully_booked: boolean; created_at: string;
};

const TABS = ["Posts", "Bazaar", "Living", "About"];

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params?.id as string;
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<ProfileUser | null>(null);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeTab, setActiveTab] = useState("Posts");
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const [postCount, setPostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [reactionsReceived, setReactionsReceived] = useState(0);

  const [posts, setPosts] = useState<Post[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [livingPosts, setLivingPosts] = useState<LivingPost[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [hasLiving, setHasLiving] = useState(false);

  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [toast, setToast] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => { initPage(); }, [profileId]);
  useEffect(() => { if (profileUser) fetchTabData(activeTab); }, [activeTab, profileUser]);

  async function initPage() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: meData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (meData) setCurrentUser(meData);

    const { data: schoolData } = await supabase.from("schools").select("id, name, abbreviation").order("name");
    if (schoolData) setSchools(schoolData);

    const targetId = profileId || user.id;
    const own = targetId === user.id;
    setIsOwnProfile(own);

    const { data: profileData } = await supabase.from("users").select("*").eq("id", targetId).single();
    if (profileData) {
      setProfileUser(profileData);
      setEditBio(profileData.bio || "");
      setEditPhone(profileData.phone_number || "");
    }

    await fetchStats(targetId);

    const { count: livingCount } = await supabase
      .from("boarding_houses").select("id", { count: "exact", head: true })
      .eq("user_id", targetId).eq("is_hidden", false);
    setHasLiving((livingCount || 0) > 0);

    setLoading(false);
  }

  async function fetchStats(userId: string) {
    const { count: pCount } = await supabase
      .from("posts").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("is_hidden", false)
      .in("type", ["feed", "quad"]);
    setPostCount(pCount || 0);

    const { count: cCount } = await supabase
      .from("comments").select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    setCommentCount(cCount || 0);

    const { data: userPosts } = await supabase
      .from("posts").select("id").eq("user_id", userId).eq("is_hidden", false);
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map((p: any) => p.id);
      const { count: rCount } = await supabase
        .from("reactions").select("id", { count: "exact", head: true })
        .in("post_id", postIds);
      setReactionsReceived(rCount || 0);
    } else {
      setReactionsReceived(0);
    }
  }

  async function fetchTabData(tab: string) {
    if (!profileUser) return;
    setLoadingTab(true);
    try {
      if (tab === "Posts") {
        const { data } = await supabase
          .from("posts").select("id, content, tag, type, images, created_at")
          .eq("user_id", profileUser.id).eq("is_hidden", false)
          .in("type", ["feed", "quad"])
          .order("created_at", { ascending: false }).limit(30);
        setPosts(data || []);
      } else if (tab === "Bazaar") {
        const { data } = await supabase
          .from("listings").select("id, title, price, images, category, condition, is_sold, created_at")
          .eq("user_id", profileUser.id).eq("is_hidden", false)
          .order("created_at", { ascending: false }).limit(30);
        setListings(data || []);
      } else if (tab === "Living") {
        const { data } = await supabase
          .from("boarding_houses").select("id, title, description, price_per_month, post_type, address, images, is_fully_booked, created_at")
          .eq("user_id", profileUser.id).eq("is_hidden", false)
          .order("created_at", { ascending: false }).limit(30);
        setLivingPosts(data || []);
      }
    } catch (err) {
      console.error("fetchTabData error:", err);
    } finally {
      setLoadingTab(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${currentUser.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
      const { error: updateError } = await supabase.from("users").update({ avatar_url: urlData.publicUrl }).eq("id", currentUser.id);
      if (updateError) throw updateError;
      setProfileUser(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
      setCurrentUser(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
      showToast("Avatar updated!");
    } catch (err) {
      showToast("Failed to update avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile() {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("users").update({
        bio: editBio.trim() || null,
        phone_number: editPhone.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", currentUser.id);
      if (error) throw error;
      setProfileUser(prev => prev ? { ...prev, bio: editBio.trim() || null, phone_number: editPhone.trim() || null } : prev);
      setShowEditSheet(false);
      showToast("Profile updated!");
    } catch (err) {
      showToast("Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function formatTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function formatMemberSince(ts: string) {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function getSchool(schoolId: string) {
    return schools.find(s => s.id === schoolId);
  }

  function formatPrice(p: number | null) {
    if (!p) return "Free";
    return "\u20b1" + p.toLocaleString();
  }

  if (loading) {
    return (
      <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
        <style>{`@keyframes shimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } }`}</style>
        <div style={{backgroundColor: "#1D9E75", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px"}}>
          <div style={{width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,255,255,0.3)"}} />
          <div style={{height: "16px", width: "100px", borderRadius: "8px", background: "rgba(255,255,255,0.3)"}} />
        </div>
        <div style={{backgroundColor: "#fff", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px"}}>
          <div style={{width: "88px", height: "88px", borderRadius: "50%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear"}} />
          <div style={{height: "16px", width: "140px", borderRadius: "8px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear"}} />
          <div style={{height: "12px", width: "80px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear"}} />
        </div>
        <BottomNav active="/feeds" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif", alignItems: "center", justifyContent: "center"}}>
        <div style={{fontSize: "3rem", marginBottom: "12px"}}>😕</div>
        <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem"}}>User not found</div>
        <button onClick={() => router.back()} style={{marginTop: "16px", padding: "10px 24px", backgroundColor: "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Go Back</button>
      </div>
    );
  }

  const school = getSchool(profileUser.school_id);
  const visibleTabs = hasLiving ? TABS : TABS.filter(t => t !== "Living");

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      <div style={{backgroundColor: "#1D9E75", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.back()} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "2px 4px", display: "flex", alignItems: "center", lineHeight: 1}}>&#8249;</button>
        <span style={{color: "#fff", fontWeight: 700, fontSize: "1rem"}}>{isOwnProfile ? "My Profile" : profileUser.full_name}</span>
      </div>

      <div style={{backgroundColor: "#fff", padding: "24px 16px 16px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid #F0F0F0"}}>
        <div style={{position: "relative", marginBottom: "12px"}}>
          {profileUser.avatar_url
            ? <img src={profileUser.avatar_url} alt="avatar" style={{width: "88px", height: "88px", borderRadius: "50%", objectFit: "cover", border: "3px solid #1D9E75"}} />
            : <div style={{width: "88px", height: "88px", borderRadius: "50%", backgroundColor: "#E1F5EE", border: "3px solid #1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "2rem"}}>{profileUser.full_name?.charAt(0).toUpperCase()}</div>
          }
          {isOwnProfile && (
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
              style={{position: "absolute", bottom: "0", right: "0", backgroundColor: "#1D9E75", border: "2px solid #fff", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.7rem"}}>
              {uploadingAvatar ? "⏳" : "📷"}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleAvatarChange} />
        </div>

        <div style={{fontWeight: 700, fontSize: "1.2rem", color: "#1A1A1A", marginBottom: "4px"}}>{profileUser.full_name}</div>
        {school && <div style={{fontSize: "0.82rem", color: "#1D9E75", fontWeight: 600, marginBottom: "4px"}}>{school.abbreviation}</div>}
        <div style={{fontSize: "0.75rem", color: "#888", marginBottom: "12px"}}>Member since {formatMemberSince(profileUser.created_at)}</div>
        {profileUser.bio && <div style={{fontSize: "0.85rem", color: "#555", textAlign: "center", marginBottom: "12px", lineHeight: 1.5, maxWidth: "320px"}}>{profileUser.bio}</div>}

        {isOwnProfile ? (
          <button onClick={() => setShowEditSheet(true)}
            style={{padding: "9px 28px", borderRadius: "20px", border: "1.5px solid #1D9E75", backgroundColor: "#fff", color: "#1D9E75", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>
            ✏️ Edit Profile
          </button>
        ) : (
          <div style={{display: "flex", gap: "10px"}}>
            <button style={{padding: "9px 20px", borderRadius: "20px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "not-allowed", fontFamily: "inherit", opacity: 0.6}}>💬 Message</button>
            <button style={{padding: "9px 20px", borderRadius: "20px", border: "1.5px solid #EF4444", backgroundColor: "#fff", color: "#EF4444", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>🚩 Report</button>
          </div>
        )}
      </div>

      <div style={{backgroundColor: "#fff", display: "flex", borderBottom: "1px solid #F0F0F0", marginBottom: "8px"}}>
        {[{label: "Posts", value: postCount}, {label: "Comments", value: commentCount}, {label: "Reactions", value: reactionsReceived}].map((stat, i) => (
          <div key={i} style={{flex: 1, padding: "14px 8px", textAlign: "center", borderRight: i < 2 ? "1px solid #F0F0F0" : "none"}}>
            <div style={{fontWeight: 700, fontSize: "1.2rem", color: "#1D9E75"}}>{stat.value.toLocaleString()}</div>
            <div style={{fontSize: "0.7rem", color: "#888", marginTop: "2px"}}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{backgroundColor: "#fff", display: "flex", borderBottom: "1px solid #F0F0F0", position: "sticky", top: "48px", zIndex: 90, overflowX: "auto"}}>
        {visibleTabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{flex: 1, padding: "12px 8px", border: "none", backgroundColor: "#fff", color: activeTab === tab ? "#1D9E75" : "#888", fontWeight: activeTab === tab ? 700 : 500, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", borderBottom: activeTab === tab ? "2px solid #1D9E75" : "2px solid transparent", whiteSpace: "nowrap", minWidth: "60px"}}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{flex: 1, paddingBottom: "80px"}}>
        {loadingTab ? (
          <div style={{padding: "40px", textAlign: "center"}}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{display: "inline-block", width: "24px", height: "24px", border: "2px solid #E0E0E0", borderTopColor: "#1D9E75", borderRadius: "50%", animation: "spin 0.8s linear infinite"}} />
          </div>
        ) : (
          <>
            {activeTab === "Posts" && (
              posts.length === 0 ? (
                <div style={{textAlign: "center", padding: "48px 16px"}}>
                  <div style={{fontSize: "2.5rem", marginBottom: "10px"}}>📝</div>
                  <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "0.95rem", marginBottom: "6px"}}>No posts yet</div>
                  <div style={{color: "#888", fontSize: "0.8rem"}}>{isOwnProfile ? "Share something with your school community!" : "This user hasn't posted yet."}</div>
                </div>
              ) : (
                <div>
                  {posts.map(post => (
                    <div key={post.id} onClick={() => router.push(post.type === "quad" ? `/quad/${post.id}` : `/feeds/${post.id}`)}
                      style={{backgroundColor: "#fff", marginBottom: "8px", padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid #F0F0F0"}}>
                      <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px"}}>
                        {post.type === "quad"
                          ? <span style={{fontSize: "0.65rem", backgroundColor: "#E1F5EE", color: "#1D9E75", fontWeight: 700, padding: "2px 8px", borderRadius: "10px"}}>QUAD</span>
                          : <span style={{fontSize: "0.65rem", backgroundColor: "#F0F0F0", color: "#888", fontWeight: 700, padding: "2px 8px", borderRadius: "10px"}}>FEED</span>
                        }
                        {post.tag && <span style={{fontSize: "0.68rem", color: "#1D9E75"}}>{post.tag}</span>}
                        <span style={{fontSize: "0.68rem", color: "#aaa", marginLeft: "auto"}}>{formatTime(post.created_at)}</span>
                      </div>
                      <div style={{fontSize: "0.875rem", color: "#1A1A1A", lineHeight: 1.5}}>{post.content}</div>
                      {post.images && post.images.length > 0 && (
                        <div style={{display: "flex", gap: "4px", marginTop: "8px"}}>
                          {post.images.slice(0, 3).map((url, i) => (
                            <img key={i} src={url} alt="" style={{width: "72px", height: "72px", objectFit: "cover", borderRadius: "8px"}} />
                          ))}
                          {post.images.length > 3 && (
                            <div style={{width: "72px", height: "72px", borderRadius: "8px", backgroundColor: "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontWeight: 700, fontSize: "0.85rem"}}>+{post.images.length - 3}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === "Bazaar" && (
              listings.length === 0 ? (
                <div style={{textAlign: "center", padding: "48px 16px"}}>
                  <div style={{fontSize: "2.5rem", marginBottom: "10px"}}>🛍️</div>
                  <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "0.95rem", marginBottom: "6px"}}>No listings yet</div>
                  <div style={{color: "#888", fontSize: "0.8rem"}}>{isOwnProfile ? "Sell something in the Bazaar!" : "This user has no listings."}</div>
                </div>
              ) : (
                <div style={{padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px"}}>
                  {listings.map(listing => (
                    <div key={listing.id} onClick={() => router.push(`/bazaar/${listing.id}`)}
                      style={{backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", cursor: "pointer", border: "1px solid #F0F0F0"}}>
                      <div style={{position: "relative"}}>
                        {listing.images && listing.images.length > 0
                          ? <img src={listing.images[0]} alt="" style={{width: "100%", height: "120px", objectFit: "cover", display: "block"}} />
                          : <div style={{width: "100%", height: "120px", backgroundColor: "#F7F7F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem"}}>🛍️</div>
                        }
                        {listing.is_sold && (
                          <div style={{position: "absolute", top: "6px", left: "6px", backgroundColor: "#1D9E75", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px", borderRadius: "8px"}}>SOLD</div>
                        )}
                      </div>
                      <div style={{padding: "8px"}}>
                        <div style={{fontWeight: 600, fontSize: "0.82rem", color: "#1A1A1A", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{listing.title}</div>
                        <div style={{fontWeight: 700, fontSize: "0.88rem", color: "#1D9E75"}}>{formatPrice(listing.price)}</div>
                        <div style={{fontSize: "0.68rem", color: "#aaa", marginTop: "2px"}}>{listing.condition}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === "Living" && (
              livingPosts.length === 0 ? (
                <div style={{textAlign: "center", padding: "48px 16px"}}>
                  <div style={{fontSize: "2.5rem", marginBottom: "10px"}}>🏠</div>
                  <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "0.95rem", marginBottom: "6px"}}>No living posts yet</div>
                  <div style={{color: "#888", fontSize: "0.8rem"}}>{isOwnProfile ? "Post a room for rent or find one in Living!" : "This user has no living posts."}</div>
                </div>
              ) : (
                <div>
                  {livingPosts.map(lp => (
                    <div key={lp.id} onClick={() => router.push(`/living/${lp.id}`)}
                      style={{backgroundColor: "#fff", marginBottom: "8px", borderBottom: "1px solid #F0F0F0", cursor: "pointer", display: "flex", gap: "12px", padding: "12px 16px", alignItems: "flex-start"}}>
                      {lp.images && lp.images.length > 0
                        ? <img src={lp.images[0]} alt="" style={{width: "72px", height: "72px", objectFit: "cover", borderRadius: "10px", flexShrink: 0}} />
                        : <div style={{width: "72px", height: "72px", backgroundColor: "#F0F0F0", borderRadius: "10px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem"}}>🏠</div>
                      }
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px", flexWrap: "wrap"}}>
                          <span style={{fontSize: "0.65rem", backgroundColor: lp.post_type === "listing" ? "#E1F5EE" : "#FEF2F2", color: lp.post_type === "listing" ? "#1D9E75" : "#EF4444", fontWeight: 700, padding: "2px 8px", borderRadius: "10px"}}>
                            {lp.post_type === "listing" ? "🏠 FOR RENT" : "🔍 LOOKING"}
                          </span>
                          {lp.is_fully_booked && <span style={{fontSize: "0.65rem", backgroundColor: "#F0F0F0", color: "#888", fontWeight: 700, padding: "2px 8px", borderRadius: "10px"}}>FULLY BOOKED</span>}
                        </div>
                        <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{lp.title}</div>
                        {lp.price_per_month && <div style={{fontSize: "0.82rem", color: "#1D9E75", fontWeight: 600}}>\u20b1{lp.price_per_month.toLocaleString()}/mo</div>}
                        {lp.address && <div style={{fontSize: "0.72rem", color: "#888", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>📍 {lp.address}</div>}
                        <div style={{fontSize: "0.68rem", color: "#aaa", marginTop: "4px"}}>{formatTime(lp.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === "About" && (
              <div style={{padding: "16px"}}>
                <div style={{backgroundColor: "#fff", borderRadius: "14px", padding: "16px", marginBottom: "12px", border: "1px solid #F0F0F0"}}>
                  <div style={{fontWeight: 700, fontSize: "0.82rem", color: "#888", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em"}}>Info</div>
                  <div style={{display: "flex", flexDirection: "column", gap: "14px"}}>
                    <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                      <span style={{fontSize: "1.1rem"}}>🏫</span>
                      <div>
                        <div style={{fontSize: "0.7rem", color: "#aaa", marginBottom: "1px"}}>School</div>
                        <div style={{fontSize: "0.875rem", fontWeight: 600, color: "#1A1A1A"}}>{school?.name || "Unknown"}</div>
                      </div>
                    </div>
                    <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                      <span style={{fontSize: "1.1rem"}}>📅</span>
                      <div>
                        <div style={{fontSize: "0.7rem", color: "#aaa", marginBottom: "1px"}}>Member Since</div>
                        <div style={{fontSize: "0.875rem", fontWeight: 600, color: "#1A1A1A"}}>{formatMemberSince(profileUser.created_at)}</div>
                      </div>
                    </div>
                    {profileUser.bio && (
                      <div style={{display: "flex", alignItems: "flex-start", gap: "12px"}}>
                        <span style={{fontSize: "1.1rem"}}>💬</span>
                        <div>
                          <div style={{fontSize: "0.7rem", color: "#aaa", marginBottom: "1px"}}>Bio</div>
                          <div style={{fontSize: "0.875rem", color: "#1A1A1A", lineHeight: 1.5}}>{profileUser.bio}</div>
                        </div>
                      </div>
                    )}
                    {profileUser.phone_number && (
                      <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                        <span style={{fontSize: "1.1rem"}}>📱</span>
                        <div>
                          <div style={{fontSize: "0.7rem", color: "#aaa", marginBottom: "1px"}}>Phone</div>
                          <a href={`tel:${profileUser.phone_number}`} style={{fontSize: "0.875rem", fontWeight: 600, color: "#1D9E75", textDecoration: "none"}}>{profileUser.phone_number}</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{backgroundColor: "#fff", borderRadius: "14px", padding: "16px", marginBottom: "12px", border: "1px solid #F0F0F0"}}>
                  <div style={{fontWeight: 700, fontSize: "0.82rem", color: "#888", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em"}}>Badges</div>
                  <div style={{padding: "8px 14px", backgroundColor: "#F7F7F7", borderRadius: "20px", fontSize: "0.78rem", color: "#aaa", display: "inline-block"}}>🏅 Founding Member — Coming Soon</div>
                </div>

                <div style={{backgroundColor: "#fff", borderRadius: "14px", padding: "16px", marginBottom: "12px", border: "1px solid #F0F0F0"}}>
                  <div style={{fontWeight: 700, fontSize: "0.82rem", color: "#888", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em"}}>Settings</div>
                  <div style={{fontSize: "0.82rem", color: "#aaa", fontStyle: "italic"}}>Coming soon — Privacy, Notifications, Blocked Users</div>
                </div>

                {isOwnProfile && (
                  <>
                    <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "8px 0 16px"}} />
                    <button onClick={() => setShowLogoutConfirm(true)}
                      style={{width: "100%", padding: "14px", borderRadius: "14px", border: "1.5px solid #EF4444", backgroundColor: "#FEF2F2", color: "#EF4444", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit"}}>
                      🚪 Log Out
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="/feeds" />

      {showEditSheet && (
        <>
          <div onClick={() => setShowEditSheet(false)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "16px 16px 40px", maxHeight: "85vh", overflowY: "auto"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto 16px"}} />
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "20px"}}>Edit Profile</div>
            <div style={{marginBottom: "16px"}}>
              <label style={{fontSize: "0.78rem", fontWeight: 600, color: "#888", display: "block", marginBottom: "6px"}}>Bio (optional)</label>
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell your school community about yourself..." maxLength={160} rows={3}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
              <div style={{textAlign: "right", fontSize: "0.68rem", color: "#aaa", marginTop: "2px"}}>{editBio.length}/160</div>
            </div>
            <div style={{marginBottom: "20px"}}>
              <label style={{fontSize: "0.78rem", fontWeight: 600, color: "#888", display: "block", marginBottom: "6px"}}>Phone Number (optional)</label>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+63 9XX XXX XXXX"
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            </div>
            <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "12px 14px", marginBottom: "20px", display: "flex", gap: "10px", alignItems: "flex-start"}}>
              <span style={{fontSize: "1rem"}}>🔒</span>
              <div>
                <div style={{fontSize: "0.78rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "2px"}}>School: {school?.abbreviation}</div>
                <div style={{fontSize: "0.72rem", color: "#888", lineHeight: 1.4}}>School changes require admin review. Contact support to request a change.</div>
              </div>
            </div>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowEditSheet(false)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={handleSaveProfile} disabled={savingProfile} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: savingProfile ? "#ccc" : "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: savingProfile ? "not-allowed" : "pointer", fontFamily: "inherit"}}>{savingProfile ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </>
      )}

      {showLogoutConfirm && (
        <>
          <div onClick={() => setShowLogoutConfirm(false)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "24px 16px 40px"}}>
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "8px", textAlign: "center"}}>Log out of Konek?</div>
            <div style={{fontSize: "0.85rem", color: "#888", textAlign: "center", marginBottom: "20px"}}>You'll need to log in again to access your account.</div>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={handleLogout} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Log Out</button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>
      )}

    </div>
  );
}
