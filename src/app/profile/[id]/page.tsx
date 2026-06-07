'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PhotoViewer from "@/components/PhotoViewer";
import AvatarUploader from "@/components/AvatarUploader";
import { startConversation } from "@/lib/startConversation";

type School = { id: string; name: string; abbreviation: string; };
type ProfileUser = {
  id: string; full_name: string; avatar_url: string | null; avatar_original_url: string | null;
  school_id: string; role: string; bio: string | null; birthdate: string | null; course: string | null; year_level: string | null; hometown: string | null;
  phone_number: string | null; created_at: string; show_online_status: boolean;
  verification_status: string | null;
  verification_rejection_reason: string | null;
  verification_front_url: string | null;
  verification_back_url: string | null;
  invite_code: string | null;
  referral_count: number;
  trust_xp: number;
  ign: string | null;
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
    <span title="Verified Student" style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: size + "px", height: size + "px", backgroundColor: "#2BB39A", borderRadius: "50%", marginLeft: "4px", flexShrink: 0, verticalAlign: "middle"}}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </span>
  );
}

function getTrustLevel(xp: number) {
  if (xp >= 1000) return { label: "Legend",  emoji: "👑", bg: "#FAEEDA", color: "#633806", border: "#FAC775", track: "#FAC775", fill: "#BA7517" };
  if (xp >= 500)  return { label: "Trusted",  emoji: "⭐", bg: "#E6F1FB", color: "#185FA5", border: "#B5D4F4", track: "#B5D4F4", fill: "#378ADD" };
  if (xp >= 100)  return { label: "Regular",  emoji: "🌿", bg: "#EAF3DE", color: "#3B6D11", border: "#C0DD97", track: "#C0DD97", fill: "#2BB39A" };
  return null;
}

