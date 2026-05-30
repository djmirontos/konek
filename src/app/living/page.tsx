'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import SchoolPicker from "@/components/SchoolPicker";
import NotificationDropdown from "@/components/NotificationDropdown";

import { useRouter } from "next/navigation";

const AMENITIES = ["WiFi", "Water", "Electricity", "Private CR", "Shared CR", "Kitchen", "Laundry", "Aircon", "Furnished", "With meals"];

type School = { id: string; name: string; abbreviation: string; };
type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type BoardingHouse = {
  id: string; user_id: string; post_type: string; name: string; description: string | null;
  address: string | null; price_per_month: number | null; is_negotiable: boolean;
  available_slots: number | null; is_fully_booked: boolean; contact_number: string | null;
  amenities: string[] | null; images: string[] | null; school_id: string;
  created_at: string; edited_at: string | null; comment_count: number;
  users: { full_name: string; avatar_url: string | null; } | null;
};
type Notification = {
  id: string; message: string; is_read: boolean; created_at: string; post_id: string | null; type: string;
};

export default function LivingPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [posts, setPosts] = useState<BoardingHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>("own");
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [filterType, setFilterType] = useState<string>("All");

  // Composer fields
  const [postType, setPostType] = useState<"listing" | "looking">("listing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [availableSlots, setAvailableSlots] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [postError, setPostError] = useState("");

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (currentUser) fetchPosts(); }, [currentUser, selectedSchool, filterType]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    const { data: schoolData } = await supabase.from("schools").select("id, name, abbreviation").order("name");
    if (schoolData) setSchools(schoolData);
    fetchUnreadCount(userData);
  }

  async function fetchUnreadCount(user: User | null) {
    if (!user) return;
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("is_read", false);
    setUnreadCount(count || 0);
  }

  async function fetchNotifications() {
    if (!currentUser) return;
    const { data } = await supabase.from("notifications").select("*").eq("recipient_id", currentUser.id).order("created_at", { ascending: false }).limit(20);
    if (data) setNotifications(data);
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", currentUser.id).eq("is_read", false);
    setUnreadCount(0);
  }

  async function fetchPosts() {
    if (!currentUser) return;
    setLoading(true);
    let query = supabase
      .from("boarding_houses")
      .select("id, user_id, post_type, name, description, address, price_per_month, is_negotiable, available_slots, is_fully_booked, contact_number, amenities, images, school_id, created_at, edited_at, comment_count, users(full_name, avatar_url)")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(30);
    if (selectedSchool === "own") query = query.eq("school_id", currentUser.school_id);
    else if (selectedSchool !== "all") query = query.eq("school_id", selectedSchool);
    if (filterType === "Room for Rent") query = query.eq("post_type", "listing");
    else if (filterType === "Looking") query = query.eq("post_type", "looking");
    const { data, error } = await query;
    if (data) setPosts(data.map((p: any) => ({...p, users: Array.isArray(p.users) ? p.users[0] ?? null : p.users})));
    if (error) console.error(error);
    setLoading(false);
  }

  async function handlePost() {
    if (!title.trim()) { setPostError("Please enter a title."); return; }
    if (postType === "listing" && !address.trim()) { setPostError("Please enter the address/location."); return; }
    if (!currentUser) return;
    setPosting(true);
    setPostError("");
    try {
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        for (const img of selectedImages) {
          const ext = img.name.split(".").pop();
          const path = "living/" + currentUser.id + "/" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
          const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, img);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        }
      }
      const slots = availableSlots ? parseInt(availableSlots) : null;
      const { error } = await supabase.from("boarding_houses").insert({
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        post_type: postType,
        name: title.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        price_per_month: price ? parseFloat(price) : null,
        is_negotiable: isNegotiable,
        available_slots: slots,
        is_fully_booked: slots !== null && slots === 0,
        contact_number: contactNumber.trim() || null,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : null,
        images: imageUrls.length > 0 ? imageUrls : null,
        is_flagged: false,
        is_hidden: false,
        comment_count: 0,
      });
      if (error) throw error;
      resetComposer();
      setShowComposer(false);
      showToast("Posted!");
      fetchPosts();
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : "Failed to post. Try again.");
    } finally {
      setPosting(false);
    }
  }

  function resetComposer() {
    setTitle(""); setDescription(""); setPrice(""); setIsNegotiable(false);
    setAvailableSlots(""); setContactNumber(""); setAddress("");
    setSelectedAmenities([]); setSelectedImages([]); setImagePreviews([]);
    setPostError(""); setPostType("listing");
  }

  async function handleMarkFullyBooked(id: string) {
    await supabase.from("boarding_houses").update({ is_fully_booked: true, available_slots: 0 }).eq("id", id);
    setShowMenu(null); showToast("Marked as Fully Booked!"); fetchPosts();
  }

  async function handleDelete(id: string) {
    await supabase.from("boarding_houses").delete().eq("id", id);
    setShowMenu(null); showToast("Post deleted!"); fetchPosts();
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024 && (f.type === "image/jpeg" || f.type === "image/png"));
    const combined = [...selectedImages, ...valid].slice(0, 4);
    setSelectedImages(combined);
    setImagePreviews(combined.map(f => URL.createObjectURL(f)));
  }

  function removeImage(index: number) {
    const imgs = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(imgs);
    setImagePreviews(imgs.map(f => URL.createObjectURL(f)));
  }

  function toggleAmenity(amenity: string) {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function formatTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  function getSchoolLabel() {
    if (selectedSchool === "own") {
      const s = schools.find(s => s.id === currentUser?.school_id);
      return s ? s.abbreviation : "My School";
    }
    if (selectedSchool === "all") return "All Schools";
    const s = schools.find(s => s.id === selectedSchool);
    return s ? s.abbreviation : "School";
  }

  function getNotifIcon(type: string) {
    if (type === "reaction") return "👍";
    if (type === "comment") return "💬";
    if (type === "reply") return "↩️";
    return "🔔";
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {toast && (
        <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>
      )}

      {/* Header */}
      <AppHeader
        currentUser={currentUser}
        schools={schools}
        pageName="LIVING"
        selectedSchool={selectedSchool}
        unreadCount={unreadCount}
        onSchoolPickerToggle={() => setShowSchoolPicker(!showSchoolPicker)}
        onNotificationsToggle={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications(); }}
        onLogout={handleLogout}
      />
      {/* Notification Dropdown */}
      {showNotifications && <NotificationDropdown notifications={notifications} onClose={() => setShowNotifications(false)} navigateTo="/living" />}

      {/* School Picker */}
      {showSchoolPicker && <SchoolPicker schools={schools} currentUser={currentUser} selectedSchool={selectedSchool} onSelect={setSelectedSchool} onClose={() => setShowSchoolPicker(false)} />}

      {/* Filter Tabs */}
      <div style={{backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", padding: "10px 0"}}>
        <div style={{display: "flex", gap: "8px", paddingLeft: "12px", overflowX: "auto", scrollbarWidth: "none"}}>
          {["All", "Room for Rent", "Looking"].map(tab => (
            <button key={tab} onClick={() => setFilterType(tab)}
              style={{padding: "6px 14px", borderRadius: "20px", border: "none", backgroundColor: filterType === tab ? "#1D9E75" : "#F7F7F7", color: filterType === tab ? "#fff" : "#888", fontWeight: filterType === tab ? 700 : 400, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0}}>
              {tab === "All" ? "🏘️ All" : tab === "Room for Rent" ? "🏠 Room for Rent" : "🔍 Looking"}
            </button>
          ))}
        </div>
      </div>

      {/* Post Button */}
      <div style={{padding: "12px 16px", backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0"}}>
        <button onClick={() => setShowComposer(true)}
          style={{width: "100%", backgroundColor: "#1D9E75", color: "#fff", border: "none", borderRadius: "12px", padding: "12px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}>
          + Post a Listing
        </button>
      </div>

      {/* Posts Feed */}
      <div style={{flex: 1, paddingBottom: "80px", display: "flex", flexDirection: "column", gap: "0"}}>
        {loading ? (
          <div style={{textAlign: "center", padding: "48px 16px", color: "#888"}}>
            <div style={{fontSize: "2rem", marginBottom: "8px"}}>⏳</div>
            <div style={{fontSize: "0.85rem"}}>Loading listings...</div>
          </div>
        ) : posts.length === 0 ? (
          <div style={{textAlign: "center", padding: "48px 16px"}}>
            <div style={{fontSize: "3rem", marginBottom: "12px"}}>🏘️</div>
            <div style={{fontWeight: 700, color: "#1A1A1A", fontSize: "1rem", marginBottom: "6px"}}>Walay listings pa!</div>
            <div style={{color: "#888", fontSize: "0.8rem"}}>Be the first to post a listing.</div>
          </div>
        ) : (
          <div style={{display: "flex", flexDirection: "column", gap: "8px", padding: "12px"}}>
            {posts.map(post => (
              <div key={post.id} onClick={() => router.push("/living/" + post.id)}
                style={{backgroundColor: "#fff", borderRadius: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "pointer", overflow: "hidden", position: "relative"}}>

                {/* Badges */}
                <div style={{position: "absolute", top: "10px", left: "10px", display: "flex", gap: "6px", zIndex: 2, flexWrap: "wrap"}}>
                  {post.is_fully_booked && (
                    <span style={{backgroundColor: "#EF4444", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: "10px"}}>FULLY BOOKED</span>
                  )}
                  {post.post_type === "looking" && (
                    <span style={{backgroundColor: "#F59E0B", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: "10px"}}>LOOKING</span>
                  )}
                  {post.post_type === "listing" && !post.is_fully_booked && (
                    <span style={{backgroundColor: "#1D9E75", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: "10px"}}>FOR RENT</span>
                  )}
                </div>

                {/* Owner menu button */}
                {currentUser?.id === post.user_id && (
                  <button onClick={e => { e.stopPropagation(); setShowMenu(showMenu === post.id ? null : post.id); }}
                    style={{position: "absolute", top: "8px", right: "8px", background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", zIndex: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.12)"}}>
                    •••
                  </button>
                )}

                {/* Image */}
                {post.images && post.images.length > 0 ? (
                  <img src={post.images[0]} alt="" style={{width: "100%", height: "180px", objectFit: "cover", display: "block"}} />
                ) : (
                  <div style={{width: "100%", height: "100px", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem"}}>
                    {post.post_type === "looking" ? "🔍" : "🏠"}
                  </div>
                )}

                {/* Content */}
                <div style={{padding: "12px 14px 14px"}}>
                  <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A", marginBottom: "4px"}}>{post.name}</div>

                  {post.price_per_month && (
                    <div style={{fontWeight: 700, fontSize: "1rem", color: "#1D9E75", marginBottom: "4px"}}>
                      ₱{post.price_per_month.toLocaleString("en-PH")}/mo
                      {post.is_negotiable && <span style={{fontSize: "0.7rem", color: "#888", fontWeight: 400, marginLeft: "6px"}}>Negotiable</span>}
                    </div>
                  )}

                  {post.address && (
                    <div style={{fontSize: "0.78rem", color: "#888", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px"}}>
                      📍 {post.address}
                    </div>
                  )}

                  {post.available_slots !== null && !post.is_fully_booked && (
                    <div style={{fontSize: "0.75rem", color: "#1D9E75", fontWeight: 600, marginBottom: "6px"}}>
                      {post.available_slots} slot{post.available_slots !== 1 ? "s" : ""} available
                    </div>
                  )}

                  {post.amenities && post.amenities.length > 0 && (
                    <div style={{display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px"}}>
                      {post.amenities.slice(0, 4).map(a => (
                        <span key={a} style={{fontSize: "0.65rem", backgroundColor: "#E1F5EE", color: "#0F6E56", padding: "2px 7px", borderRadius: "8px", fontWeight: 600}}>{a}</span>
                      ))}
                      {post.amenities.length > 4 && (
                        <span style={{fontSize: "0.65rem", backgroundColor: "#F7F7F7", color: "#888", padding: "2px 7px", borderRadius: "8px"}}>+{post.amenities.length - 4} more</span>
                      )}
                    </div>
                  )}

                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px"}}>
                    <div style={{display: "flex", alignItems: "center", gap: "5px"}}>
                      {post.users?.avatar_url
                        ? <img src={post.users.avatar_url} alt="" style={{width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover"}} />
                        : <div style={{width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", color: "#1D9E75", fontWeight: 700}}>{post.users?.full_name?.charAt(0).toUpperCase()}</div>
                      }
                      <span style={{fontSize: "0.72rem", color: "#888"}}>{post.users?.full_name}</span>
                    </div>
                    <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                      <span style={{fontSize: "0.68rem", color: "#888", display: "flex", alignItems: "center", gap: "3px"}}>💬 {post.comment_count}</span>
                      <span style={{fontSize: "0.68rem", color: "#888"}}>{formatTime(post.created_at)}{post.edited_at ? " · Edited" : ""}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="/living" />
      {/* Composer Bottom Sheet */}
      {showComposer && (
        <>
          <div onClick={() => { setShowComposer(false); resetComposer(); }} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, maxHeight: "92vh", overflowY: "auto", paddingBottom: "32px"}}>
            <div style={{padding: "16px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10}}>
              <span style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A"}}>Post a Listing</span>
              <button onClick={() => { setShowComposer(false); resetComposer(); }} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem"}}>✕</button>
            </div>

            <div style={{padding: "16px", display: "flex", flexDirection: "column", gap: "14px"}}>

              {/* Post Type Picker */}
              <div>
                <div style={{fontSize: "0.75rem", color: "#888", fontWeight: 600, marginBottom: "8px"}}>Post Type</div>
                <div style={{display: "flex", gap: "8px"}}>
                  <button onClick={() => setPostType("listing")}
                    style={{flex: 1, padding: "12px", borderRadius: "12px", border: "2px solid " + (postType === "listing" ? "#1D9E75" : "#F0F0F0"), backgroundColor: postType === "listing" ? "#E1F5EE" : "#fff", color: postType === "listing" ? "#1D9E75" : "#888", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", textAlign: "center"}}>
                    🏠 Room for Rent
                  </button>
                  <button onClick={() => setPostType("looking")}
                    style={{flex: 1, padding: "12px", borderRadius: "12px", border: "2px solid " + (postType === "looking" ? "#F59E0B" : "#F0F0F0"), backgroundColor: postType === "looking" ? "#FFFBEB" : "#fff", color: postType === "looking" ? "#D97706" : "#888", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", textAlign: "center"}}>
                    🔍 Looking for Room
                  </button>
                </div>
              </div>

              {/* Title */}
              <input placeholder={postType === "listing" ? "Boarding house name *" : "What are you looking for? *"} value={title} onChange={e => setTitle(e.target.value)}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box"}} />

              {/* Description */}
              <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={3}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", resize: "none", boxSizing: "border-box"}} />

              {/* Price */}
              <div style={{display: "flex", gap: "8px"}}>
                <input placeholder={postType === "listing" ? "Price/month (₱) optional" : "Budget/month (₱) optional"} value={price} onChange={e => setPrice(e.target.value)} type="number"
                  style={{flex: 1, border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7"}} />
                <button onClick={() => setIsNegotiable(!isNegotiable)}
                  style={{padding: "10px 14px", borderRadius: "10px", border: "1px solid " + (isNegotiable ? "#1D9E75" : "#F0F0F0"), backgroundColor: isNegotiable ? "#E1F5EE" : "#F7F7F7", color: isNegotiable ? "#1D9E75" : "#888", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
                  {isNegotiable ? "✓ Nego" : "Nego?"}
                </button>
              </div>

              {/* Location */}
              <input placeholder={postType === "listing" ? "Address / Location *" : "Preferred location (optional)"} value={address} onChange={e => setAddress(e.target.value)}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box"}} />

              {/* Listing-only fields */}
              {postType === "listing" && (
                <>
                  {/* Available Slots */}
                  <input placeholder="Available slots (optional, e.g. 2)" value={availableSlots} onChange={e => setAvailableSlots(e.target.value)} type="number"
                    style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box"}} />

                  {/* Contact Number */}
                  <input placeholder="Contact number (optional)" value={contactNumber} onChange={e => setContactNumber(e.target.value)} type="tel"
                    style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box"}} />

                  {/* Amenities */}
                  <div>
                    <div style={{fontSize: "0.75rem", color: "#888", fontWeight: 600, marginBottom: "8px"}}>Amenities (optional)</div>
                    <div style={{display: "flex", gap: "6px", flexWrap: "wrap"}}>
                      {AMENITIES.map(a => (
                        <button key={a} onClick={() => toggleAmenity(a)}
                          style={{padding: "5px 10px", borderRadius: "20px", border: "1px solid " + (selectedAmenities.includes(a) ? "#1D9E75" : "#F0F0F0"), backgroundColor: selectedAmenities.includes(a) ? "#E1F5EE" : "#fff", color: selectedAmenities.includes(a) ? "#1D9E75" : "#888", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Photos */}
              <div>
                <div style={{fontSize: "0.75rem", color: "#888", fontWeight: 600, marginBottom: "6px"}}>Photos (up to 4)</div>
                <div style={{display: "flex", gap: "8px", flexWrap: "wrap"}}>
                  {imagePreviews.map((src, i) => (
                    <div key={i} style={{position: "relative"}}>
                      <img src={src} alt="" style={{width: "72px", height: "72px", objectFit: "cover", borderRadius: "8px"}} />
                      <button onClick={() => removeImage(i)} style={{position: "absolute", top: "-6px", right: "-6px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>✕</button>
                    </div>
                  ))}
                  {selectedImages.length < 4 && (
                    <button onClick={() => fileInputRef.current?.click()}
                      style={{width: "72px", height: "72px", border: "2px dashed #E0E0E0", borderRadius: "8px", backgroundColor: "#F7F7F7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "#ccc"}}>
                      +
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple style={{display: "none"}} onChange={handleImageSelect} />
                </div>
              </div>

              {postError && <div style={{color: "#EF4444", fontSize: "0.75rem"}}>{postError}</div>}

              <button onClick={handlePost} disabled={posting}
                style={{backgroundColor: posting ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontWeight: 700, fontSize: "0.9rem", cursor: posting ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                {posting ? "Posting..." : "Post Listing"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Owner Menu */}
      {showMenu && (
        <>
          <div onClick={() => setShowMenu(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
            {!posts.find(p => p.id === showMenu)?.is_fully_booked && posts.find(p => p.id === showMenu)?.post_type === "listing" && (
              <button onClick={() => handleMarkFullyBooked(showMenu)}
                style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
                🔴 Mark as Fully Booked
              </button>
            )}
            <button onClick={() => router.push("/living/" + showMenu)}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1A1A1A"}}>
              👁️ View Listing
            </button>
            <button onClick={() => { setShowDeleteConfirm(showMenu); setShowMenu(null); }}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
              🗑️ Delete Post
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <>
          <div onClick={() => setShowDeleteConfirm(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.5)"}} />
          <div style={{position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(320px, 90vw)", backgroundColor: "#fff", borderRadius: "16px", zIndex: 500, padding: "24px"}}>
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "8px"}}>Delete Post?</div>
            <div style={{fontSize: "0.85rem", color: "#888", marginBottom: "20px"}}>This cannot be undone.</div>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowDeleteConfirm(null)}
                style={{flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #F0F0F0", backgroundColor: "#F7F7F7", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>
                Cancel
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)}
                style={{flex: 1, padding: "11px", borderRadius: "10px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>
                Delete
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}