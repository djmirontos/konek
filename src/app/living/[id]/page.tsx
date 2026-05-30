'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";

const AMENITIES_ICONS: Record<string, string> = {
  "WiFi": "📶", "Water": "💧", "Electricity": "⚡", "Private CR": "🚿", "Shared CR": "🚻",
  "Kitchen": "🍳", "Laundry": "👕", "Aircon": "❄️", "Furnished": "🛋️", "With meals": "🍱"
};

type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type BoardingHouse = {
  id: string; user_id: string; post_type: string; name: string; description: string | null;
  address: string | null; price_per_month: number | null; is_negotiable: boolean;
  available_slots: number | null; is_fully_booked: boolean; contact_number: string | null;
  amenities: string[] | null; images: string[] | null; school_id: string;
  created_at: string; edited_at: string | null; comment_count: number;
  users: { full_name: string; avatar_url: string | null; } | null;
};
type Comment = {
  id: string; post_id: string; user_id: string; content: string; created_at: string;
  parent_id: string | null; edited_at?: string | null;
  users: { full_name: string; avatar_url: string | null; } | null;
  replies?: Comment[];
};

export default function LivingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [post, setPost] = useState<BoardingHouse | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [postId, setPostId] = useState<string>("");
  const [toast, setToast] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState<string | null>(null);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false);
  const [showEditPost, setShowEditPost] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editIsNegotiable, setEditIsNegotiable] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editSlots, setEditSlots] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showContactNumber, setShowContactNumber] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 10); params.then(p => { setPostId(p.id); initPage(p.id); }); }, []);

  async function initPage(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    await fetchPost(id);
    await fetchComments(id);
    setLoading(false);
  }

  async function fetchPost(id: string) {
    const { data } = await supabase.from("boarding_houses")
      .select("id, user_id, post_type, name, description, address, price_per_month, is_negotiable, available_slots, is_fully_booked, contact_number, amenities, images, school_id, created_at, edited_at, comment_count, users(full_name, avatar_url)")
      .eq("id", id).single();
    if (data) setPost({...data, users: Array.isArray(data.users) ? data.users[0] ?? null : data.users});
  }

  async function fetchComments(id: string) {
    const { data } = await supabase.from("comments")
      .select("id, boarding_house_id, user_id, content, created_at, parent_id, edited_at, users(full_name, avatar_url)")
      .eq("boarding_house_id", id).order("created_at", { ascending: true });
    if (data) {
      const topLevel = data.filter(c => !c.parent_id);
      const withReplies = topLevel.map(c => ({ ...c, replies: data.filter(r => r.parent_id === c.id) }));
      setComments(withReplies.map((c: any) => ({...c, users: Array.isArray(c.users) ? c.users[0] ?? null : c.users, replies: (c.replies || []).map((r: any) => ({...r, users: Array.isArray(r.users) ? r.users[0] ?? null : r.users}))})));
    }
  }

  async function handleComment() {
    if (!commentText.trim() || !currentUser || !post) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      boarding_house_id: postId, user_id: currentUser.id, content: commentText.trim(), parent_id: null,
    });
    if (!error) {
      if (post.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: post.user_id, sender_id: currentUser.id, type: "comment",
          post_id: postId, message: currentUser.full_name + " commented on your listing", is_read: false,
        });
      }
      await supabase.from("boarding_houses").update({ comment_count: (post.comment_count || 0) + 1 }).eq("id", postId);
      setCommentText("");
      await fetchComments(postId);
      await fetchPost(postId);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    setSubmitting(false);
  }

  async function handleReply() {
    if (!replyText.trim() || !currentUser || !replyingTo || !post) return;
    setSubmitting(true);
    const parentComment = comments.find(c => c.id === replyingTo);
    const { error } = await supabase.from("comments").insert({
      boarding_house_id: postId, user_id: currentUser.id, content: replyText.trim(), parent_id: replyingTo,
    });
    if (!error) {
      if (parentComment && parentComment.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: parentComment.user_id, sender_id: currentUser.id, type: "reply",
          post_id: postId, message: currentUser.full_name + " replied to your comment", is_read: false,
        });
      }
      setReplyText(""); setReplyingTo(null);
      await fetchComments(postId);
    }
    setSubmitting(false);
  }

  async function handleMarkFullyBooked() {
    await supabase.from("boarding_houses").update({ is_fully_booked: true, available_slots: 0 }).eq("id", postId);
    setShowOwnerMenu(false); showToast("Marked as Fully Booked!"); await fetchPost(postId);
  }

  async function handleDeletePost() {
    await supabase.from("boarding_houses").delete().eq("id", postId);
    showToast("Post deleted!"); setTimeout(() => router.push("/living"), 1000);
  }

  async function handleEditPost() {
    if (!editName.trim()) { setEditError("Please enter a title."); return; }
    setSaving(true); setEditError("");
    const slots = editSlots ? parseInt(editSlots) : null;
    const { error } = await supabase.from("boarding_houses").update({
      name: editName.trim(),
      description: editDescription.trim() || null,
      price_per_month: editPrice ? parseFloat(editPrice) : null,
      is_negotiable: editIsNegotiable,
      address: editAddress.trim() || null,
      available_slots: slots,
      is_fully_booked: slots !== null && slots === 0,
      contact_number: editContact.trim() || null,
      edited_at: new Date().toISOString(),
    }).eq("id", postId);
    if (!error) {
      setShowEditPost(false); showToast("Updated!"); await fetchPost(postId);
    } else { setEditError("Failed to update. Try again."); }
    setSaving(false);
  }

  async function handleEditComment(commentId: string) {
    if (!editCommentContent.trim()) return;
    const { error } = await supabase.from("comments").update({ content: editCommentContent.trim(), edited_at: new Date().toISOString() }).eq("id", commentId);
    if (!error) { setEditingComment(null); setEditCommentContent(""); showToast("Comment updated!"); await fetchComments(postId); }
  }

  async function handleDeleteComment(commentId: string) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) { setShowDeleteCommentConfirm(null); showToast("Comment deleted!"); await fetchComments(postId); }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function formatTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  if (loading) return (
    <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      <div style={{textAlign: "center", color: "#888"}}>
        <div style={{fontSize: "2rem", marginBottom: "8px"}}>⏳</div>
        <div style={{fontSize: "0.85rem"}}>Loading...</div>
      </div>
    </div>
  );

  return (
    <div style={{position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end", backgroundColor: "rgba(0,0,0,0.5)", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <div style={{width: "100%", maxWidth: "480px", margin: "0 auto", height: "95vh", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column", animation: mounted ? "slideUp 0.3s ease-out" : "none", overflow: "hidden"}}>

        {toast && (
          <div style={{position: "absolute", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>{toast}</div>
        )}

        {/* Header */}
        <div style={{backgroundColor: "#1D9E75", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0}}>
          <button onClick={() => router.back()} style={{background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem"}}>←</button>
          <div style={{flex: 1}}>
            <div style={{color: "#fff", fontWeight: 700, fontSize: "0.95rem"}}>Living</div>
            <div style={{color: "rgba(255,255,255,0.8)", fontSize: "0.7rem"}}>{post?.post_type === "looking" ? "🔍 Looking for Room" : "🏠 Room for Rent"}</div>
          </div>
          {currentUser?.id === post?.user_id && (
            <button onClick={() => setShowOwnerMenu(true)} style={{background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem"}}>•••</button>
          )}
        </div>

        {/* Scrollable Content */}
        <div style={{flex: 1, overflowY: "auto", paddingBottom: "80px"}}>

          {/* Images */}
          {post?.images && post.images.length > 0 ? (
            <div style={{position: "relative", backgroundColor: "#000"}}>
              <img src={post.images[currentImageIndex]} alt="" style={{width: "100%", maxHeight: "280px", objectFit: "contain", display: "block"}} />
              {post.images.length > 1 && (
                <>
                  <button onClick={() => setCurrentImageIndex(i => i === 0 ? post.images!.length - 1 : i - 1)}
                    style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>‹</button>
                  <button onClick={() => setCurrentImageIndex(i => i === post.images!.length - 1 ? 0 : i + 1)}
                    style={{position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>›</button>
                  <div style={{position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px"}}>
                    {post.images.map((_, i) => (
                      <div key={i} onClick={() => setCurrentImageIndex(i)} style={{width: i === currentImageIndex ? "20px" : "6px", height: "6px", borderRadius: "3px", backgroundColor: i === currentImageIndex ? "#1D9E75" : "rgba(255,255,255,0.6)", cursor: "pointer", transition: "all 0.2s"}} />
                    ))}
                  </div>
                </>
              )}
              {post.is_fully_booked && (
                <div style={{position: "absolute", top: "12px", left: "12px", backgroundColor: "#EF4444", color: "#fff", fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: "20px"}}>FULLY BOOKED</div>
              )}
            </div>
          ) : (
            <div style={{width: "100%", height: "120px", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem"}}>
              {post?.post_type === "looking" ? "🔍" : "🏠"}
            </div>
          )}

          {/* Post Info */}
          <div style={{padding: "16px", backgroundColor: "#fff", borderBottom: "8px solid #F7F7F7"}}>

            {/* Badges */}
            <div style={{display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px"}}>
              {post?.is_fully_booked && <span style={{backgroundColor: "#EF4444", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "10px"}}>FULLY BOOKED</span>}
              {post?.post_type === "looking" && <span style={{backgroundColor: "#F59E0B", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "10px"}}>LOOKING</span>}
              {post?.post_type === "listing" && !post?.is_fully_booked && <span style={{backgroundColor: "#1D9E75", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "10px"}}>FOR RENT</span>}
              {post?.is_negotiable && <span style={{backgroundColor: "#E1F5EE", color: "#1D9E75", fontSize: "0.7rem", fontWeight: 600, padding: "3px 10px", borderRadius: "10px"}}>Negotiable</span>}
            </div>

            <div style={{fontWeight: 700, fontSize: "1.1rem", color: "#1A1A1A", marginBottom: "6px"}}>{post?.name}</div>

            {post?.price_per_month && (
              <div style={{fontWeight: 700, fontSize: "1.15rem", color: "#1D9E75", marginBottom: "8px"}}>
                ₱{post.price_per_month.toLocaleString("en-PH")}/mo
              </div>
            )}

            {post?.address && (
              <div style={{fontSize: "0.85rem", color: "#888", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px"}}>
                📍 {post.address}
              </div>
            )}

            {post?.available_slots !== null && post?.available_slots !== undefined && !post?.is_fully_booked && (
              <div style={{fontSize: "0.82rem", color: "#1D9E75", fontWeight: 600, marginBottom: "8px"}}>
                🚪 {post.available_slots} slot{post.available_slots !== 1 ? "s" : ""} available
              </div>
            )}

            {post?.description && (
              <div style={{fontSize: "0.88rem", color: "#1A1A1A", lineHeight: 1.6, marginBottom: "12px"}}>{post.description}</div>
            )}

            {/* Amenities */}
            {post?.amenities && post.amenities.length > 0 && (
              <div style={{marginBottom: "14px"}}>
                <div style={{fontSize: "0.75rem", color: "#888", fontWeight: 600, marginBottom: "8px"}}>AMENITIES</div>
                <div style={{display: "flex", gap: "6px", flexWrap: "wrap"}}>
                  {post.amenities.map(a => (
                    <span key={a} style={{fontSize: "0.75rem", backgroundColor: "#E1F5EE", color: "#0F6E56", padding: "4px 10px", borderRadius: "10px", fontWeight: 600}}>
                      {AMENITIES_ICONS[a] || ""} {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Button */}
            {post?.contact_number && post?.post_type === "listing" && (
              <div style={{marginBottom: "14px"}}>
                {showContactNumber ? (
                  <div style={{backgroundColor: "#E1F5EE", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px"}}>
                    <span style={{fontSize: "1.2rem"}}>📞</span>
                    <div>
                      <div style={{fontSize: "0.72rem", color: "#888", fontWeight: 600}}>Contact Number</div>
                      <a href={"tel:" + post.contact_number} style={{fontWeight: 700, fontSize: "1rem", color: "#1D9E75", textDecoration: "none"}}>{post.contact_number}</a>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowContactNumber(true)}
                    style={{width: "100%", backgroundColor: "#1D9E75", color: "#fff", border: "none", borderRadius: "12px", padding: "12px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}>
                    📞 Show Contact Number
                  </button>
                )}
              </div>
            )}

            {/* Poster Info */}
            <div style={{height: "1px", backgroundColor: "#F0F0F0", marginBottom: "12px"}}></div>
            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
              {post?.users?.avatar_url
                ? <img onClick={() => post && router.push(`/profile/${post.user_id}`)} src={post.users.avatar_url} alt="" style={{width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", cursor: "pointer"}} />
                : <div onClick={() => post && router.push(`/profile/${post.user_id}`)} style={{width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer"}}>{post?.users?.full_name?.charAt(0).toUpperCase()}</div>
              }
              <div>
                <div style={{fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A"}}>{post?.users?.full_name}</div>
                <div style={{fontSize: "0.72rem", color: "#888"}}>{formatTime(post?.created_at || "")}{post?.edited_at ? " · Edited" : ""}</div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div style={{padding: "12px 16px"}}>
            <div style={{fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A", marginBottom: "12px"}}>Comments ({comments.length})</div>
            {comments.length === 0 ? (
              <div style={{textAlign: "center", padding: "32px 0"}}>
                <Image src="/nocomment.png" alt="no comments" width={80} height={80} style={{opacity: 0.5, marginBottom: "12px"}} />
                <div style={{color: "#888", fontSize: "0.82rem"}}>Walay comment pa. Ask the poster!</div>
              </div>
            ) : comments.map(comment => (
              <div key={comment.id} style={{marginBottom: "16px"}}>
                <div style={{display: "flex", gap: "10px", alignItems: "flex-start"}}>
                  {comment.users?.avatar_url
                    ? <img onClick={() => router.push(`/profile/${comment.user_id}`)} src={comment.users.avatar_url} alt="" style={{width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, cursor: "pointer"}} />
                    : <div onClick={() => router.push(`/profile/${comment.user_id}`)} style={{width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0, cursor: "pointer"}}>{comment.users?.full_name?.charAt(0).toUpperCase()}</div>
                  }
                  <div style={{flex: 1}}>
                    <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "8px 12px"}}>
                      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                        <div style={{fontWeight: 700, fontSize: "0.78rem", color: "#1D9E75", marginBottom: "3px"}}>{comment.users?.full_name}</div>
                        {currentUser?.id === comment.user_id && <button onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem", padding: "0 4px"}}>•••</button>}
                      </div>
                      {editingComment === comment.id ? (
                        <div>
                          <textarea value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)} rows={2}
                            style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "8px", padding: "6px 8px", fontSize: "0.82rem", fontFamily: "inherit", outline: "none", backgroundColor: "#fff", resize: "none", boxSizing: "border-box"}} />
                          <div style={{display: "flex", gap: "6px", marginTop: "6px", justifyContent: "flex-end"}}>
                            <button onClick={() => setEditingComment(null)} style={{padding: "5px 12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                            <button onClick={() => handleEditComment(comment.id)} style={{padding: "5px 12px", borderRadius: "12px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit"}}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.4}}>{comment.content}</div>
                      )}
                    </div>
                    <div style={{display: "flex", gap: "12px", marginTop: "4px", paddingLeft: "4px"}}>
                      <span style={{fontSize: "0.7rem", color: "#888"}}>{formatTime(comment.created_at)}{comment.edited_at && <span style={{marginLeft: "4px", fontStyle: "italic", color: "#aaa"}}>· Edited</span>}</span>
                      <button onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(""); }}
                        style={{background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: "#1D9E75", fontWeight: 600, padding: 0, fontFamily: "inherit"}}>Reply</button>
                    </div>
                    {replyingTo === comment.id && (
                      <div style={{display: "flex", gap: "8px", marginTop: "8px", alignItems: "center"}}>
                        {currentUser?.avatar_url
                          ? <img src={currentUser.avatar_url} alt="" style={{width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                          : <div style={{width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.7rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
                        }
                        <input autoFocus placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleReply(); } }}
                          style={{flex: 1, border: "1px solid #F0F0F0", borderRadius: "20px", padding: "7px 14px", fontSize: "0.8rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7"}} />
                        <button onClick={handleReply} disabled={submitting || !replyText.trim()}
                          style={{backgroundColor: submitting || !replyText.trim() ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "7px 14px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"}}>Reply</button>
                      </div>
                    )}
                    {comment.replies && comment.replies.length > 0 && (
                      <div style={{marginTop: "10px", paddingLeft: "8px", borderLeft: "2px solid #F0F0F0"}}>
                        {comment.replies.map(reply => (
                          <div key={reply.id} style={{display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "10px"}}>
                            {reply.users?.avatar_url
                              ? <img onClick={() => router.push(`/profile/${reply.user_id}`)} src={reply.users.avatar_url} alt="" style={{width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, cursor: "pointer"}} />
                              : <div onClick={() => router.push(`/profile/${reply.user_id}`)} style={{width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0, cursor: "pointer"}}>{reply.users?.full_name?.charAt(0).toUpperCase()}</div>
                            }
                            <div style={{flex: 1}}>
                              <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "7px 11px"}}>
                                <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                                  <div style={{fontWeight: 700, fontSize: "0.75rem", color: "#1D9E75", marginBottom: "2px"}}>{reply.users?.full_name}</div>
                                  {currentUser?.id === reply.user_id && <button onClick={() => setShowCommentMenu(showCommentMenu === reply.id ? null : reply.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem", padding: "0 4px"}}>•••</button>}
                                </div>
                                {editingComment === reply.id ? (
                                  <div>
                                    <textarea value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)} rows={2}
                                      style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "8px", padding: "6px 8px", fontSize: "0.82rem", fontFamily: "inherit", outline: "none", backgroundColor: "#fff", resize: "none", boxSizing: "border-box"}} />
                                    <div style={{display: "flex", gap: "6px", marginTop: "6px", justifyContent: "flex-end"}}>
                                      <button onClick={() => setEditingComment(null)} style={{padding: "5px 12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                                      <button onClick={() => handleEditComment(reply.id)} style={{padding: "5px 12px", borderRadius: "12px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit"}}>Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{fontSize: "0.82rem", color: "#1A1A1A", lineHeight: 1.4}}>{reply.content}</div>
                                )}
                              </div>
                              <div style={{fontSize: "0.68rem", color: "#888", marginTop: "3px", paddingLeft: "4px"}}>{formatTime(reply.created_at)}{reply.edited_at && <span style={{marginLeft: "4px", fontStyle: "italic", color: "#aaa"}}>· Edited</span>}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Comment Input */}
        <div style={{position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTop: "1px solid #F0F0F0", padding: "10px 16px", display: "flex", gap: "10px", alignItems: "center"}}>
          {currentUser?.avatar_url
            ? <img src={currentUser.avatar_url} alt="" style={{width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
            : <div style={{width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
          }
          <input placeholder="Ask the poster..." value={commentText} onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleComment(); } }}
            style={{flex: 1, border: "1px solid #F0F0F0", borderRadius: "20px", padding: "9px 16px", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7"}} />
          <button onClick={handleComment} disabled={submitting || !commentText.trim()}
            style={{backgroundColor: submitting || !commentText.trim() ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "9px 18px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit"}}>
            {submitting ? "..." : "Ask"}
          </button>
        </div>

        {/* Owner Menu */}
        {showOwnerMenu && (
          <>
            <div onClick={() => setShowOwnerMenu(false)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
            <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
              <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
              {!post?.is_fully_booked && post?.post_type === "listing" && (
                <button onClick={handleMarkFullyBooked}
                  style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
                  🔴 Mark as Fully Booked
                </button>
              )}
              <button onClick={() => { setEditName(post?.name || ""); setEditDescription(post?.description || ""); setEditPrice(post?.price_per_month?.toString() || ""); setEditIsNegotiable(post?.is_negotiable || false); setEditAddress(post?.address || ""); setEditSlots(post?.available_slots?.toString() || ""); setEditContact(post?.contact_number || ""); setEditError(""); setShowOwnerMenu(false); setShowEditPost(true); }}
                style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1A1A1A"}}>
                ✏️ Edit Post
              </button>
              <button onClick={() => { setShowOwnerMenu(false); setShowDeletePostConfirm(true); }}
                style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
                🗑️ Delete Post
              </button>
            </div>
          </>
        )}

        {/* Comment Menu */}
        {showCommentMenu && (
          <>
            <div onClick={() => setShowCommentMenu(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
            <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "8px 0 32px"}}>
              <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 16px"}}></div>
              <button onClick={() => { const allComments = [...comments, ...comments.flatMap(c => c.replies || [])]; const c = allComments.find(c => c.id === showCommentMenu); if (c) { setEditingComment(c.id); setEditCommentContent(c.content); } setShowCommentMenu(null); }}
                style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1A1A1A"}}>
                ✏️ Edit Comment
              </button>
              <button onClick={() => { setShowDeleteCommentConfirm(showCommentMenu); setShowCommentMenu(null); }}
                style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
                🗑️ Delete Comment
              </button>
            </div>
          </>
        )}

        {/* Delete Post Confirmation */}
        {showDeletePostConfirm && (
          <>
            <div onClick={() => setShowDeletePostConfirm(false)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.5)"}} />
            <div style={{position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(320px, 90vw)", backgroundColor: "#fff", borderRadius: "16px", zIndex: 500, padding: "24px"}}>
              <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "8px"}}>Delete Post?</div>
              <div style={{fontSize: "0.85rem", color: "#888", marginBottom: "20px"}}>This cannot be undone.</div>
              <div style={{display: "flex", gap: "10px"}}>
                <button onClick={() => setShowDeletePostConfirm(false)} style={{flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #F0F0F0", backgroundColor: "#F7F7F7", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                <button onClick={handleDeletePost} style={{flex: 1, padding: "11px", borderRadius: "10px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Delete</button>
              </div>
            </div>
          </>
        )}

        {/* Delete Comment Confirmation */}
        {showDeleteCommentConfirm && (
          <>
            <div onClick={() => setShowDeleteCommentConfirm(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
            <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "24px 16px 32px"}}>
              <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "8px", textAlign: "center"}}>Delete Comment?</div>
              <div style={{fontSize: "0.85rem", color: "#888", textAlign: "center", marginBottom: "20px"}}>This cannot be undone.</div>
              <div style={{display: "flex", gap: "10px"}}>
                <button onClick={() => setShowDeleteCommentConfirm(null)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                <button onClick={() => handleDeleteComment(showDeleteCommentConfirm)} style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Delete</button>
              </div>
            </div>
          </>
        )}

        {/* Edit Post Sheet */}
        {showEditPost && (
          <>
            <div onClick={() => setShowEditPost(false)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.5)"}} />
            <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, maxHeight: "85vh", overflowY: "auto", paddingBottom: "32px"}}>
              <div style={{padding: "16px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10}}>
                <span style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A"}}>Edit Post</span>
                <button onClick={() => setShowEditPost(false)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1.2rem"}}>✕</button>
              </div>
              <div style={{padding: "16px", display: "flex", flexDirection: "column", gap: "12px"}}>
                <input placeholder="Title *" value={editName} onChange={e => setEditName(e.target.value)}
                  style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box"}} />
                <textarea placeholder="Description" value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3}
                  style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", resize: "none", boxSizing: "border-box"}} />
                <div style={{display: "flex", gap: "8px"}}>
                  <input placeholder="Price/month (₱)" value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number"
                    style={{flex: 1, border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7"}} />
                  <button onClick={() => setEditIsNegotiable(!editIsNegotiable)}
                    style={{padding: "10px 14px", borderRadius: "10px", border: "1px solid " + (editIsNegotiable ? "#1D9E75" : "#F0F0F0"), backgroundColor: editIsNegotiable ? "#E1F5EE" : "#F7F7F7", color: editIsNegotiable ? "#1D9E75" : "#888", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
                    {editIsNegotiable ? "✓ Nego" : "Nego?"}
                  </button>
                </div>
                <input placeholder="Address / Location" value={editAddress} onChange={e => setEditAddress(e.target.value)}
                  style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box"}} />
                <input placeholder="Available slots" value={editSlots} onChange={e => setEditSlots(e.target.value)} type="number"
                  style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box"}} />
                <input placeholder="Contact number" value={editContact} onChange={e => setEditContact(e.target.value)} type="tel"
                  style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 12px", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7", boxSizing: "border-box"}} />
                {editError && <div style={{color: "#EF4444", fontSize: "0.75rem"}}>{editError}</div>}
                <button onClick={handleEditPost} disabled={saving}
                  style={{backgroundColor: saving ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}