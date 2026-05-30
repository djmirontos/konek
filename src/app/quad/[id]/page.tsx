'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";

const HANGOUT_TAG_SET = new Set(["#hangout", "#kita-kits", "#tambay", "#libre", "#Tara-G"]);

type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type Post = {
  id: string; user_id: string; content: string; tag: string | null;
  images: string[] | null; created_at: string; school_id: string;
  expires_at: string | null; location: string | null;
  users: { full_name: string; avatar_url: string | null; } | null;
  isExpired?: boolean;
};
type Comment = {
  id: string; post_id: string; user_id: string; content: string; created_at: string;
  parent_id: string | null; edited_at?: string | null;
  users: { full_name: string; avatar_url: string | null; } | null;
  replies?: Comment[];
};

export default function QuadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [postId, setPostId] = useState<string>("");
  const [toast, setToast] = useState("");
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => setMounted(true), 10); params.then(p => { setPostId(p.id); initPage(p.id); }); }, []);

  async function initPage(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) {
      setCurrentUser(userData);
      await fetchPost(id);
      await fetchComments(id);
    }
    setLoading(false);
  }

  async function fetchPost(id: string) {
    const { data } = await supabase.from("posts").select("id, user_id, content, tag, images, created_at, school_id, expires_at, location, users(full_name, avatar_url)").eq("id", id).single();
    if (data) {
      const isExpired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
      setPost({ ...data, isExpired, users: Array.isArray(data.users) ? data.users[0] ?? null : data.users });
    }
  }

  async function fetchComments(id: string) {
    const { data } = await supabase.from("comments").select("id, post_id, user_id, content, created_at, parent_id, edited_at, users(full_name, avatar_url)").eq("post_id", id).order("created_at", { ascending: true });
    if (data) {
      const topLevel = data.filter(c => !c.parent_id);
      const withReplies = topLevel.map(c => ({
        ...c,
        replies: data.filter(r => r.parent_id === c.id),
      }));
      setComments(withReplies.map((c: any) => ({...c, users: Array.isArray(c.users) ? c.users[0] ?? null : c.users, replies: (c.replies || []).map((r: any) => ({...r, users: Array.isArray(r.users) ? r.users[0] ?? null : r.users}))})));
    }
  }

  async function handleComment() {
    if (!commentText.trim() || !currentUser || !post || post.isExpired) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      post_id: postId, user_id: currentUser.id, content: commentText.trim(), parent_id: null,
    });
    if (!error) {
      if (post.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: post.user_id, sender_id: currentUser.id, type: "comment",
          post_id: postId, message: currentUser.full_name + " commented on your Quad post", is_read: false,
        });
      }
      setCommentText("");
      await fetchComments(postId);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    setSubmitting(false);
  }

  async function handleReply() {
    if (!replyText.trim() || !currentUser || !replyingTo || !post || post.isExpired) return;
    setSubmitting(true);
    const parentComment = comments.find(c => c.id === replyingTo);
    const { error } = await supabase.from("comments").insert({
      post_id: postId, user_id: currentUser.id, content: replyText.trim(), parent_id: replyingTo,
    });
    if (!error) {
      if (parentComment && parentComment.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: parentComment.user_id, sender_id: currentUser.id, type: "reply",
          post_id: postId, message: currentUser.full_name + " replied to your comment", is_read: false,
        });
      }
      setReplyText("");
      setReplyingTo(null);
      await fetchComments(postId);
    }
    setSubmitting(false);
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

  function getTimeLeft(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return h + "h " + m + "m left";
    return m + "m left";
  }

  function getTagColor(tag: string) {
    return HANGOUT_TAG_SET.has(tag) ? "#1D9E75" : "#F59E0B";
  }

  function getTagBg(tag: string) {
    return HANGOUT_TAG_SET.has(tag) ? "#E1F5EE" : "#FEF3C7";
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
          <div style={{position: "absolute", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{backgroundColor: "#1D9E75", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0}}>
          <button onClick={() => router.back()} style={{background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem"}}>←</button>
          <div>
            <div style={{color: "#fff", fontWeight: 700, fontSize: "0.95rem"}}>Quad</div>
            <div style={{color: "rgba(255,255,255,0.8)", fontSize: "0.7rem"}}>{comments.length} comment{comments.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{flex: 1, overflowY: "auto", paddingBottom: "80px"}}>

          {/* Post */}
          {post && (
            <div style={{backgroundColor: "#fff", borderBottom: "8px solid #F7F7F7"}}>
              <div style={{padding: "14px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
                {post.users?.avatar_url
                  ? <img onClick={() => router.push(`/profile/${post.user_id}`)} src={post.users.avatar_url} alt="" style={{width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", cursor: "pointer"}} />
                  : <div onClick={() => router.push(`/profile/${post.user_id}`)} style={{width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer"}}>{post.users?.full_name?.charAt(0).toUpperCase()}</div>
                }
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>{post.users?.full_name}</div>
                  <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px", display: "flex", alignItems: "center", gap: "6px"}}>
                    {formatTime(post.created_at)}
                    {post.tag && <span style={{padding: "2px 8px", borderRadius: "10px", backgroundColor: post.isExpired ? "#E0E0E0" : getTagBg(post.tag), color: post.isExpired ? "#888" : getTagColor(post.tag), fontWeight: 600, fontSize: "0.68rem"}}>{post.tag}</span>}
                  </div>
                </div>
                {!post.isExpired && post.expires_at && (
                  <div style={{fontSize: "0.65rem", color: "#F59E0B", fontWeight: 600, backgroundColor: "#FEF3C7", padding: "3px 8px", borderRadius: "10px", whiteSpace: "nowrap"}}>
                    ⏱ {getTimeLeft(post.expires_at)}
                  </div>
                )}
              </div>
              {post.location && !post.isExpired && (
                <div style={{padding: "0 16px 6px", display: "flex", alignItems: "center", gap: "5px"}}>
                  <span style={{fontSize: "0.78rem", color: "#1D9E75", fontWeight: 600}}>📍 {post.location}</span>
                </div>
              )}
              {post.isExpired ? (
                <div style={{padding: "10px 16px 16px"}}>
                  <div style={{fontSize: "0.88rem", color: "#aaa", fontStyle: "italic"}}>⏰ This post has expired.</div>
                </div>
              ) : (
                <>
                  <div style={{padding: "0 16px 12px", fontSize: "0.95rem", color: "#1A1A1A", lineHeight: 1.6}}>{post.content}</div>
                  {post.images && post.images.length > 0 && (
                    <div style={{marginBottom: "10px"}}>
                      <img src={post.images[0]} alt="" style={{width: "100%", maxHeight: "300px", objectFit: "cover"}} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Comments */}
          <div style={{padding: "12px 16px"}}>
            <div style={{fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A", marginBottom: "12px"}}>Comments</div>
            {comments.length === 0 ? (
              <div style={{textAlign: "center", padding: "32px 0"}}>
                <Image src="/nocomment.png" alt="no comments" width={80} height={80} style={{opacity: 0.5, marginBottom: "12px"}} />
                <div style={{color: "#888", fontSize: "0.82rem"}}>Walay comment pa. Ikaw ang una!</div>
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
                        {currentUser?.id === comment.user_id && !post?.isExpired && <button onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem", padding: "0 4px", lineHeight: 1}}>•••</button>}
                      </div>
                      <div style={{fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.4}}>{comment.content}</div>
                    </div>
                    <div style={{display: "flex", gap: "12px", marginTop: "4px", paddingLeft: "4px"}}>
                      <span style={{fontSize: "0.7rem", color: "#888"}}>{formatTime(comment.created_at)}{comment.edited_at && <span style={{marginLeft: "4px", fontStyle: "italic", color: "#aaa"}}>· Edited</span>}</span>
                      {!post?.isExpired && (
                        <button onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(""); }}
                          style={{background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: "#1D9E75", fontWeight: 600, padding: 0, fontFamily: "inherit"}}>
                          Reply
                        </button>
                      )}
                    </div>
                    {replyingTo === comment.id && (
                      <div style={{display: "flex", gap: "8px", marginTop: "8px", alignItems: "center"}}>
                        {currentUser?.avatar_url
                          ? <img src={currentUser.avatar_url} alt="" style={{width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                          : <div style={{width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.7rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
                        }
                        <input
                          autoFocus
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                          style={{flex: 1, border: "1px solid #F0F0F0", borderRadius: "20px", padding: "7px 14px", fontSize: "0.8rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7"}}
                        />
                        <button onClick={handleReply} disabled={submitting || !replyText.trim()}
                          style={{backgroundColor: submitting || !replyText.trim() ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "7px 14px", fontSize: "0.75rem", fontWeight: 700, cursor: submitting || !replyText.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
                          Reply
                        </button>
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
                                  {currentUser?.id === reply.user_id && !post?.isExpired && <button onClick={() => setShowCommentMenu(showCommentMenu === reply.id ? null : reply.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem", padding: "0 4px", lineHeight: 1}}>•••</button>}
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

        {/* Comment Input — hidden if expired */}
        {post?.isExpired ? (
          <div style={{padding: "14px 16px", backgroundColor: "#F7F7F7", borderTop: "1px solid #F0F0F0", textAlign: "center"}}>
            <span style={{fontSize: "0.8rem", color: "#aaa", fontStyle: "italic"}}>⏰ This post has expired. Comments are closed.</span>
          </div>
        ) : (
          <div style={{position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTop: "1px solid #F0F0F0", padding: "10px 16px", display: "flex", gap: "10px", alignItems: "center"}}>
            {currentUser?.avatar_url
              ? <img src={currentUser.avatar_url} alt="" style={{width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
              : <div style={{width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
            }
            <input
              placeholder="Write a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              style={{flex: 1, border: "1px solid #F0F0F0", borderRadius: "20px", padding: "9px 16px", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", backgroundColor: "#F7F7F7"}}
            />
            <button onClick={handleComment} disabled={submitting || !commentText.trim()}
              style={{backgroundColor: submitting || !commentText.trim() ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "20px", padding: "9px 18px", fontWeight: 700, fontSize: "0.8rem", cursor: submitting || !commentText.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap"}}>
              {submitting ? "..." : "Comment"}
            </button>
          </div>
        )}
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
