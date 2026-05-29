'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";

const ADJECTIVES = [
  "Tamad", "Sungit", "Buang", "Maldito", "Gigante", "Liit", "Paborito", "Bantog", "Tapang", "Matabil",
  "Malandi", "Makulit", "Matigas", "Mahirap", "Mayaman", "Bibo", "Torpe", "Bungog", "Ambisyoso", "Desperado",
  "Loko", "Siraulo", "Gwapo", "Pangit", "Mabait", "Maingay", "Tahimik", "Inggitero", "Palahubog", "Sigurista",
  "Paaway", "Romantiko", "Traydor", "Loyalista", "Mapanghusga", "Chismoso", "Interesado", "Confusado", "Suplado", "Friendly",
  "Makulay", "Malungkot", "Masaya", "Mainit", "Malamig", "Mabango", "Mabaho", "Matamis", "Mapait", "Maalat",
  "Gutom", "Busog", "Tulog", "Gising", "Nerbiyoso", "Excited", "Abala", "Libre", "Kuripot", "Gastador",
  "Matalino", "Bobo", "Mausisa", "Balimbing", "Mapagkumpitensya", "Makasarili", "Mapagbigay", "Mahilig", "Mainggitin", "Mapagtaka",
  "Walang-Kwenta", "Palaaway", "Palamura", "Palakibo", "Palainom", "Palikero", "Palaengot", "Palaisip", "Pabibo",
  "Kwela", "Petiks", "Arte", "Landian", "Marupok", "Fragile", "Savage", "Chill", "Kilig",
  "Bitter", "Petmalu", "Lodi", "Beshie", "Selos", "Manhid", "Feelingero", "Deadma", "Jologs", "Baduy",
  "Tambaloslos", "Bigaon", "Batignawong"
];

const NOUNS = [
  "Kalabaw", "Pusit", "Bangus", "Kamote", "Baboy", "Manok", "Isda", "Bato", "Payong", "Kutsilyo",
  "Tilapia", "Tulingan", "Galunggong", "Daing", "Tinapa", "Sardinas", "Danggit", "Hito", "Palaka", "Butiki",
  "Ipis", "Langgam", "Lamok", "Daga", "Pusa", "Aso", "Kabayo", "Baka", "Kambing",
  "Itlog", "Saging", "Mangga", "Kaimito", "Bayabas", "Siniguelas", "Atis", "Langka",
  "Durian", "Lanzones", "Rambutan", "Santol", "Papaya", "Melon", "Pipino", "Ampalaya", "Sibuyas", "Bawang",
  "Luya", "Paminta", "Asin", "Asukal", "Kanin", "Bigas", "Lugaw", "Pancit", "Mami",
  "Siopao", "Turon", "Bibingka", "Puto", "Kutsinta", "Palitaw", "Biko", "Suman", "Halo-halo",
  "Buko", "Taho", "Balut", "Penoy", "Isaw", "Betamax", "Kikiam", "Kwek-kwek", "Fishball", "Tempura",
  "Jeepney", "Tricycle", "Pedicab", "Tsinelas", "Sombrero", "Salakot", "Baro", "Saya", "Kamison", "Tapis",
  "Banga", "Palayok", "Kawali", "Kutsara", "Tinidor", "Sandok", "Walis", "Pugon", "Kalan", "Banig",
  "Tinabal", "Balbacua"
];

function generatePseudonym(userId: string, seed: string): string {
  let hash = 0;
  const str = userId + seed;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const adj = ADJECTIVES[abs % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(abs / ADJECTIVES.length) % NOUNS.length];
  const num = (abs % 999) + 1;
  return adj + " na " + noun + " #" + num;
}

type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };
type Post = {
  id: string; user_id: string; content: string; tag: string | null;
  images: string[] | null; created_at: string; school_id: string;
  pseudonym: string | null; upvotes: number; downvotes: number;
  userVote?: "upvote" | "downvote" | null;
};
type Comment = {
  id: string; post_id: string; user_id: string; content: string; created_at: string;
  parent_id: string | null; pseudonym?: string; edited_at?: string | null;
  replies?: Comment[];
};

