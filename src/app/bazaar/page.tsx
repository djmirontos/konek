'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import SchoolPicker from "@/components/SchoolPicker";

import { useRouter } from "next/navigation";
import { useSchool } from "@/context/SchoolContext";
import imageCompression from "browser-image-compression";

const CATEGORIES = ["Textbooks", "Uniforms", "Gadgets", "School Supplies", "Dorm Essentials", "Food", "Entertainment", "Sports", "Others"];
const CONDITIONS = ["Brand New", "Like New", "Slightly Used", "Good"];
const CATEGORY_ICONS: Record<string, string> = {
  "Textbooks": "📚", "Uniforms": "👕", "Gadgets": "🖥️", "School Supplies": "🎒",
  "Dorm Essentials": "🏠", "Food": "🍱", "Entertainment": "🎮", "Sports": "⚽", "Others": "📦"
};

type School = { id: string; name: string; abbreviation: string; };
type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type Listing = {
  id: string; user_id: string; title: string; description: string; price: number;
  is_negotiable: boolean; is_rental: boolean; rental_period: string | null;
  category: string; condition: string; images: string[] | null;
  is_sold: boolean; created_at: string; bumped_at: string | null; school_id: string;
  users: { full_name: string; avatar_url: string | null; } | null;
  commentCount?: number;
};
type Notification = {
  id: string; message: string; is_read: boolean; created_at: string; post_id: string | null; type: string;
};

