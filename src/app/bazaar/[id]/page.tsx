'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";

const CATEGORY_ICONS: Record<string, string> = {
  "Textbooks": "📚", "Uniforms": "👕", "Gadgets": "🖥️", "School Supplies": "🎒",
  "Dorm Essentials": "🏠", "Food": "🍱", "Entertainment": "🎮", "Sports": "⚽", "Others": "📦"
};

type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type Listing = {
  id: string; user_id: string; title: string; description: string; price: number;
  is_negotiable: boolean; is_rental: boolean; rental_period: string | null;
  category: string; condition: string; images: string[] | null;
  is_sold: boolean; created_at: string; school_id: string;
  users: { full_name: string; avatar_url: string | null; } | null;
};
type Comment = {
  id: string; listing_id: string; user_id: string; content: string; created_at: string;
  parent_id: string | null; edited_at?: string | null;
  users: { full_name: string; avatar_url: string | null; } | null;
  replies?: Comment[];
};

export default function BazaarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [listingId, setListingId] = useState<string>("");
  const [toast, setToast] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState<string | null>(null);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 10); params.then(p => { setListingId(p.id); initPage(p.id); }); }, []);

  async function initPage(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    await fetchListing(id);
    await fetchComments(id);
    setLoading(false);
  }

  async function fetchListing(id: string) {
    const { data } = await supabase.from("listings").select("id, user_id, title, description, price, is_negotiable, is_rental, rental_period, category, condition, images, is_sold, created_at, school_id, users(full_name, avatar_url)").eq("id", id).single();
    if (data) setListing(data);
  }

  async function fetchComments(id: string) {
    const { data } = await supabase.from("comments").select("id, listing_id, user_id, content, created_at, parent_id, edited_at, users(full_name, avatar_url)").eq("listing_id", id).order("created_at", { ascending: true });
    if (data) {
      const topLevel = data.filter(c => !c.parent_id);
      const withReplies = topLevel.map(c => ({ ...c, replies: data.filter(r => r.parent_id === c.id) }));
      setComments(withReplies);
    }
  }

  async function handleComment() {
    if (!commentText.trim() || !currentUser || !listing) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      listing_id: listingId, user_id: currentUser.id, content: commentText.trim(), parent_id: null,
    });
    if (!error) {
      if (listing.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: listing.user_id, sender_id: currentUser.id, type: "comment",
          post_id: listingId, message: currentUser.full_name + " commented on your listing", is_read: false,
        });
      }
      setCommentText("");
      await fetchComments(listingId);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    setSubmitting(false);
  }

  async function handleReply() {
    if (!replyText.trim() || !currentUser || !replyingTo || !listing) return;
    setSubmitting(true);
    const parentComment = comments.find(c => c.id === replyingTo);
    const { error } = await supabase.from("comments").insert({
      listing_id: listingId, user_id: currentUser.id, content: replyText.trim(), parent_id: replyingTo,
    });
    if (!error) {
      if (parentComment && parentComment.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: parentComment.user_id, sender_id: currentUser.id, type: "reply",
          post_id: listingId, message: currentUser.full_name + " replied to your comment", is_read: false,
        });
      }
      setReplyText("");
      setReplyingTo(null);
      await fetchComments(listingId);
    }
    setSubmitting(false);
  }

  async function handleMarkSold() {
    await supabase.from("listings").update({ is_sold: true }).eq("id", listingId);
    setShowOwnerMenu(false);
    showToast("Marked as sold!");
    await fetchListing(listingId);
  }

  async function handleDeleteListing() {
    await supabase.from("listings").delete().eq("id", listingId);
    showToast("Listing deleted!");
    setTimeout(() => router.push("/bazaar"), 1000);
  }

  async function handleEditComment(commentId: string) {
    if (!editCommentContent.trim()) return;
    const { error } = await supabase.from("comments").update({ content: editCommentContent.trim(), edited_at: new Date().toISOString() }).eq("id", commentId);
    if (!error) { setEditingComment(null); setEditCommentContent(""); showToast("Comment updated!"); await fetchComments(listingId); }
  }

  async function handleDeleteComment(commentId: string) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) { setShowDeleteCommentConfirm(null); showToast("Comment deleted!"); await fetchComments(listingId); }
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
            <div style={{color: "#fff", fontWeight: 700, fontSize: "0.95rem"}}>Bazaar</div>
            <div style={{color: "rgba(255,255,255,0.8)", fontSize: "0.7rem"}}>{CATEGORY_ICONS[listing?.category || ""] || "📦"} {listing?.category}</div>
          </div>
          {currentUser?.id === listing?.user_id && (
            <button onClick={() => setShowOwnerMenu(true)} style={{background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem"}}>•••</button>
          )}
        </div>

        {/* Scrollable Content */}
        <div style={{flex: 1, overflowY: "auto", paddingBottom: "80px"}}>

          {/* Images */}
          {listing?.images && listing.images.length > 0 && (
            <div style={{position: "relative", backgroundColor: "#000"}}>
              <img src={listing.images[currentImageIndex]} alt="" style={{width: "100%", maxHeight: "300px", objectFit: "contain", display: "block"}} />
              {listing.images.length > 1 && (
                <>
                  <button onClick={() => setCurrentImageIndex(i => i === 0 ? listing.images!.length - 1 : i - 1)}
                    style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>‹</button>
                  <button onClick={() => setCurrentImageIndex(i => i === listing.images!.length - 1 ? 0 : i + 1)}
                    style={{position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>›</button>
                  <div style={{position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px"}}>
                    {listing.images.map((_, i) => (
                      <div key={i} onClick={() => setCurrentImageIndex(i)} style={{width: i === currentImageIndex ? "20px" : "6px", height: "6px", borderRadius: "3px", backgroundColor: i === currentImageIndex ? "#1D9E75" : "rgba(255,255,255,0.6)", cursor: "pointer", transition: "all 0.2s"}} />
                    ))}
                  </div>
                </>
              )}
              {listing.is_sold && (
                <div style={{position: "absolute", top: "12px", left: "12px", backgroundColor: "#EF4444", color: "#fff", fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: "20px"}}>SOLD</div>
              )}
            </div>
          )}

          {/* Listing Info */}
          <div style={{padding: "16px", backgroundColor: "#fff", borderBottom: "8px solid #F7F7F7"}}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px"}}>
              <div style={{fontWeight: 700, fontSize: "1.1rem", color: "#1A1A1A", flex: 1, paddingRight: "12px"}}>{listing?.title}</div>
              <div style={{fontWeight: 700, fontSize: "1.1rem", color: "#1D9E75", whiteSpace: "nowrap"}}>{formatPrice(listing?.price || 0, listing?.is_rental || false, listing?.rental_period || null)}</div>
            </div>
            <div style={{display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px"}}>
              {listing?.is_negotiable && <span style={{backgroundColor: "#E1F5EE", color: "#1D9E75", fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "10px"}}>Negotiable</span>}
              {listing?.is_rental && <span style={{backgroundColor: "#E1F5EE", color: "#1D9E75", fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "10px"}}>For Rent</span>}
              <span style={{backgroundColor: "#F7F7F7", color: "#888", fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "10px"}}>{listing?.condition}</span>
              <span style={{backgroundColor: "#F7F7F7", color: "#888", fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "10px"}}>{CATEGORY_ICONS[listing?.category || ""]} {listing?.category}</span>
            </div>
            <div style={{fontSize: "0.88rem", color: "#1A1A1A", lineHeight: 1.6, marginBottom: "12px"}}>{listing?.description}</div>
            <div style={{height: "1px", backgroundColor: "#F0F0F0", marginBottom: "12px"}}></div>
            <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
              {listing?.users?.avatar_url
                ? <img src={listing.users.avatar_url} alt="" style={{width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover"}} />
                : <div style={{width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.95rem"}}>{listing?.users?.full_name?.charAt(0).toUpperCase()}</div>
              }
              <div>
                <div style={{fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A"}}>{listing?.users?.full_name}</div>
                <div style={{fontSize: "0.72rem", color: "#888"}}>{formatTime(listing?.created_at || "")}</div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div style={{padding: "12px 16px"}}>
            <div style={{fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A", marginBottom: "12px"}}>Comments ({comments.length})</div>
            {comments.length === 0 ? (
              <div style={{textAlign: "center", padding: "32px 0"}}>
                <Image src="/nocomment.png" alt="no comments" width={80} height={80} style={{opacity: 0.5, marginBottom: "12px"}} />
                <div style={{color: "#888", fontSize: "0.82rem"}}>Walay comment pa. Ask the seller!</div>
              </div>
            ) : comments.map(comment => (
              <div key={comment.id} style={{marginBottom: "16px"}}>
                <div style={{display: "flex", gap: "10px", alignItems: "flex-start"}}>
                  {comment.users?.avatar_url
                    ? <img src={comment.users.avatar_url} alt="" style={{width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                    : <div style={{width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{comment.users?.full_name?.charAt(0).toUpperCase()}</div>
                  }
                  <div style={{flex: 1}}>
                    <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "8px 12px"}}>
                      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                        <div style={{fontWeight: 700, fontSize: "0.78rem", color: "#1D9E75", marginBottom: "3px"}}>{comment.users?.full_name}</div>
                        {currentUser?.id === comment.user_id && <button onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem", padding: "0 4px"}}>•••</button>}
                      </div>
                      <div style={{fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.4}}>{comment.content}</div>
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
                              ? <img src={reply.users.avatar_url} alt="" style={{width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                              : <div style={{width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0}}>{reply.users?.full_name?.charAt(0).toUpperCase()}</div>
                            }
                            <div style={{flex: 1}}>
                              <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "7px 11px"}}>
                                <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                                  <div style={{fontWeight: 700, fontSize: "0.75rem", color: "#1D9E75", marginBottom: "2px"}}>{reply.users?.full_name}</div>
                                  {currentUser?.id === reply.user_id && <button onClick={() => setShowCommentMenu(showCommentMenu === reply.id ? null : reply.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem", padding: "0 4px"}}>•••</button>}
                                </div>
                                <div style={{fontSize: "0.82rem", color: "#1A1A1A", lineHeight: 1.4}}>{reply.content}</div>
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
          <input placeholder="Ask the seller..." value={commentText} onChange={e => setCommentText(e.target.value)}
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
              {!listing?.is_sold && (
                <button onClick={handleMarkSold}
                  style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#1D9E75"}}>
                  ✅ Mark as Sold
                </button>
              )}
              <button onClick={handleDeleteListing}
                style={{width: "100%", padding: "14px 20px", border: "none", backgroundColor: "#fff", textAlign: "left", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", color: "#EF4444"}}>
                🗑️ Delete Listing
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

        {editingComment && (
          <>
            <div onClick={() => setEditingComment(null)} style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.3)"}} />
            <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "16px 16px 32px"}}>
              <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto 16px"}}></div>
              <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A", marginBottom: "12px"}}>Edit Comment</div>
              <textarea value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)} rows={3}
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
              <div style={{display: "flex", gap: "10px", marginTop: "12px", justifyContent: "flex-end"}}>
                <button onClick={() => setEditingComment(null)} style={{padding: "9px 20px", borderRadius: "20px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
                <button onClick={() => handleEditComment(editingComment)} style={{padding: "9px 20px", borderRadius: "20px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>Save</button>
              </div>
            </div>
          </>
        )}

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
      </div>
    </div>
  );
}