export default function SoapboxDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [toast, setToast] = useState("");
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState<string | null>(null);
  const [postId, setPostId] = useState<string>("");

  useEffect(() => { setTimeout(() => setMounted(true), 10); params.then(p => { setPostId(p.id); initPage(p.id); }); }, []);

  async function initPage(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) {
      setCurrentUser(userData);
      await fetchPost(userData, id);
      await fetchComments(userData, id);
    }
    setLoading(false);
  }

  async function fetchPost(userData: User, id: string) {
    const { data } = await supabase.from("posts").select("id, user_id, content, tag, images, created_at, school_id, pseudonym, upvotes, downvotes").eq("id", id).single();
    if (data) {
      const { data: myVote } = await supabase.from("reactions").select("type").eq("post_id", id).eq("user_id", userData.id).single();
      setPost({ ...data, userVote: myVote ? (myVote.type as "upvote" | "downvote") : null });
    }
  }

  async function fetchComments(userData: User, id?: string) {
    const useId = id || postId;
    const { data } = await supabase.from("comments").select("id, post_id, user_id, content, created_at, parent_id, edited_at").eq("post_id", useId).order("created_at", { ascending: true });
    if (data) {
      const withPseudonyms = data.map(c => ({
        ...c,
        pseudonym: generatePseudonym(c.user_id, useId),
        isOwn: c.user_id === userData.id,
      }));
      const topLevel = withPseudonyms.filter(c => !c.parent_id);
      const withReplies = topLevel.map(c => ({
        ...c,
        replies: withPseudonyms.filter(r => r.parent_id === c.id),
      }));
      setComments(withReplies);
    }
  }

  async function handleVote(voteType: "upvote" | "downvote") {
    if (!currentUser || !post) return;
    if (post.userVote === voteType) {
      await supabase.from("reactions").delete().eq("post_id", post.id).eq("user_id", currentUser.id);
      setPost({ ...post, upvotes: voteType === "upvote" ? Math.max(0, post.upvotes - 1) : post.upvotes, downvotes: voteType === "downvote" ? Math.max(0, post.downvotes - 1) : post.downvotes, userVote: null });
      await supabase.from("posts").update({ upvotes: voteType === "upvote" ? Math.max(0, post.upvotes - 1) : post.upvotes, downvotes: voteType === "downvote" ? Math.max(0, post.downvotes - 1) : post.downvotes }).eq("id", post.id);
    } else {
      if (post.userVote) {
        await supabase.from("reactions").update({ type: voteType }).eq("post_id", post.id).eq("user_id", currentUser.id);
        setPost({ ...post, upvotes: voteType === "upvote" ? post.upvotes + 1 : Math.max(0, post.upvotes - 1), downvotes: voteType === "downvote" ? post.downvotes + 1 : Math.max(0, post.downvotes - 1), userVote: voteType });
        await supabase.from("posts").update({ upvotes: voteType === "upvote" ? post.upvotes + 1 : Math.max(0, post.upvotes - 1), downvotes: voteType === "downvote" ? post.downvotes + 1 : Math.max(0, post.downvotes - 1) }).eq("id", post.id);
      } else {
        await supabase.from("reactions").upsert({ post_id: post.id, user_id: currentUser.id, type: voteType }, { onConflict: "post_id,user_id" });
        setPost({ ...post, upvotes: voteType === "upvote" ? post.upvotes + 1 : post.upvotes, downvotes: voteType === "downvote" ? post.downvotes + 1 : post.downvotes, userVote: voteType });
        await supabase.from("posts").update({ upvotes: voteType === "upvote" ? post.upvotes + 1 : post.upvotes, downvotes: voteType === "downvote" ? post.downvotes + 1 : post.downvotes }).eq("id", post.id);
      }
    }
  }

  async function handleComment() {
    if (!commentText.trim() || !currentUser || !post) return;
    setSubmitting(true);
    const myPseudonym = generatePseudonym(currentUser.id, postId);
    const { error } = await supabase.from("comments").insert({
      post_id: postId, user_id: currentUser.id, content: commentText.trim(), parent_id: null,
    });
    if (!error) {
      if (post.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: post.user_id, sender_id: currentUser.id, type: "comment",
          post_id: postId, message: myPseudonym + " commented on your Soapbox post", is_read: false,
        });
      }
      setCommentText("");
      await fetchComments(currentUser, postId);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setSubmitting(false);
    }
    setSubmitting(false);
  }

  async function handleReply() {
    if (!replyText.trim() || !currentUser || !replyingTo || !post) return;
    setSubmitting(true);
    const myPseudonym = generatePseudonym(currentUser.id, postId);
    const parentComment = comments.find(c => c.id === replyingTo);
    const { error } = await supabase.from("comments").insert({
      post_id: postId, user_id: currentUser.id, content: replyText.trim(), parent_id: replyingTo,
    });
    if (!error) {
      if (parentComment && parentComment.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: parentComment.user_id, sender_id: currentUser.id, type: "reply",
          post_id: postId, message: myPseudonym + " replied to your comment", is_read: false,
        });
      }
      setReplyText("");
      setReplyingTo(null);
      await fetchComments(currentUser, postId);
    }
    setSubmitting(false);
  }

  async function handleEditComment(commentId: string) {
    if (!editCommentContent.trim()) return;
    const { error } = await supabase.from("comments").update({ content: editCommentContent.trim(), edited_at: new Date().toISOString() }).eq("id", commentId);
    if (!error) { setEditingComment(null); setEditCommentContent(""); showToast("Comment updated!"); await fetchComments(currentUser!); }
  }

  async function handleDeleteComment(commentId: string) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) { setShowDeleteCommentConfirm(null); showToast("Comment deleted!"); await fetchComments(currentUser!); }
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
            <div style={{color: "#fff", fontWeight: 700, fontSize: "0.95rem"}}>Soapbox</div>
            <div style={{color: "rgba(255,255,255,0.8)", fontSize: "0.7rem"}}>{comments.length} comment{comments.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{flex: 1, overflowY: "auto", paddingBottom: "80px"}}>

          {/* Post */}
          {post && (
            <div style={{backgroundColor: "#fff", borderBottom: "8px solid #F7F7F7"}}>
              <div style={{padding: "14px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
                <div style={{width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0}}>🎭</div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>{post.pseudonym}</div>
                  <div style={{fontSize: "0.72rem", color: "#888", marginTop: "1px"}}>
                    {formatTime(post.created_at)}
                    {post.tag && <span style={{marginLeft: "8px", color: "#1D9E75", fontWeight: 600}}>{post.tag}</span>}
                  </div>
                </div>
              </div>
              <div style={{padding: "0 16px 12px", fontSize: "0.95rem", color: "#1A1A1A", lineHeight: 1.6}}>{post.content}</div>
              {post.images && post.images.length > 0 && (
                <div style={{marginBottom: "10px"}}>
                  <img src={post.images[0]} alt="" style={{width: "100%", maxHeight: "300px", objectFit: "cover"}} />
                </div>
              )}
              <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 16px"}}></div>
              <div style={{display: "flex", padding: "8px 16px", gap: "8px"}}>
                <button onClick={() => handleVote("upvote")}
                  style={{background: post.userVote === "upvote" ? "#E1F5EE" : "none", border: "1px solid " + (post.userVote === "upvote" ? "#1D9E75" : "#F0F0F0"), borderRadius: "20px", cursor: "pointer", padding: "6px 14px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                  <span style={{fontSize: "0.9rem", color: post.userVote === "upvote" ? "#1D9E75" : "#888"}}>▲</span>
                  <span style={{fontSize: "0.82rem", fontWeight: 700, color: post.userVote === "upvote" ? "#1D9E75" : "#888"}}>{post.upvotes}</span>
                </button>
                <button onClick={() => handleVote("downvote")}
                  style={{background: post.userVote === "downvote" ? "#FEF2F2" : "none", border: "1px solid " + (post.userVote === "downvote" ? "#EF4444" : "#F0F0F0"), borderRadius: "20px", cursor: "pointer", padding: "6px 14px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit"}}>
                  <span style={{fontSize: "0.9rem", color: post.userVote === "downvote" ? "#EF4444" : "#888"}}>▼</span>
                  <span style={{fontSize: "0.82rem", fontWeight: 700, color: post.userVote === "downvote" ? "#EF4444" : "#888"}}>{post.downvotes}</span>
                </button>
              </div>
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
                  <div style={{width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0}}>🎭</div>
                  <div style={{flex: 1}}>
                    <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "8px 12px"}}>
                      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                        <div style={{fontWeight: 700, fontSize: "0.78rem", color: "#1D9E75", marginBottom: "3px"}}>{comment.pseudonym}</div>
                        {currentUser?.id === comment.user_id && <button onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem", padding: "0 4px", lineHeight: 1}}>•••</button>}
                      </div>
                      <div style={{fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.4}}>{comment.content}</div>
                    </div>
                    <div style={{display: "flex", gap: "12px", marginTop: "4px", paddingLeft: "4px"}}>
                      <span style={{fontSize: "0.7rem", color: "#888"}}>{formatTime(comment.created_at)}{comment.edited_at && <span style={{marginLeft: "4px", fontStyle: "italic", color: "#aaa"}}>· Edited</span>}</span>
                      <button onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(""); }}
                        style={{background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: "#1D9E75", fontWeight: 600, padding: 0, fontFamily: "inherit"}}>
                        Reply
                      </button>
                    </div>
                    {replyingTo === comment.id && (
                      <div style={{display: "flex", gap: "8px", marginTop: "8px", alignItems: "center"}}>
                        <div style={{width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", flexShrink: 0}}>🎭</div>
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
                            <div style={{width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", flexShrink: 0}}>🎭</div>
                            <div style={{flex: 1}}>
                              <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "7px 11px"}}>
                                <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                                  <div style={{fontWeight: 700, fontSize: "0.75rem", color: "#1D9E75", marginBottom: "2px"}}>{reply.pseudonym}</div>
                                  {currentUser?.id === reply.user_id && <button onClick={() => setShowCommentMenu(showCommentMenu === reply.id ? null : reply.id)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "1rem", padding: "0 4px", lineHeight: 1}}>•••</button>}
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
          <div style={{width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0}}>🎭</div>
          <input
            placeholder="Comment anonymously..."
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