export default function BazaarPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const { selectedSchool, setSelectedSchool, schools } = useSchool();
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [isRental, setIsRental] = useState(false);
  const [rentalPeriod, setRentalPeriod] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [postError, setPostError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [bumping, setBumping] = useState<string | null>(null);

  useEffect(() => { initPage(); }, []);
  useEffect(() => { if (currentUser) fetchListings(); }, [currentUser, selectedSchool, filterCategory]);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    fetchUnreadCount(userData);
  }

  async function fetchUnreadCount(user: User | null) {
    if (!user) return;
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("is_read", false);
    setUnreadCount(count || 0);
  }



  async function fetchListings() {
    if (!currentUser) return;
    setLoading(true);
    let query = supabase
      .from("listings")
      .select("id, user_id, title, description, price, is_negotiable, is_rental, rental_period, category, condition, images, is_sold, created_at, bumped_at, school_id, users(full_name, avatar_url)")
      .eq("is_hidden", false)
      .order("bumped_at", { ascending: false })
      .limit(30);
    if (selectedSchool === "own") query = query.eq("school_id", currentUser.school_id);
    else if (selectedSchool !== "all") query = query.eq("school_id", selectedSchool);
    if (filterCategory !== "All") query = query.eq("category", filterCategory);
    const { data } = await query;
    if (data) {
      const listingIds = data.map((l: any) => l.id);
      const { data: allComments } = listingIds.length > 0
        ? await supabase.from("comments").select("listing_id").in("listing_id", listingIds)
        : { data: [] };
      const commentMap: Record<string, number> = {};
      (allComments || []).forEach((c: any) => {
        commentMap[c.listing_id] = (commentMap[c.listing_id] || 0) + 1;
      });
      const enriched = data.map((listing: any) => ({
        ...listing,
        commentCount: commentMap[listing.id] || 0,
        users: Array.isArray(listing.users) ? listing.users[0] ?? null : listing.users
      }));
      setListings(enriched);
    }
    setLoading(false);
  }

  async function handlePost() {
    if (!title.trim()) { setPostError("Please enter a title."); return; }
    if (!description.trim()) { setPostError("Please enter a description."); return; }
    if (!price) { setPostError("Please enter a price."); return; }
    if (!category) { setPostError("Please select a category."); return; }
    if (!condition) { setPostError("Please select a condition."); return; }
    if (isRental && !rentalPeriod.trim()) { setPostError("Please enter a rental period (e.g. day, week, month)."); return; }
    if (!currentUser) return;
    setPosting(true);
    setPostError("");
    try {
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        imageUrls = await Promise.all(selectedImages.map(async (img) => {
          const ext = img.name.split(".").pop();
          const path = "bazaar/" + currentUser.id + "/" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
          const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, img);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
          return urlData.publicUrl;
        }));
      }
      const { error } = await supabase.from("listings").insert({
        user_id: currentUser.id,
        school_id: (selectedSchool === "all" || selectedSchool === "own") ? currentUser.school_id : selectedSchool,
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        is_negotiable: isNegotiable,
        is_rental: isRental,
        rental_period: isRental ? rentalPeriod.trim() : null,
        category,
        condition,
        images: imageUrls.length > 0 ? imageUrls : null,
        is_sold: false,
        is_flagged: false,
        is_hidden: false,
      });
      if (error) throw error;
      setTitle(""); setDescription(""); setPrice(""); setIsNegotiable(false);
      setIsRental(false); setRentalPeriod(""); setCategory(""); setCondition("");
      setSelectedImages([]); setImagePreviews([]); setShowComposer(false);
      showToast("Listing posted!"); fetchListings();
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : "Failed to post. Try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleMarkSold(listingId: string) {
    await supabase.from("listings").update({ is_sold: true }).eq("id", listingId);
    setShowMenu(null); showToast("Marked as sold!"); fetchListings();
  }

  async function handleDeleteListing(listingId: string) {
    await supabase.from("listings").delete().eq("id", listingId);
    setShowMenu(null); showToast("Listing deleted!"); fetchListings();
  }

  async function handleBump(listingId: string) {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;
    if (listing.bumped_at) {
      const diff = Date.now() - new Date(listing.bumped_at).getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - diff) / (60 * 60 * 1000));
        showToast("Bump again in " + hoursLeft + "h");
        setShowMenu(null);
        return;
      }
    }
    setBumping(listingId);
    await supabase.from("listings").update({ bumped_at: new Date().toISOString() }).eq("id", listingId);
    setShowMenu(null);
    showToast("Listing bumped to top!");
    setBumping(null);
    fetchListings();
  }

  function isBumpedRecently(bumped_at: string | null) {
    if (!bumped_at) return false;
    return Date.now() - new Date(bumped_at).getTime() < 24 * 60 * 60 * 1000;
  }

  function getBumpCountdown(bumped_at: string | null) {
    if (!bumped_at) return "";
    const diff = Date.now() - new Date(bumped_at).getTime();
    const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - diff) / (60 * 60 * 1000));
    return "Bump again in " + hoursLeft + "h";
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024 && (f.type === "image/jpeg" || f.type === "image/png"));
    const compressed = await Promise.all(valid.map(async (file) => {
      try {
        return await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true, initialQuality: 0.8 });
      } catch { return file; }
    }));
    const combined = [...selectedImages, ...compressed].slice(0, 4);
    setSelectedImages(combined);
    setImagePreviews(prev => { prev.forEach(url => URL.revokeObjectURL(url)); return combined.map(f => URL.createObjectURL(f)); });
  }

  function removeImage(index: number) {
    const imgs = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(imgs);
    setImagePreviews(prev => { prev.forEach(url => URL.revokeObjectURL(url)); return imgs.map(f => URL.createObjectURL(f)); });
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

  function formatPrice(price: number, isRental: boolean, rentalPeriod: string | null) {
    const formatted = "₱" + price.toLocaleString("en-PH", { minimumFractionDigits: 0 });
    if (isRental && rentalPeriod) return formatted + "/" + rentalPeriod;
    return formatted;
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

  return (
    <div style={{minHeight: "100vh", background: "#F0F2F5", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {toast && (
        <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>
      )}

      {/* Header */}
      <AppHeader
        currentUser={currentUser}
        schools={schools}
        
        selectedSchool={selectedSchool}
        unreadCount={unreadCount}
        onSchoolPickerToggle={() => setShowSchoolPicker(!showSchoolPicker)}
      />
      {/* Notification Dropdown */}

      {/* School Picker */}
      {showSchoolPicker && <SchoolPicker schools={schools} currentUser={currentUser} selectedSchool={selectedSchool} onSelect={setSelectedSchool} onClose={() => setShowSchoolPicker(false)} />}

      {/* Category Filter */}
      <div style={{backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", padding: "10px 0"}}>
        <div style={{display: "flex", gap: "8px", paddingLeft: "12px", overflowX: "auto", scrollbarWidth: "none"}}>
          {["All", ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{padding: "7px 14px", borderRadius: "20px", border: "1px solid " + (filterCategory === cat ? "#2BB39A" : "#E8F8F5"), backgroundColor: filterCategory === cat ? "#2BB39A" : "#F0FAF6", color: filterCategory === cat ? "#fff" : "#2BB39A", fontWeight: filterCategory === cat ? 700 : 500, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, opacity: filterCategory === cat ? 1 : 0.75}}>
              {cat === "All" ? "🛒 All" : CATEGORY_ICONS[cat] + " " + cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sell Button */}
      <div style={{padding: "12px 16px 14px", backgroundColor: "#fff", borderBottom: "1px solid #F0F0F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)"}}>
        <button onClick={() => setShowComposer(true)}
          style={{width: "100%", backgroundColor: "#2BB39A", color: "#fff", border: "none", borderRadius: "14px", padding: "13px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(43,179,154,0.3)"}}>
          🏷️ Post a Listing
        </button>
      </div>

      {/* Listings Feed */}
      <div style={{flex: 1, paddingBottom: "80px"}}>
        {loading ? (
                    <div>
            <style>{`@keyframes shimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } }`}</style>
            {[1,2,3].map(i => (
              <div key={i} style={{backgroundColor: "#fff", marginBottom: "10px", borderRadius: "14px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden", margin: "0 8px 10px", padding: "12px 16px"}}>
                <div style={{display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px"}}>
                  <div style={{width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", flexShrink: 0}} />
                  <div style={{flex: 1}}>
                    <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "6px", width: "40%"}} />
                    <div style={{height: "10px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", width: "25%"}} />
                  </div>
                </div>
                <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "8px"}} />
                <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", marginBottom: "8px", width: "80%"}} />
                <div style={{height: "12px", borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "936px 104px", animation: "shimmer 1.2s infinite linear", width: "60%"}} />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div style={{textAlign: "center", padding: "56px 24px"}}>
            <div style={{fontSize: "4rem", marginBottom: "16px", lineHeight: 1}}>🛒</div>
            <div style={{fontWeight: 800, color: "#1A1A1A", fontSize: "1.1rem", marginBottom: "8px"}}>No listings yet!</div>
            <div style={{color: "#2BB39A", fontSize: "0.85rem", fontWeight: 600}}>Be the first to sell something!</div>
          </div>
        ) : (
          <div style={{display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", padding: "12px 10px", background: "#F0F2F5"}}>
            {listings.map(listing => (
              <div key={listing.id} onClick={() => router.push("/bazaar/" + listing.id)}
                style={{backgroundColor: "#fff", borderRadius: "14px", border: "none", cursor: "pointer", position: "relative", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)"}}>
                {/* Image */}
                <div style={{position: "relative", width: "100%", aspectRatio: "1 / 1", overflow: "hidden"}}>
                  {listing.images && listing.images.length > 0
                    ? <img src={listing.images[0]} alt="" style={{width: "100%", height: "100%", objectFit: "cover", display: "block"}} />
                    : <div style={{width: "100%", height: "100%", backgroundColor: "#F7F7F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem"}}>{CATEGORY_ICONS[listing.category] || "📦"}</div>
                  }
                  {listing.is_sold && (
                    <div style={{position: "absolute", top: "8px", left: "8px", backgroundColor: "#EF4444", color: "#fff", fontSize: "9px", fontWeight: 500, padding: "2px 7px", borderRadius: "6px", zIndex: 2}}>SOLD</div>
                  )}
                  {!listing.is_sold && isBumpedRecently(listing.bumped_at) && (
                    <div style={{position: "absolute", top: "8px", left: "8px", backgroundColor: "#2BB39A", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "6px", zIndex: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.15)"}}>BUMPED</div>
                  )}
                  {listing.is_rental && (
                    <div style={{position: "absolute", top: "8px", right: "8px", backgroundColor: "#2BB39A", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "6px", zIndex: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.15)"}}>FOR RENT</div>
                  )}
                  {currentUser?.id === listing.user_id && (
                    <button onClick={e => { e.stopPropagation(); setShowMenu(showMenu === listing.id ? null : listing.id); }}
                      style={{position: "absolute", top: "6px", right: listing.is_rental ? "56px" : "6px", background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: "26px", height: "26px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", zIndex: 3}}>
                      •••
                    </button>
                  )}
                </div>
                {/* Card body */}
                <div style={{padding: "10px 10px 12px"}}>
                  <div style={{fontSize: "12px", fontWeight: 600, color: "#1A1A1A", marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4}}>{listing.title}</div>
                  <div style={{fontSize: "14px", fontWeight: 700, color: "#2BB39A", marginBottom: "4px"}}>{formatPrice(listing.price, listing.is_rental, listing.rental_period)}</div>
                  {listing.is_negotiable && <div style={{fontSize: "10px", color: "#888", marginBottom: "3px"}}>Negotiable</div>}
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px"}}>
                    <span style={{fontSize: "10px", color: "#2BB39A", backgroundColor: "#F0FAF6", padding: "2px 6px", borderRadius: "6px", fontWeight: 500}}>{listing.condition}</span>
                    <span style={{fontSize: "10px", color: "#aaa"}}>{formatTime(listing.created_at)}</span>
                  </div>
                  <div style={{display: "flex", alignItems: "center", gap: "4px"}}>
                    {listing.users?.avatar_url
                      ? <img src={listing.users.avatar_url} alt="" style={{width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.1)"}} />
                      : <div style={{width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#C0DD97", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#27500A", fontWeight: 700, flexShrink: 0}}>{listing.users?.full_name?.charAt(0).toUpperCase()}</div>
                    }
                    <span style={{fontSize: "10px", color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{listing.users?.full_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="/bazaar" unreadMessages={unreadMessages} />
      {/* Post Listing Composer */}
      {showComposer && (
        <>
          <div onClick={() => setShowComposer(false)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, maxHeight: "90vh", overflowY: "auto", paddingBottom: "32px"}}>
            <div style={{padding: "16px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10}}>
              <span style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A"}}>Post a Listing</span>
              <button onClick={() => setShowComposer(false)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem"}}>✕</button>
            </div>
            <div style={{padding: "16px", display: "flex", flexDirection: "column", gap: "12px"}}>
              <input placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box"}} />
              <textarea placeholder="Description *" value={description} onChange={e => setDescription(e.target.value)} rows={3}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", resize: "none", boxSizing: "border-box"}} />
              <div style={{display: "flex", gap: "8px"}}>
                <input placeholder="Price (₱) *" value={price} onChange={e => setPrice(e.target.value)} type="number"
                  style={{flex: 1, border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7"}} />
                <button onClick={() => setIsNegotiable(!isNegotiable)}
                  style={{padding: "10px 14px", borderRadius: "10px", border: "1px solid " + (isNegotiable ? "#2BB39A" : "#F0F0F0"), backgroundColor: isNegotiable ? "#E1F5EE" : "#F7F7F7", color: isNegotiable ? "#2BB39A" : "#888", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
                  {isNegotiable ? "✓ Nego" : "Nego?"}
                </button>
              </div>
              <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                <button onClick={() => setIsRental(!isRental)}
                  style={{padding: "10px 14px", borderRadius: "10px", border: "1px solid " + (isRental ? "#2BB39A" : "#F0F0F0"), backgroundColor: isRental ? "#E1F5EE" : "#F7F7F7", color: isRental ? "#2BB39A" : "#888", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
                  {isRental ? "✓ For Rent" : "For Rent?"}
                </button>
                {isRental && (
                  <input placeholder="Period (e.g. day, week)" value={rentalPeriod} onChange={e => setRentalPeriod(e.target.value)}
                    style={{flex: 1, border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.82rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7"}} />
                )}
              </div>
              <div>
                <div style={{fontSize: "0.75rem", color: "#888", fontWeight: 600, marginBottom: "6px"}}>Category *</div>
                <div style={{display: "flex", gap: "6px", flexWrap: "wrap"}}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCategory(category === cat ? "" : cat)}
                      style={{padding: "5px 10px", borderRadius: "20px", border: "1px solid " + (category === cat ? "#2BB39A" : "#F0F0F0"), backgroundColor: category === cat ? "#E1F5EE" : "#fff", color: category === cat ? "#2BB39A" : "#888", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
                      {CATEGORY_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize: "0.75rem", color: "#888", fontWeight: 600, marginBottom: "6px"}}>Condition *</div>
                <div style={{display: "flex", gap: "6px", flexWrap: "wrap"}}>
                  {CONDITIONS.map(cond => (
                    <button key={cond} onClick={() => setCondition(condition === cond ? "" : cond)}
                      style={{padding: "5px 10px", borderRadius: "20px", border: "1px solid " + (condition === cond ? "#2BB39A" : "#F0F0F0"), backgroundColor: condition === cond ? "#E1F5EE" : "#fff", color: condition === cond ? "#2BB39A" : "#888", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit"}}>
                      {cond}
                    </button>
                  ))}
                </div>
              </div>
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
                style={{backgroundColor: posting ? "#ccc" : "#2BB39A", color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontWeight: 700, fontSize: "0.9rem", cursor: posting ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
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
            {!listings.find(l => l.id === showMenu)?.is_sold && (
              <button onClick={() => handleMarkSold(showMenu)}
                style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#2BB39A"}}>
                ✅ Mark as Sold
              </button>
            )}
            <button onClick={() => router.push("/bazaar/" + showMenu)}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1A1A1A"}}>
              👁️ View Listing
            </button>
            {(() => {
              const listing = listings.find(l => l.id === showMenu);
              const canBump = !listing?.bumped_at || (Date.now() - new Date(listing.bumped_at).getTime() >= 24 * 60 * 60 * 1000);
              return (
                <button onClick={() => handleBump(showMenu)}
                  disabled={bumping === showMenu || !canBump}
                  style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: canBump ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: canBump ? "#F59E0B" : "#ccc"}}>
                  {canBump ? "Bump to Top" : getBumpCountdown(listing?.bumped_at || null)}
                </button>
              );
            })()}
            <button onClick={() => handleDeleteListing(showMenu)}
              style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
              Delete Listing
            </button>
          </div>
        </>
      )}
    </div>
  );
}