function getNextLevel(xp: number) {
  if (xp >= 1000) return { label: "Legend", threshold: 1000 };
  if (xp >= 500)  return { label: "Legend",  threshold: 1000 };
  if (xp >= 100)  return { label: "Trusted", threshold: 500 };
  return { label: "Regular", threshold: 100 };
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params?.id as string;
  const supabase = createClient();
  const searchParams = useSearchParams();
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

  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowSheet, setShowFollowSheet] = useState<"followers"|"following"|null>(null);
  const [followSheetList, setFollowSheetList] = useState<{id:string;full_name:string;avatar_url:string|null;ign:string|null;school_id:string}[]>([]);
  const [loadingFollowSheet, setLoadingFollowSheet] = useState(false);
  const [postCount, setPostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [reactionsReceived, setReactionsReceived] = useState(0);
  const [commentsToday, setCommentsToday] = useState(0);
  const [reactionsToday, setReactionsToday] = useState(0);

  const [posts, setPosts] = useState<Post[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [livingPosts, setLivingPosts] = useState<LivingPost[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [hasLiving, setHasLiving] = useState(false);

  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showSharePhotoPrompt, setShowSharePhotoPrompt] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
  const [sharingPhoto, setSharingPhoto] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [editCourse, setEditCourse] = useState("");
  const [editYearLevel, setEditYearLevel] = useState("");
  const [editHometown, setEditHometown] = useState("");
  const [privacySettings, setPrivacySettings] = useState<Record<string,string>>({
    phone: "private", email: "private", birthdate: "school_only",
    course: "public", year_level: "public", hometown: "public"
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);
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
  useEffect(() => {
    if (!loading && profileUser) {
      if (searchParams?.get("edit") === "true") { setShowEditSheet(true); setActiveTab("About"); }
      if (searchParams?.get("verify") === "true") { setShowVerifySheet(true); setActiveTab("About"); }
    }
  }, [loading, profileUser, searchParams]);

  async function initPage() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const targetId = profileId || user.id;
    const own = targetId === user.id;
    setIsOwnProfile(own);

    // Run all independent queries in parallel
    const [
      { data: meData },
      { data: profileData },
      { data: badges },
      { data: schoolData },
      { count: livingCount }
    ] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("users").select("*").eq("id", targetId).single(),
      supabase.from("user_badges").select("user_id").eq("badge_code", "verified_student"),
      supabase.from("schools").select("id, name, abbreviation").order("name"),
      supabase.from("boarding_houses").select("id", { count: "exact", head: true })
        .eq("user_id", targetId).eq("is_hidden", false)
    ]);

    if (meData) setCurrentUser(meData);
    if (schoolData) setSchools(schoolData);
    setHasLiving((livingCount || 0) > 0);

    const verifiedIds = new Set((badges || []).map((b: {user_id: string}) => b.user_id));
    setIsVerified(verifiedIds.has(profileId));

    if (profileData) {
      setProfileUser(profileData);
      setEditBio(profileData.bio || "");
      setEditPhone(profileData.phone_number || "");
      setEditBirthdate(profileData.birthdate || "");
      if (profileData.privacy_settings) setPrivacySettings(profileData.privacy_settings);
      setEditCourse(profileData.course || "");
      setEditYearLevel(profileData.year_level || "");
      setEditHometown(profileData.hometown || "");
    }

    // Show profile immediately, load stats in background
    setLoading(false);
    fetchStats(targetId);
    fetchFollowData(targetId, user.id);
  }

  async function fetchStats(userId: string) {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);

    const { data: userPostIds } = await supabase
      .from("posts").select("id").eq("user_id", userId).eq("is_hidden", false);
    const pIds = (userPostIds || []).map((p: any) => p.id);

    const [
      { count: pCount },
      cCountResult,
      rCountResult,
      rTodayResult,
      cTodayResult
    ] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("is_hidden", false).in("type", ["feed", "quad"]),
      pIds.length > 0
        ? supabase.from("comments").select("id", { count: "exact", head: true })
            .in("post_id", pIds).neq("user_id", userId)
        : Promise.resolve({ count: 0 }),
      pIds.length > 0
        ? supabase.from("reactions").select("id", { count: "exact", head: true })
            .in("post_id", pIds)
        : Promise.resolve({ count: 0 }),
      pIds.length > 0
        ? supabase.from("reactions").select("id", { count: "exact", head: true })
            .in("post_id", pIds).gte("created_at", todayStart.toISOString())
        : Promise.resolve({ count: 0 }),
      pIds.length > 0
        ? supabase.from("comments").select("id", { count: "exact", head: true })
            .in("post_id", pIds).neq("user_id", userId)
            .gte("created_at", todayStart.toISOString())
        : Promise.resolve({ count: 0 })
    ]);

    setPostCount(pCount || 0);
    setCommentCount(cCountResult.count || 0);
    setReactionsReceived(rCountResult.count || 0);
    setReactionsToday(rTodayResult.count || 0);
    setCommentsToday(cTodayResult.count || 0);
  }
  async function fetchFollowData(profileId: string, currentUserId: string) {
    const [
      { count: followers },
      { count: following },
      { data: followCheck }
    ] = await Promise.all([
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", profileId),
      supabase.from("followers").select("id").eq("follower_id", currentUserId).eq("following_id", profileId).maybeSingle()
    ]);
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
    setIsFollowing(!!followCheck);
  }

  async function handleFollow() {
    if (!currentUser || !profileUser) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("followers").delete().eq("follower_id", currentUser.id).eq("following_id", profileUser.id);
      setIsFollowing(false);
      setFollowerCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from("followers").insert({ follower_id: currentUser.id, following_id: profileUser.id });
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
    setFollowLoading(false);
    // Re-fetch to ensure accuracy
    fetchFollowData(profileUser.id, currentUser.id);
  }

  async function fetchFollowList(type: "followers"|"following") {
    if (!profileUser) return;
    setLoadingFollowSheet(true);
    setShowFollowSheet(type);
    setFollowSheetList([]);
    let userIds: string[] = [];
    if (type === "followers") {
      const { data } = await supabase.from("followers").select("follower_id").eq("following_id", profileUser.id);
      userIds = (data || []).map((r: any) => r.follower_id);
    } else {
      const { data } = await supabase.from("followers").select("following_id").eq("follower_id", profileUser.id);
      userIds = (data || []).map((r: any) => r.following_id);
    }
    if (userIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, full_name, avatar_url, ign, school_id").in("id", userIds);
      setFollowSheetList(users || []);
    }
    setLoadingFollowSheet(false);
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

  async function handleAvatarComplete(croppedFile: File, originalFile: File) {
    if (!currentUser) return;
    try {
      const ts = Date.now();
      // Upload cropped avatar
      const croppedPath = "avatars/" + currentUser.id + "/" + ts + "_cropped.jpg";
      const { error: cropError } = await supabase.storage.from("konek-images").upload(croppedPath, croppedFile);
      if (cropError) throw cropError;
      const { data: croppedUrl } = supabase.storage.from("konek-images").getPublicUrl(croppedPath);
      // Upload original photo
      const ext = originalFile.name.split(".").pop() || "jpg";
      const originalPath = "avatars/" + currentUser.id + "/" + ts + "_original." + ext;
      const { error: origError } = await supabase.storage.from("konek-images").upload(originalPath, originalFile);
      if (origError) throw origError;
      const { data: originalUrl } = supabase.storage.from("konek-images").getPublicUrl(originalPath);
      // Save both to users table
      const { error: updateError } = await supabase.from("users").update({
        avatar_url: croppedUrl.publicUrl,
        avatar_original_url: originalUrl.publicUrl,
      }).eq("id", currentUser.id);
      if (updateError) throw updateError;
      setProfileUser(prev => prev ? { ...prev, avatar_url: croppedUrl.publicUrl, avatar_original_url: originalUrl.publicUrl } : prev);
      setCurrentUser(prev => prev ? { ...prev, avatar_url: croppedUrl.publicUrl } : prev);
      setNewAvatarUrl(originalUrl.publicUrl);
      setShowSharePhotoPrompt(true);
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
      const ts = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const path = "avatars/" + currentUser.id + "/" + ts + "." + ext;
      const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
      const { error: updateError } = await supabase.from("users").update({
        avatar_url: urlData.publicUrl,
        avatar_original_url: urlData.publicUrl,
      }).eq("id", currentUser.id);
      if (updateError) throw updateError;
      setProfileUser(prev => prev ? { ...prev, avatar_url: urlData.publicUrl, avatar_original_url: urlData.publicUrl } : prev);
      setCurrentUser(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
      setNewAvatarUrl(urlData.publicUrl);
      setShowSharePhotoPrompt(true);
    } catch (err) {
      showToast("Failed to update avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function sharePhotoToFeed() {
    if (!currentUser || !newAvatarUrl) return;
    setSharingPhoto(true);
    try {
      await supabase.from("posts").insert({
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        content: "updated their profile photo.",
        type: "feed",
        images: [newAvatarUrl],
        is_hidden: false,
        is_flagged: false,
      });
      showToast("Shared to feed!");
    } catch {
      showToast("Failed to share.");
    } finally {
      setSharingPhoto(false);
      setShowSharePhotoPrompt(false);
      setNewAvatarUrl(null);
    }
  }

  function canView(field: string): boolean {
    if (isOwnProfile) return true;
    if (currentUser?.role === "admin" || currentUser?.role === "moderator") return true;
    const setting = privacySettings[field] || "public";
    if (setting === "public") return true;
    if (setting === "school_only") return currentUser?.school_id === profileUser?.school_id;
    return false; // private
  }

  async function handleSavePrivacy(field: string, value: string) {
    if (!currentUser) return;
    setSavingPrivacy(true);
    const updated = { ...privacySettings, [field]: value };
    setPrivacySettings(updated);
    await supabase.from("users").update({ privacy_settings: updated }).eq("id", currentUser.id);
    setSavingPrivacy(false);
  }

  async function handleSaveProfile() {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("users").update({
        bio: editBio.trim() || null,
        phone_number: editPhone.trim() || null,
        birthdate: editBirthdate || null,
        course: editCourse.trim() || null,
        year_level: editYearLevel || null,
        hometown: editHometown.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", currentUser.id);
      if (error) throw error;
      setProfileUser(prev => prev ? { ...prev, bio: editBio.trim() || null, phone_number: editPhone.trim() || null, birthdate: editBirthdate || null, course: editCourse.trim() || null, year_level: editYearLevel || null, hometown: editHometown.trim() || null } : prev);
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



  if (loading) {
    return (
      <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
        <style>{`@keyframes shimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } }`}</style>
        <div style={{backgroundColor: "#2BB39A", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px"}}>
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
        <button onClick={() => router.back()} style={{marginTop: "16px", padding: "10px 24px", backgroundColor: "#2BB39A", color: "#fff", border: "none", borderRadius: "20px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Go Back</button>
      </div>
    );
  }

  const school = getSchool(profileUser.school_id);
  const visibleTabs = TABS;

  return (
    <>
    {viewAvatar && (
      <PhotoViewer
        images={[viewAvatar.src]}
        startIndex={0}
        currentIndex={0}
        onIndexChange={() => {}}
        onClose={() => setViewAvatar(null)}
        posterName={viewAvatar.name}
        posterAvatar={viewAvatar.src}
      />
    )}
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      <div style={{backgroundColor: "#2BB39A", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.back()} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "2px 4px", display: "flex", alignItems: "center", lineHeight: 1}}>&#8249;</button>
        <span style={{color: "#fff", fontWeight: 700, fontSize: "1rem", flex: 1}}>{isOwnProfile ? "My Profile" : profileUser.full_name}</span>
        <button onClick={() => router.push("/feeds")} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "4px", lineHeight: 1}}>✕</button>
      </div>

      {/* ===== HERO SECTION ===== */}
      <div style={{backgroundColor: "#fff", padding: "16px 16px 12px", borderBottom: "1px solid #F0F0F0"}}>
        <div style={{display: "flex", gap: "14px", alignItems: "flex-start"}}>

          {/* LEFT — Avatar + Trust Badge */}
          <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0}}>
            <div style={{position: "relative"}}>
              {profileUser.avatar_url
                ? <img src={profileUser.avatar_url} alt="avatar" onClick={() => setViewAvatar({src: profileUser.avatar_original_url || profileUser.avatar_url || "", name: profileUser.full_name})} style={{cursor: "pointer", width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2.5px solid #2BB39A"}} />
                : <div style={{width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#E1F5EE", border: "2.5px solid #2BB39A", display: "flex", alignItems: "center", justifyContent: "center", color: "#2BB39A", fontWeight: 700, fontSize: "1.8rem"}}>{profileUser.full_name?.charAt(0).toUpperCase()}</div>
              }
              {isVerified && (
                <div style={{position: "absolute", bottom: "2px", right: "2px", width: "20px", height: "20px", backgroundColor: "#2BB39A", borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
              {isOwnProfile && (
                <button onClick={() => setShowAvatarUploader(true)} disabled={uploadingAvatar}
                  style={{position: "absolute", bottom: isVerified ? "22px" : "0px", right: "0", backgroundColor: "#2BB39A", border: "2px solid #fff", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.65rem"}}>
                  {uploadingAvatar ? "⏳" : "📷"}
                </button>
              )}
            </div>
            {/* Trust Badge below avatar */}
            {(() => {
              const tl = getTrustLevel(profileUser.trust_xp || 0);
              return tl ? (
                <span style={{display:"inline-flex",alignItems:"center",gap:"2px",backgroundColor:tl.bg,color:tl.color,fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:"8px",whiteSpace:"nowrap"}}>
                  {tl.emoji} {tl.label}
                </span>
              ) : null;
            })()}
          </div>

          {/* RIGHT — Info + Stats */}
          <div style={{flex: 1, minWidth: 0}}>

            {/* Full Name + Follow Button */}
            <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px", flexWrap: "wrap"}}>
              <span style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", lineHeight: 1.2}}>{profileUser.full_name}</span>
              {!isOwnProfile && (
                <button onClick={handleFollow} disabled={followLoading}
                  style={{padding: "4px 12px", borderRadius: "20px", border: isFollowing ? "1.5px solid #2BB39A" : "none", backgroundColor: isFollowing ? "#fff" : "#2BB39A", color: isFollowing ? "#2BB39A" : "#fff", fontWeight: 700, fontSize: "0.7rem", cursor: followLoading ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0}}>
                  {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>

            {/* IGN */}
            <div style={{fontSize: "0.78rem", color: "#888", marginBottom: "4px"}}>
              @{profileUser.ign || profileUser.full_name?.toLowerCase().replace(/\s+/g, "")}
            </div>

            {/* School · Course */}
            <div style={{fontSize: "0.75rem", color: "#2BB39A", fontWeight: 600, marginBottom: "2px", display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center"}}>
              {school && <span>{school.abbreviation}</span>}
              {profileUser.course && <><span style={{color: "#ccc"}}>·</span><span style={{color: "#888", fontWeight: 500}}>{profileUser.course}</span></>}
            </div>

            {/* Bio */}
            {profileUser.bio && (
              <div style={{fontSize: "0.78rem", color: "#555", lineHeight: 1.4, marginBottom: "8px", marginTop: "2px"}}>{profileUser.bio}</div>
            )}

            {/* 4-col Stats */}
            <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px", marginTop: "8px"}}>
              {[
                { label: "Posts", value: postCount, tap: null },
                { label: "Reactions", value: reactionsReceived, tap: null },
                { label: "Following", value: followingCount, tap: "following" as const },
                { label: "Followers", value: followerCount, tap: "followers" as const },
              ].map(stat => (
                <div key={stat.label} onClick={() => stat.tap && fetchFollowList(stat.tap)}
                  style={{textAlign: "center", padding: "6px 2px", cursor: stat.tap ? "pointer" : "default"}}>
                  <div style={{fontWeight: 700, fontSize: "1rem", color: stat.tap ? "#2BB39A" : "#1A1A1A"}}>{stat.value.toLocaleString()}</div>
                  <div style={{fontSize: "0.6rem", color: "#888", marginTop: "1px"}}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Message + Report buttons for other profiles */}
            {!isOwnProfile && (
              <div style={{display: "flex", gap: "8px", marginTop: "10px"}}>
                <button onClick={handleMessageUser} disabled={messagingUser}
                  style={{flex: 1, padding: "8px 10px", borderRadius: "20px", border: "none", backgroundColor: messagingUser ? "#ccc" : "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: messagingUser ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                  {messagingUser ? "Opening..." : "💬 Message"}
                </button>
                <button style={{padding: "8px 14px", borderRadius: "20px", border: "1.5px solid #EF4444", backgroundColor: "#fff", color: "#EF4444", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit"}}>🚩</button>
              </div>
            )}
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleAvatarChange} />
        {showAvatarUploader && (
          <AvatarUploader
            onComplete={handleAvatarComplete}
            onCancel={() => setShowAvatarUploader(false)}
          />
        )}
      </div>





      <div style={{backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", padding: "8px 16px", position: "sticky", top: "48px", zIndex: 90}}>
        <div style={{display: "flex", backgroundColor: "#F7F7F7", borderRadius: "10px", padding: "3px", gap: "3px"}}>
          {visibleTabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{flex: 1, padding: "8px 4px", border: "none", borderRadius: "8px",
                backgroundColor: activeTab === tab ? "#2BB39A" : "transparent",
                color: activeTab === tab ? "#fff" : "#888",
                fontWeight: activeTab === tab ? 700 : 500,
                fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s"}}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex: 1, paddingBottom: "80px"}}>
        {loadingTab ? (
          <div style={{padding: "40px", textAlign: "center"}}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{display: "inline-block", width: "24px", height: "24px", border: "2px solid #E0E0E0", borderTopColor: "#2BB39A", borderRadius: "50%", animation: "spin 0.8s linear infinite"}} />
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
                          ? <span style={{fontSize: "0.65rem", backgroundColor: "#E1F5EE", color: "#2BB39A", fontWeight: 700, padding: "2px 8px", borderRadius: "10px"}}>QUAD</span>
                          : <span style={{fontSize: "0.65rem", backgroundColor: "#F0F0F0", color: "#888", fontWeight: 700, padding: "2px 8px", borderRadius: "10px"}}>FEED</span>
                        }
                        {post.tag && <span style={{fontSize: "0.68rem", color: "#2BB39A"}}>{post.tag}</span>}
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
                          <div style={{position: "absolute", top: "6px", left: "6px", backgroundColor: "#2BB39A", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px", borderRadius: "8px"}}>SOLD</div>
                        )}
                      </div>
                      <div style={{padding: "8px"}}>
                        <div style={{fontWeight: 600, fontSize: "0.82rem", color: "#1A1A1A", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{listing.title}</div>
                        <div style={{fontWeight: 700, fontSize: "0.88rem", color: "#2BB39A"}}>{formatPrice(listing.price)}</div>
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
                          <span style={{fontSize: "0.65rem", backgroundColor: lp.post_type === "listing" ? "#E1F5EE" : "#FEF2F2", color: lp.post_type === "listing" ? "#2BB39A" : "#EF4444", fontWeight: 700, padding: "2px 8px", borderRadius: "10px"}}>
                            {lp.post_type === "listing" ? "🏠 FOR RENT" : "🔍 LOOKING"}
                          </span>
                          {lp.is_fully_booked && <span style={{fontSize: "0.65rem", backgroundColor: "#F0F0F0", color: "#888", fontWeight: 700, padding: "2px 8px", borderRadius: "10px"}}>FULLY BOOKED</span>}
                        </div>
                        <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{lp.title}</div>
                        {lp.price_per_month && <div style={{fontSize: "0.82rem", color: "#2BB39A", fontWeight: 600}}>\u20b1{lp.price_per_month.toLocaleString()}/mo</div>}
                        {lp.address && <div style={{fontSize: "0.72rem", color: "#888", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>📍 {lp.address}</div>}
                        <div style={{fontSize: "0.68rem", color: "#aaa", marginTop: "4px"}}>{formatTime(lp.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === "About" && (
              <div style={{padding: "16px", display: "flex", flexDirection: "column", gap: "12px"}}>

                {/* INFO CARD */}
                <div style={{backgroundColor: "#fff", borderRadius: "14px", padding: "16px", border: "1px solid #F0F0F0"}}>
                  <div style={{fontWeight: 700, fontSize: "0.72rem", color: "#aaa", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em"}}>Info</div>
                  <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
                    <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                      <img src="/icon/school.png" alt="" style={{width: "22px", height: "22px", objectFit: "contain", flexShrink: 0, opacity: 0.6}} />
                      <div>
                        <div style={{fontSize: "0.68rem", color: "#aaa", marginBottom: "1px"}}>School</div>
                        <div style={{fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A"}}>{school?.name || "Unknown"}</div>
                      </div>
                    </div>
                    {(profileUser.course || profileUser.year_level) && canView("course") && (
                      <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                        <img src="/icon/course_black.png" alt="" style={{width: "22px", height: "22px", objectFit: "contain", flexShrink: 0, opacity: 0.6}} />
                        <div>
                          <div style={{fontSize: "0.68rem", color: "#aaa", marginBottom: "1px"}}>Course</div>
                          <div style={{fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A"}}>{profileUser.course}{profileUser.course && profileUser.year_level ? " · " : ""}{profileUser.year_level}</div>
                        </div>
                      </div>
                    )}
                    {profileUser.hometown && canView("hometown") && (
                      <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                        <img src="/icon/living_black.png" alt="" style={{width: "22px", height: "22px", objectFit: "contain", flexShrink: 0, opacity: 0.6}} />
                        <div>
                          <div style={{fontSize: "0.68rem", color: "#aaa", marginBottom: "1px"}}>Hometown</div>
                          <div style={{fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A"}}>{profileUser.hometown}</div>
                        </div>
                      </div>
                    )}
                    {profileUser.birthdate && canView("birthdate") && (
                      <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                        <img src="/icon/birthday_black.png" alt="" style={{width: "22px", height: "22px", objectFit: "contain", flexShrink: 0, opacity: 0.6}} />
                        <div>
                          <div style={{fontSize: "0.68rem", color: "#aaa", marginBottom: "1px"}}>Birthday</div>
                          <div style={{fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A"}}>{new Date(profileUser.birthdate).toLocaleDateString("en-PH", {month: "long", day: "numeric", year: "numeric"})}</div>
                        </div>
                      </div>
                    )}
                    {profileUser.phone_number && canView("phone") && (
                      <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                        <img src="/icon/phone_black.png" alt="" style={{width: "22px", height: "22px", objectFit: "contain", flexShrink: 0, opacity: 0.6}} />
                        <div>
                          <div style={{fontSize: "0.68rem", color: "#aaa", marginBottom: "1px"}}>Phone</div>
                          <a href={"tel:" + profileUser.phone_number} style={{fontSize: "0.85rem", fontWeight: 600, color: "#2BB39A", textDecoration: "none"}}>{profileUser.phone_number}</a>
                        </div>
                      </div>
                    )}
                    <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
                      <img src="/icon/member.png" alt="" style={{width: "22px", height: "22px", objectFit: "contain", flexShrink: 0, opacity: 0.6}} />
                      <div>
                        <div style={{fontSize: "0.68rem", color: "#aaa", marginBottom: "1px"}}>Member since</div>
                        <div style={{fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A"}}>{formatMemberSince(profileUser.created_at)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRUST LEVEL CARD */}
                {(() => {
                  const xp = profileUser.trust_xp || 0;
                  const tl = getTrustLevel(xp);
                  const next = getNextLevel(xp);
                  const prevThreshold = xp >= 1000 ? 1000 : xp >= 500 ? 500 : xp >= 100 ? 100 : 0;
                  const pct = xp >= 1000 ? 100 : Math.round(((xp - prevThreshold) / (next.threshold - prevThreshold)) * 100);
                  return (
                    <div style={{backgroundColor: tl ? tl.bg : "#F1EFE8", borderRadius: "14px", padding: "16px", border: "1px solid " + (tl ? tl.border : "#D3D1C7")}}>
                      <div style={{fontWeight: 700, fontSize: "0.72rem", color: tl ? tl.color : "#888", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em"}}>Trust Level</div>
                      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px"}}>
                        <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                          <span style={{fontSize: "1.8rem"}}>{tl ? tl.emoji : "🌱"}</span>
                          <div>
                            <div style={{fontSize: "1rem", fontWeight: 700, color: tl ? tl.color : "#444441"}}>{tl ? tl.label : "Newbie"}</div>
                            <div style={{fontSize: "0.72rem", color: tl ? tl.color : "#888", opacity: 0.8}}>{xp} XP total</div>
                          </div>
                        </div>
                        <div style={{backgroundColor: tl ? tl.border : "#D3D1C7", color: tl ? tl.color : "#444441", fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: "12px"}}>{xp} XP</div>
                      </div>
                      {xp < 1000 && (
                        <>
                          <div style={{display: "flex", justifyContent: "space-between", marginBottom: "5px"}}>
                            <span style={{fontSize: "0.7rem", color: tl ? tl.color : "#888", fontWeight: 600}}>{tl ? tl.label : "Newbie"} → {next.label}</span>
                            <span style={{fontSize: "0.7rem", color: tl ? tl.color : "#888"}}>{xp} / {next.threshold} XP</span>
                          </div>
                          <div style={{height: "7px", borderRadius: "4px", backgroundColor: tl ? tl.track : "#D3D1C7", overflow: "hidden", marginBottom: "12px"}}>
                            <div style={{height: "100%", borderRadius: "4px", backgroundColor: tl ? tl.fill : "#888780", width: pct + "%"}} />
                          </div>
                        </>
                      )}
                      {xp >= 1000 && <div style={{fontSize: "0.78rem", color: "#633806", fontWeight: 600, textAlign: "center", marginBottom: "12px"}}>Maximum level reached! 🎉</div>}
                      <div style={{borderTop: "1px solid " + (tl ? tl.border : "#D3D1C7"), paddingTop: "10px"}}>
                        <div style={{fontSize: "0.7rem", color: tl ? tl.color : "#888", fontWeight: 600, marginBottom: "7px"}}>How to earn XP</div>
                        <div style={{display: "flex", gap: "5px", flexWrap: "nowrap", overflowX: "auto"}}>
                          {[["Post","5"],["Comment","3"],["Reaction received","2"],["Upvote received","3"]].map(([act, pts]) => (
                            <span key={act} style={{fontSize: "0.68rem", padding: "3px 8px", borderRadius: "8px", backgroundColor: tl ? tl.border : "#D3D1C7", color: tl ? tl.color : "#444441", fontWeight: 600}}>+{pts} {act}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* INVITE CARD — own profile only */}
                {isOwnProfile && profileUser.invite_code && (
                  <div style={{backgroundColor: "#fff", borderRadius: "14px", padding: "16px", border: "1px solid #F0F0F0"}}>
                    <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px"}}>
                      <span style={{fontSize: "1rem"}}>🎁</span>
                      <span style={{fontWeight: 700, fontSize: "0.88rem", color: "#1A1A1A"}}>Your Invite Code</span>
                      <span style={{marginLeft: "auto", fontSize: "0.75rem", color: "#0F6E56", fontWeight: 700, backgroundColor: "#E1F5EE", padding: "2px 8px", borderRadius: "8px"}}>{profileUser.referral_count || 0} referrals</span>
                    </div>
                    <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px"}}>
                      <div style={{flex: 1, backgroundColor: "#E1F5EE", borderRadius: "10px", padding: "10px 14px", fontWeight: 800, fontSize: "1.2rem", color: "#0F6E56", letterSpacing: "0.1em", fontFamily: "monospace", border: "2px dashed #0F6E56"}}>
                        {profileUser.invite_code}
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(profileUser.invite_code || ""); showToast("Copied!"); }}
                        style={{backgroundColor: "#2BB39A", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 16px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
                        Copy
                      </button>
                    </div>
                    <div style={{fontSize: "0.75rem", color: "#444", marginBottom: "10px"}}>Share with schoolmates. They sign up, you earn badges.</div>
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                      {[
                        {count: 5,   emoji: "🎓", label: "Campus Connector"},
                        {count: 20,  emoji: "🌟", label: "Community Builder"},
                        {count: 50,  emoji: "🚀", label: "Campus Ambassador"},
                        {count: 100, emoji: "👑", label: "Founding Influencer"},
                      ].map(m => {
                        const done = (profileUser.referral_count || 0) >= m.count;
                        return (
                          <div key={m.count} style={{display: "flex", alignItems: "center", gap: "8px", opacity: done ? 1 : 0.5}}>
                            <div style={{width: "20px", height: "20px", borderRadius: "50%", backgroundColor: done ? "#2BB39A" : "#888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#fff", fontWeight: 700, flexShrink: 0}}>
                              {done ? "✓" : m.count}
                            </div>
                            <span style={{fontSize: "0.75rem", fontWeight: done ? 700 : 400, color: done ? "#0F6E56" : "#1A1A1A", textDecoration: done ? "none" : "none"}}>
                              {m.emoji} {m.label} — {m.count} referrals
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STUDENT VERIFICATION — own profile only */}
                {isOwnProfile && (
                  <div style={{backgroundColor: "#fff", borderRadius: "14px", padding: "16px", border: "1px solid #F0F0F0"}}>
                    <div style={{fontWeight: 700, fontSize: "0.72rem", color: "#aaa", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em"}}>Student Verification</div>
                    {profileUser?.verification_status === "approved" && (
                      <div style={{display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#E1F5EE", borderRadius: "12px", padding: "14px"}}>
                        <span style={{fontSize: "1.6rem"}}>✅</span>
                        <div>
                          <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#0F6E56"}}>Verified Student</div>
                          <div style={{fontSize: "0.72rem", color: "#2BB39A", marginTop: "2px"}}>Your Student ID has been verified successfully.</div>
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
                      <div style={{backgroundColor: "#FEF2F2", borderRadius: "12px", padding: "14px"}}>
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
                        <button onClick={() => setShowVerifySheet(true)} style={{backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%"}}>Upload New ID</button>
                      </div>
                    )}
                    {(profileUser?.verification_status === "unverified" || !profileUser?.verification_status) && (
                      <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "16px"}}>
                        <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px"}}>
                          <span style={{fontSize: "1.3rem"}}>🪪</span>
                          <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>Become a Verified Student</div>
                        </div>
                        <div style={{display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px"}}>
                          {["Verified badge beside your name", "More trust in Bazaar listings", "More credibility across Klasmeyt"].map(benefit => (
                            <div key={benefit} style={{display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "#555"}}>
                              <span style={{color: "#2BB39A", fontWeight: 700}}>✓</span> {benefit}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setShowVerifySheet(true)} style={{backgroundColor: "#2BB39A", color: "#fff", border: "none", borderRadius: "8px", padding: "11px 20px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%"}}>Verify Student ID</button>
                      </div>
                    )}
                  </div>
                )}

                {/* ADMIN PANEL — admin/mod only */}
                {isOwnProfile && (currentUser?.role === "admin" || currentUser?.role === "moderator") && (
                  <div style={{paddingBottom: "8px"}}>
                    <button onClick={() => router.push("/admin")} style={{width: "100%", padding: "14px", borderRadius: "14px", border: "1.5px solid #2BB39A", backgroundColor: "#E1F5EE", color: "#2BB39A", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit"}}>
                      🛡️ Admin Panel
                    </button>
                  </div>
                )}

              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="/feeds" unreadMessages={unreadMessages} />

      {showSharePhotoPrompt && (
        <>
          <div style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "24px 16px 40px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto 16px"}} />
            <div style={{textAlign: "center", marginBottom: "20px"}}>
              {newAvatarUrl && <img src={newAvatarUrl} alt="" style={{width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid #2BB39A", marginBottom: "12px"}} />}
              <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "6px"}}>Profile photo updated!</div>
              <div style={{fontSize: "0.82rem", color: "#888"}}>Would you like to share this to your school feed?</div>
            </div>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => { setShowSharePhotoPrompt(false); setNewAvatarUrl(null); showToast("Profile photo updated!"); }}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>
                Skip
              </button>
              <button onClick={sharePhotoToFeed} disabled={sharingPhoto}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: sharingPhoto ? "#ccc" : "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: sharingPhoto ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                {sharingPhoto ? "Sharing..." : "Share to Feed"}
              </button>
            </div>
          </div>
        </>
      )}

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
            <div style={{marginBottom: "16px"}}>
              <label style={{fontSize: "0.78rem", fontWeight: 600, color: "#888", display: "block", marginBottom: "6px"}}>Birthday (optional)</label>
              <input type="date" value={editBirthdate} onChange={e => setEditBirthdate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            </div>
            <div style={{marginBottom: "16px"}}>
              <label style={{fontSize: "0.78rem", fontWeight: 600, color: "#888", display: "block", marginBottom: "6px"}}>Course / Program (optional)</label>
              <input type="text" value={editCourse} onChange={e => setEditCourse(e.target.value)} placeholder="e.g. BS Computer Science" maxLength={80}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            </div>
            <div style={{marginBottom: "16px"}}>
              <label style={{fontSize: "0.78rem", fontWeight: 600, color: "#888", display: "block", marginBottom: "6px"}}>Year Level (optional)</label>
              <select value={editYearLevel} onChange={e => setEditYearLevel(e.target.value)}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: editYearLevel ? "#1A1A1A" : "#aaa", backgroundColor: "#F7F7F7", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}}>
                <option value="">Select year level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
                <option value="Graduate">Graduate</option>
              </select>
            </div>
            <div style={{marginBottom: "20px"}}>
              <label style={{fontSize: "0.78rem", fontWeight: 600, color: "#888", display: "block", marginBottom: "6px"}}>Hometown (optional)</label>
              <input type="text" value={editHometown} onChange={e => setEditHometown(e.target.value)} placeholder="e.g. Cebu City" maxLength={80}
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
              <button onClick={handleSaveProfile} disabled={savingProfile} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: savingProfile ? "#ccc" : "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: savingProfile ? "not-allowed" : "pointer", fontFamily: "inherit"}}>{savingProfile ? "Saving..." : "Save"}</button>
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
              {["Verified badge beside your name", "More trust in Bazaar listings", "More credibility across Klasmeyt"].map(b => (
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
                    <img src={verifyFrontPreview} alt="front" style={{width: "100%", height: "160px", objectFit: "contain", borderRadius: "10px", border: "2px solid #2BB39A", backgroundColor: "#F7F7F7"}} />
                    <div style={{position: "absolute", bottom: "8px", right: "8px", backgroundColor: "#2BB39A", color: "#fff", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 700}}>Change</div>
                  </div>
                ) : (
                  <div style={{width: "100%", height: "140px", border: "2px dashed #2BB39A", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#E1F5EE", gap: "6px"}}>
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
              Your Student ID is private and only visible to Klasmeyt admins for verification purposes.
            </div>

            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowVerifySheet(false)}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>
                Cancel
              </button>
              <button onClick={handleVerificationSubmit} disabled={!verifyFrontFile || submittingVerify}
                style={{flex: 2, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: !verifyFrontFile || submittingVerify ? "#ccc" : "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: !verifyFrontFile || submittingVerify ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                {submittingVerify ? "Submitting..." : "Submit for Verification"}
              </button>
            </div>
          </div>
        </>
      )}



      {/* Follow Sheet */}
      {showFollowSheet && (
        <>
          <div onClick={() => setShowFollowSheet(null)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px,100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, maxHeight: "70vh", display: "flex", flexDirection: "column"}}>
            <div style={{padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
              <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto"}} />
            </div>
            <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
              <span style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A"}}>
                {showFollowSheet === "followers" ? "Followers" : "Following"}
              </span>
              <button onClick={() => setShowFollowSheet(null)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.1rem", padding: "4px"}}>✕</button>
            </div>
            <div style={{overflowY: "auto", flex: 1, paddingBottom: "24px"}}>
              {loadingFollowSheet ? (
                <div style={{textAlign: "center", padding: "32px", color: "#888", fontSize: "0.85rem"}}>Loading...</div>
              ) : followSheetList.length === 0 ? (
                <div style={{textAlign: "center", padding: "32px"}}>
                  <div style={{fontSize: "2rem", marginBottom: "8px"}}>{showFollowSheet === "followers" ? "👥" : "🔍"}</div>
                  <div style={{fontSize: "0.85rem", color: "#888"}}>{showFollowSheet === "followers" ? "No followers yet" : "Not following anyone yet"}</div>
                </div>
              ) : followSheetList.map(u => {
                const uSchool = schools.find(s => s.id === u.school_id);
                return (
                  <div key={u.id} onClick={() => { setShowFollowSheet(null); router.push("/profile/" + u.id); }}
                    style={{display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", borderBottom: "1px solid #F0F0F0", cursor: "pointer"}}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F7F7F7")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" style={{width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                      : <div style={{width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#2BB39A", fontWeight: 700, fontSize: "1rem", flexShrink: 0}}>{u.full_name?.charAt(0).toUpperCase()}</div>
                    }
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontWeight: 700, fontSize: "0.875rem", color: "#1A1A1A"}}>{u.full_name}</div>
                      <div style={{fontSize: "0.72rem", color: "#888"}}>@{u.ign || u.full_name?.toLowerCase().replace(/\s+/g,"")}</div>
                      {uSchool && <div style={{fontSize: "0.68rem", color: "#2BB39A", fontWeight: 600}}>{uSchool.abbreviation}</div>}
                    </div>
                  </div>
                );
              })}
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
