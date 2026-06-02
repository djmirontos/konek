'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AvatarViewer from "@/components/AvatarViewer";
import AvatarUploader from "@/components/AvatarUploader";
import { startConversation } from "@/lib/startConversation";

type School = { id: string; name: string; abbreviation: string; };
type ProfileUser = {
  id: string; full_name: string; avatar_url: string | null;
  school_id: string; role: string; bio: string | null;
  phone_number: string | null; created_at: string;
  verification_status: string | null;
  verification_rejection_reason: string | null;
  verification_front_url: string | null;
  verification_back_url: string | null;
  invite_code: string | null;
  referral_count: number;
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

function VerifiedBadge({ size = 15 }: { size?: number }) {
  return (
    <span title="Verified Student" style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: size + "px", height: size + "px", backgroundColor: "#1D9E75", borderRadius: "50%", marginLeft: "4px", flexShrink: 0, verticalAlign: "middle"}}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </span>
  );
  </>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params?.id as string;
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<ProfileUser | null>(null);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeTab, setActiveTab] = useState("Posts");
  const [viewAvatar, setViewAvatar] = useState<{src:string;name:string}|null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
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
  const [showAvatarUploader, setShowAvatarUploader] = useState(false);
  const [messagingUser, setMessagingUser] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showVerifySheet, setShowVerifySheet] = useState(false);
  const [verifyFrontFile, setVerifyFrontFile] = useState<File | null>(null);
  const [verifyFrontPreview, setVerifyFrontPreview] = useState("");
  const [verifyBackFile, setVerifyBackFile] = useState<File | null>(null);
  const [verifyBackPreview, setVerifyBackPreview] = useState("");
  const [submittingVerify, setSubmittingVerify] = useState(false);

  useEffect(() => { initPage(); }, [profileId]);
  useEffect(() => { if (profileUser) fetchTabData(activeTab); }, [activeTab, profileUser]);

  async function initPage() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: meData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (meData) setCurrentUser(meData);
    const { data: badges } = await supabase.from("user_badges").select("user_id").eq("badge_code", "verified_student");
    const verifiedIds = new Set((badges || []).map((b: {user_id: string}) => b.user_id));
    setIsVerified(verifiedIds.has(profileId));

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

  async function handleAvatarComplete(file: File) {
    if (!currentUser) return;
    try {
      const path = "avatars/" + currentUser.id + "/" + Date.now() + ".jpg";
      const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
      const { error: updateError } = await supabase.from("users").update({ avatar_url: urlData.publicUrl }).eq("id", currentUser.id);
      if (updateError) throw updateError;
      setProfileUser(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
      setCurrentUser(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
      showToast("Profile photo updated!");
    } catch {
      showToast("Failed to update avatar.");
    } finally {
      setShowAvatarUploader(false);
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

  function handleVerifyFrontSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast("Image must be under 10MB"); return; }
    setVerifyFrontFile(file);
    setVerifyFrontPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  }

  function handleVerifyBackSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast("Image must be under 10MB"); return; }
    setVerifyBackFile(file);
    setVerifyBackPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  }

  async function handleVerificationSubmit() {
    if (!currentUser || !verifyFrontFile) return;
    setSubmittingVerify(true);
    try {
      const frontExt = verifyFrontFile.name.split(".").pop();
      const frontPath = currentUser.id + "/front_" + Date.now() + "." + frontExt;
      const { error: frontError } = await supabase.storage.from("verification-ids").upload(frontPath, verifyFrontFile);
      if (frontError) throw frontError;
      const { data: frontUrl } = supabase.storage.from("verification-ids").getPublicUrl(frontPath);

      let backUrlStr: string | null = null;
      if (verifyBackFile) {
        const backExt = verifyBackFile.name.split(".").pop();
        const backPath = currentUser.id + "/back_" + Date.now() + "." + backExt;
        const { error: backError } = await supabase.storage.from("verification-ids").upload(backPath, verifyBackFile);
        if (!backError) {
          const { data: backUrlData } = supabase.storage.from("verification-ids").getPublicUrl(backPath);
          backUrlStr = backUrlData.publicUrl;
        }
      }

      const { error: updateError } = await supabase.from("users").update({
        verification_status: "pending",
        verification_front_url: frontUrl.publicUrl,
        verification_back_url: backUrlStr,
        verification_submitted_at: new Date().toISOString(),
        verification_rejection_reason: null,
      }).eq("id", currentUser.id);
      if (updateError) throw updateError;

      setProfileUser(prev => prev ? { ...prev, verification_status: "pending" } : prev);
      setCurrentUser(prev => prev ? { ...prev, verification_status: "pending" } : prev);
      setShowVerifySheet(false);
      setVerifyFrontFile(null); setVerifyFrontPreview("");
      setVerifyBackFile(null); setVerifyBackPreview("");
      showToast("Verification submitted! We will review it within 1-2 days.");
    } catch {
      showToast("Failed to submit. Please try again.");
    } finally {
      setSubmittingVerify(false);
    }
  }

  async function handleMessageUser() {
    if (!currentUser || !profileUser) return;
    setMessagingUser(true);
    try {
      const convId = await startConversation(currentUser.id, profileUser.id);
      if (convId) router.push("/messages/" + convId);
    } catch { } finally { setMessagingUser(false); }
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
  
  async function fetchUnreadMessages(userId: string) {
    const supabase = createClient();
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or("participant_1.eq." + userId + ",participant_2.eq." + userId)
      .eq("status", "accepted");
    if (!convs || convs.length === 0) { setUnreadMessages(0); return; }
    const convIds = convs.map((c: {id: string}) => c.id);
    let total = 0;
    for (const cid of convIds) {
      const { count } = await supabase.from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", cid)
        .eq("is_seen", false)
        .neq("sender_id", userId);
      total += count || 0;
    }
    setUnreadMessages(total);
  }

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
        <BottomNav active="/feeds" unreadMessages={unreadMessages} />
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
    <>
    {viewAvatar && <AvatarViewer src={viewAvatar.src} name={viewAvatar.name} onClose={() => setViewAvatar(null)} />}
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
            <button onClick={() => setShowAvatarUploader(true)} disabled={uploadingAvatar}
              style={{position: "absolute", bottom: "0", right: "0", backgroundColor: "#1D9E75", border: "2px solid #fff", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.7rem"}}>
              {uploadingAvatar ? "⏳" : "📷"}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleAvatarChange} />
          {showAvatarUploader && (
            <AvatarUploader
              onComplete={handleAvatarComplete}
              onCancel={() => setShowAvatarUploader(false)}
            />
          )}
        </div>

        <div style={{fontWeight: 700, fontSize: "1.2rem", color: "#1A1A1A", marginBottom: "4px", display: "flex", alignItems: "center", justifyContent: "center"}}>{profileUser.full_name}{isVerified && <VerifiedBadge size={18} />}</div>
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
            <button onClick={handleMessageUser} disabled={messagingUser}
              style={{padding: "9px 20px", borderRadius: "20px", border: "none", backgroundColor: messagingUser ? "#ccc" : "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: messagingUser ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
              {messagingUser ? "Opening..." : "💬 Message"}
            </button>
            <button style={{padding: "9px 20px", borderRadius: "20px", border: "1.5px solid #EF4444", backgroundColor: "#fff", color: "#EF4444", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>🚩 Report</button>
          </div>
        )}
      </div>

      {/* INVITE CARD — only on own profile */}
      {isOwnProfile && profileUser.invite_code && (
        <div style={{margin: "12px 16px", backgroundColor: "#E1F5EE", borderRadius: "16px", padding: "16px", border: "1px solid #9FE1CB"}}>
          <div style={{fontSize: "0.72rem", fontWeight: 700, color: "#0F6E56", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px"}}>🎁 Your Invite Code</div>
          <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px"}}>
            <div style={{flex: 1, backgroundColor: "#fff", borderRadius: "10px", padding: "10px 14px", fontWeight: 800, fontSize: "1.2rem", color: "#1D9E75", letterSpacing: "0.08em", fontFamily: "monospace", border: "1.5px dashed #1D9E75"}}>
              {profileUser.invite_code}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(profileUser.invite_code || ""); }}
              style={{backgroundColor: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 16px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
              Copy
            </button>
          </div>
          <div style={{fontSize: "0.75rem", color: "#0F6E56", lineHeight: 1.6}}>
            Share this code with your schoolmates. When they sign up using your code, you earn referral badges!
          </div>
          {/* Milestones */}
          <div style={{marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px"}}>
            {[
              {count: 5,   emoji: "🎓", label: "Campus Connector"},
              {count: 20,  emoji: "🌟", label: "Community Builder"},
              {count: 50,  emoji: "🚀", label: "Campus Ambassador"},
              {count: 100, emoji: "👑", label: "Founding Influencer"},
            ].map(m => {
              const done = (profileUser.referral_count || 0) >= m.count;
              return (
                <div key={m.count} style={{display: "flex", alignItems: "center", gap: "8px", opacity: done ? 1 : 0.5}}>
                  <div style={{width: "20px", height: "20px", borderRadius: "50%", backgroundColor: done ? "#1D9E75" : "#ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#fff", fontWeight: 700, flexShrink: 0}}>
                    {done ? "✓" : m.count}
                  </div>
                  <span style={{fontSize: "0.78rem", fontWeight: done ? 700 : 400, color: done ? "#0F6E56" : "#888"}}>
                    {m.emoji} {m.label} — {m.count} referrals
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{marginTop: "10px", fontSize: "0.82rem", fontWeight: 700, color: "#0F6E56"}}>
            Total referrals: {profileUser.referral_count || 0}
          </div>
        </div>
      )}

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
                  {/* VERIFY STUDENT SECTION */}
                  {isOwnProfile && (
                    <div style={{marginBottom: "20px"}}>
                      <div style={{fontWeight: 700, fontSize: "0.82rem", color: "#888", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em"}}>Student Verification</div>

                      {profileUser?.verification_status === "approved" && (
                        <div style={{display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#E1F5EE", borderRadius: "12px", padding: "14px"}}>
                          <span style={{fontSize: "1.6rem"}}>✅</span>
                          <div>
                            <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#0F6E56"}}>Verified Student</div>
                            <div style={{fontSize: "0.72rem", color: "#1D9E75", marginTop: "2px"}}>Your Student ID has been verified successfully.</div>
                          </div>
                        </div>
                      )}

                      {profileUser?.verification_status === "pending" && (
                        <div style={{display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#FFF8E1", borderRadius: "12px", padding: "14px"}}>
                          <span style={{fontSize: "1.6rem"}}>⏳</span>
                          <div>
                            <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#B45309"}}>Under Review</div>
                            <div style={{fontSize: "0.72rem", color: "#92400E", marginTop: "2px"}}>We are reviewing your Student ID. Usually takes 1-2 days.</div>
                          </div>
                        </div>
                      )}

                      {profileUser?.verification_status === "rejected" && (
                        <div style={{backgroundColor: "#FEF2F2", borderRadius: "12px", padding: "14px", marginBottom: "10px"}}>
                          <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px"}}>
                            <span style={{fontSize: "1.3rem"}}>⚠️</span>
                            <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#EF4444"}}>Action Required</div>
                          </div>
                          {profileUser.verification_rejection_reason && (
                            <div style={{fontSize: "0.78rem", color: "#888", marginBottom: "10px", lineHeight: 1.5, backgroundColor: "#fff", borderRadius: "8px", padding: "8px 12px"}}>
                              Reason: {profileUser.verification_rejection_reason}
                            </div>
                          )}
                          <div style={{fontSize: "0.75rem", color: "#888", marginBottom: "12px"}}>Please upload a clearer photo of your Student ID and resubmit.</div>
                          <button onClick={() => setShowVerifySheet(true)}
                            style={{backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%"}}>
                            Upload New ID
                          </button>
                        </div>
                      )}

                      {(profileUser?.verification_status === "unverified" || !profileUser?.verification_status) && (
                        <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "16px"}}>
                          <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px"}}>
                            <span style={{fontSize: "1.3rem"}}>🪪</span>
                            <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>Become a Verified Student</div>
                          </div>
                          <div style={{display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px"}}>
                            {["Verified badge beside your name", "More trust in Bazaar listings", "More credibility across Konek"].map(benefit => (
                              <div key={benefit} style={{display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "#555"}}>
                                <span style={{color: "#1D9E75", fontWeight: 700}}>✓</span> {benefit}
                              </div>
                            ))}
                          </div>
                          <button onClick={() => setShowVerifySheet(true)}
                            style={{backgroundColor: "#1D9E75", color: "#fff", border: "none", borderRadius: "8px", padding: "11px 20px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%"}}>
                            Verify Student ID
                          </button>
                        </div>
                      )}
                    </div>
                  )}

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
                    {(currentUser?.role === "admin" || currentUser?.role === "moderator") && (
                      <button onClick={() => router.push("/admin")}
                        style={{width: "100%", padding: "14px", borderRadius: "14px", border: "1.5px solid #1D9E75", backgroundColor: "#E1F5EE", color: "#1D9E75", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", marginBottom: "10px"}}>
                        🛡️ Admin Panel
                      </button>
                    )}
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

      <BottomNav active="/feeds" unreadMessages={unreadMessages} />

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

      {/* VERIFY STUDENT SHEET */}
      {showVerifySheet && (
        <>
          <div onClick={() => setShowVerifySheet(false)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.4)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "20px 20px 40px", maxHeight: "90vh", overflowY: "auto"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto 16px"}}></div>
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "4px"}}>Verify Student ID</div>
            <div style={{fontSize: "0.8rem", color: "#888", marginBottom: "16px", lineHeight: 1.5}}>Upload a clear photo of your Student ID. Your information is kept private and only used for verification.</div>

            <div style={{backgroundColor: "#E1F5EE", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px"}}>
              {["Verified badge beside your name", "More trust in Bazaar listings", "More credibility across Konek"].map(b => (
                <div key={b} style={{display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "#0F6E56", marginBottom: "3px"}}>
                  <span style={{fontWeight: 700}}>✓</span> {b}
                </div>
              ))}
            </div>

            <div style={{marginBottom: "16px"}}>
              <div style={{fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px"}}>Front of Student ID <span style={{color: "#EF4444"}}>*</span></div>
              <label style={{display: "block", cursor: "pointer"}}>
                {verifyFrontPreview ? (
                  <div style={{position: "relative"}}>
                    <img src={verifyFrontPreview} alt="front" style={{width: "100%", height: "160px", objectFit: "contain", borderRadius: "10px", border: "2px solid #1D9E75", backgroundColor: "#F7F7F7"}} />
                    <div style={{position: "absolute", bottom: "8px", right: "8px", backgroundColor: "#1D9E75", color: "#fff", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 700}}>Change</div>
                  </div>
                ) : (
                  <div style={{width: "100%", height: "140px", border: "2px dashed #1D9E75", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#E1F5EE", gap: "6px"}}>
                    <span style={{fontSize: "2rem"}}>🪪</span>
                    <span style={{fontSize: "0.8rem", fontWeight: 600, color: "#0F6E56"}}>Tap to upload front of ID</span>
                    <span style={{fontSize: "0.68rem", color: "#888"}}>JPG or PNG, max 10MB</span>
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleVerifyFrontSelect} />
              </label>
            </div>

            <div style={{marginBottom: "16px"}}>
              <div style={{fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px"}}>Back of Student ID <span style={{color: "#888", fontWeight: 400, textTransform: "none", fontSize: "0.68rem"}}>(Optional)</span></div>
              <label style={{display: "block", cursor: "pointer"}}>
                {verifyBackPreview ? (
                  <div style={{position: "relative"}}>
                    <img src={verifyBackPreview} alt="back" style={{width: "100%", height: "140px", objectFit: "contain", borderRadius: "10px", border: "2px solid #F0F0F0", backgroundColor: "#F7F7F7"}} />
                    <div style={{position: "absolute", bottom: "8px", right: "8px", backgroundColor: "#888", color: "#fff", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 700}}>Change</div>
                  </div>
                ) : (
                  <div style={{width: "100%", height: "110px", border: "2px dashed #F0F0F0", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7F7", gap: "5px"}}>
                    <span style={{fontSize: "1.6rem"}}>📄</span>
                    <span style={{fontSize: "0.78rem", fontWeight: 600, color: "#888"}}>Tap to upload back of ID</span>
                    <span style={{fontSize: "0.68rem", color: "#aaa"}}>(Optional)</span>
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleVerifyBackSelect} />
              </label>
            </div>

            <div style={{backgroundColor: "#FFF8E1", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "0.74rem", color: "#92400E", lineHeight: 1.5}}>
              Your Student ID is private and only visible to Konek admins for verification purposes.
            </div>

            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowVerifySheet(false)}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>
                Cancel
              </button>
              <button onClick={handleVerificationSubmit} disabled={!verifyFrontFile || submittingVerify}
                style={{flex: 2, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: !verifyFrontFile || submittingVerify ? "#ccc" : "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: !verifyFrontFile || submittingVerify ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                {submittingVerify ? "Submitting..." : "Submit for Verification"}
              </button>
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
  </>
  );
}
