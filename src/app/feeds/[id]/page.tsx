'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import PhotoViewer from "@/components/PhotoViewer";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🤝"];
const REACTION_VALUES = ["like", "love", "haha", "wow", "sad", "grabe", "laban"];
const REACTION_NAMES = ["Like", "Love", "Haha", "Wow", "Sad", "Grabe", "Laban"];

type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; };
type Comment = {
  id: string; user_id: string; content: string; created_at: string;
  parent_id: string | null; is_hidden: boolean;
  users: { full_name: string; avatar_url: string | null; } | null;
  replies?: Comment[];
  reactionCounts?: Record<string, number>;
  userReaction?: string | null;
};
type Post = {
  id: string; user_id: string; content: string; tag: string | null;
  images: string[] | null; created_at: string;
  users: { full_name: string; avatar_url: string | null; } | null;
  reactionCounts?: Record<string, number>;
  userReaction?: string | null;
  commentCount?: number;
};

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const supabase = createClient();
  const commentInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showCommentReactionPicker, setShowCommentReactionPicker] = useState<string | null>(null);
  const commentLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showReactionList, setShowReactionList] = useState(false);
  const [reactionList, setReactionList] = useState<{user_id: string; type: string; users: {full_name: string; avatar_url: string | null;} | null;}[]>([]);
  const [reactionTab, setReactionTab] = useState("All");
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => { initPage(); }, []);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (userData) setCurrentUser(userData);
    await fetchPost(userData);
    await fetchComments();
    setLoading(false);
  }

  async function fetchPost(userData: User | null) {
    const { data } = await supabase
      .from("posts")
      .select("id, user_id, content, tag, images, created_at, users(full_name, avatar_url)")
      .eq("id", postId)
      .single();
    if (data) {
      const { data: reactions } = await supabase.from("reactions").select("type, user_id").eq("post_id", postId);
      const reactionCounts: Record<string, number> = {};
      let userReaction: string | null = null;
      (reactions || []).forEach((r) => {
        const emoji = REACTIONS[REACTION_VALUES.indexOf(r.type)] || r.type;
        reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
        if (userData && r.user_id === userData.id) userReaction = emoji;
      });
      const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", postId);
      setPost({ ...data, reactionCounts, userReaction, commentCount: count || 0 });
    }
  }

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("id, user_id, content, created_at, parent_id, is_hidden, users(full_name, avatar_url)")
      .eq("post_id", postId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });
    if (data && currentUser) {
      const enriched = await Promise.all(data.map(async (c) => {
        const { data: reactions } = await supabase.from("comment_reactions").select("type, user_id").eq("comment_id", c.id);
        const reactionCounts: Record<string, number> = {};
        let userReaction: string | null = null;
        (reactions || []).forEach((r) => {
          const emoji = REACTIONS[REACTION_VALUES.indexOf(r.type)] || r.type;
          reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
          if (r.user_id === currentUser.id) userReaction = emoji;
        });
        return { ...c, reactionCounts, userReaction };
      }));
      const topLevel = enriched.filter(c => !c.parent_id);
      const replies = enriched.filter(c => c.parent_id);
      const nested = topLevel.map(c => ({
        ...c,
        replies: replies.filter(r => r.parent_id === c.id)
      }));
      setComments(nested);
    }
  }

  async function handleCommentReaction(commentId: string, emoji: string, currentReaction: string | null) {
    if (!currentUser) return;
    const reactionValue = REACTION_VALUES[REACTIONS.indexOf(emoji)] || "like";
    if (currentReaction === emoji) {
      await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("comment_reactions").upsert({ comment_id: commentId, user_id: currentUser.id, type: reactionValue }, { onConflict: "comment_id,user_id" });
    }
    setShowCommentReactionPicker(null);
    await fetchComments();
  }

  async function handleQuickCommentLike(commentId: string, currentReaction: string | null) {
    if (!currentUser) return;
    if (currentReaction) {
      await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("comment_reactions").upsert({ comment_id: commentId, user_id: currentUser.id, type: "like" }, { onConflict: "comment_id,user_id" });
    }
    await fetchComments();
  }

  function startCommentLongPress(commentId: string) {
    commentLongPressTimer.current = setTimeout(() => { setShowCommentReactionPicker(commentId); }, 500);
  }

  function cancelCommentLongPress() {
    if (commentLongPressTimer.current) clearTimeout(commentLongPressTimer.current);
  }

  async function handleComment() {
    if (!commentText.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      await supabase.from("comments").insert({
        user_id: currentUser.id,
        post_id: postId,
        content: commentText.trim(),
        parent_id: replyTo ? replyTo.id : null,
        is_anonymous: false,
        is_flagged: false,
        is_hidden: false,
      });
      if (post && post.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: post.user_id,
          sender_id: currentUser.id,
          type: "comment",
          post_id: postId,
          message: currentUser.full_name + (replyTo ? " replied to a comment on your post" : " commented on your post"),
          is_read: false,
        });
      }
      if (post && post.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: post.user_id,
          sender_id: currentUser.id,
          type: "comment",
          post_id: postId,
          message: currentUser.full_name + (replyTo ? " replied to a comment on your post" : " commented on your post"),
          is_read: false,
        });
      }
      setCommentText("");
      setReplyTo(null);
      await fetchComments();
      await fetchPost(currentUser);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReaction(emoji: string) {
    if (!currentUser || !post) return;
    const reactionValue = REACTION_VALUES[REACTIONS.indexOf(emoji)] || "like";
    if (post.userReaction === emoji) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("reactions").upsert({ post_id: postId, user_id: currentUser.id, type: reactionValue }, { onConflict: "post_id,user_id" });
    }
    setShowReactionPicker(false);
    await fetchPost(currentUser);
  }

  async function handleQuickLike() {
    if (!currentUser || !post) return;
    if (post.userReaction) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    } else {
      await supabase.from("reactions").upsert({ post_id: postId, user_id: currentUser.id, type: "like" }, { onConflict: "post_id,user_id" });
    }
    await fetchPost(currentUser);
  }

  function startLongPress() {
    longPressTimer.current = setTimeout(() => { setShowReactionPicker(true); }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  async function fetchReactionList() {
    setLoadingReactions(true);
    setShowReactionList(true);
    setReactionTab("All");
    const { data } = await supabase.from("reactions").select("user_id, type, users(full_name, avatar_url)").eq("post_id", postId);
    if (data) setReactionList(data);
    setLoadingReactions(false);
  }

  function getFilteredReactions() {
    if (reactionTab === "All") return reactionList;
    const value = REACTION_VALUES[REACTION_NAMES.indexOf(reactionTab)];
    return reactionList.filter(r => r.type === value);
  }

  function getReactionTabs() {
    const tabs: string[] = ["All"];
    const seen = new Set<string>();
    reactionList.forEach(r => {
      const name = REACTION_NAMES[REACTION_VALUES.indexOf(r.type)];
      if (name && !seen.has(r.type)) { seen.add(r.type); tabs.push(name); }
    });
    return tabs;
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

  function getTotalReactions(counts: Record<string, number>) {
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }

  function getTopReactions(counts: Record<string, number>) {
    return Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  }

  if (loading) return (
    <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      <div style={{textAlign: "center", color: "#888"}}>
        <div style={{fontSize: "2rem", marginBottom: "8px"}}>⏳</div>
        <div style={{fontSize: "0.85rem"}}>Loading post...</div>
      </div>
    </div>
  );

  if (!post) return (
    <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      <div style={{textAlign: "center", color: "#888"}}>
        <div style={{fontSize: "2rem", marginBottom: "8px"}}>😕</div>
        <div>Post not found</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {/* Header */}
      <div style={{backgroundColor: "#1D9E75", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.back()} style={{background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#fff", fontSize: "1.2rem"}}>←</button>
        <span style={{color: "#fff", fontWeight: 700, fontSize: "1rem"}}>Post</span>
      </div>

      {/* Post */}
      <div style={{backgroundColor: "#fff", marginBottom: "8px"}}>
        <div style={{padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: "10px"}}>
          {post.users?.avatar_url
            ? <img src={post.users.avatar_url} alt="" style={{width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover"}} />
            : <div style={{width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1.1rem"}}>{post.users?.full_name?.charAt(0).toUpperCase()}</div>
          }
          <div>
            <div style={{fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A"}}>{post.users?.full_name}</div>
            <div style={{fontSize: "0.72rem", color: "#888"}}>
              {formatTime(post.created_at)}
              {post.tag && <span style={{marginLeft: "8px", color: "#1D9E75", fontWeight: 600}}>{post.tag}</span>}
            </div>
          </div>
        </div>

        <div style={{padding: "0 16px 12px", fontSize: "0.95rem", color: "#1A1A1A", lineHeight: 1.6}}>{post.content}</div>

        {post.images && post.images.length > 0 && (
          <div style={{display: "grid", gridTemplateColumns: post.images.length === 1 ? "1fr" : "1fr 1fr", gap: "2px", marginBottom: "8px"}}>
            {post.images.map((url, i) => (
              <img key={i} src={url} alt="" onClick={() => { setViewerImages(post.images!); setViewerIndex(i); }} style={{width: "100%", aspectRatio: post.images!.length === 1 ? "16/9" : "1/1", objectFit: "cover", cursor: "pointer"}} />
            ))}
          </div>
        )}

        {getTotalReactions(post.reactionCounts || {}) > 0 && (
          <div style={{padding: "6px 16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <div onClick={fetchReactionList} style={{display: "flex", alignItems: "center", gap: "4px", cursor: "pointer"}}>
              <span style={{fontSize: "0.9rem"}}>{getTopReactions(post.reactionCounts || {}).join("")}</span>
              <span style={{fontSize: "0.78rem", color: "#888"}}>{getTotalReactions(post.reactionCounts || {})}</span>
            </div>
            <span style={{fontSize: "0.78rem", color: "#888"}}>{post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}</span>
          </div>
        )}

        <div style={{height: "1px", backgroundColor: "#F0F0F0", margin: "0 16px"}}></div>

        {/* Action Buttons */}
        <div style={{display: "flex", padding: "4px 8px", position: "relative"}}>
          <div style={{flex: 1, position: "relative"}}>
            <button
              onMouseDown={startLongPress}
              onMouseUp={() => { cancelLongPress(); if (!showReactionPicker) handleQuickLike(); }}
              onMouseLeave={cancelLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={() => { cancelLongPress(); if (!showReactionPicker) handleQuickLike(); }}
              style={{width: "100%", background: "none", border: "none", cursor: "pointer", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit", borderRadius: "8px"}}>
              {post.userReaction ? <span style={{fontSize: "1.1rem"}}>{post.userReaction}</span> : <Image src="/like.png" alt="like" width={20} height={20} />}
              <span style={{fontSize: "0.78rem", fontWeight: post.userReaction ? 700 : 400, color: post.userReaction ? "#1D9E75" : "#888"}}>
                {post.userReaction ? REACTION_NAMES[REACTIONS.indexOf(post.userReaction)] || "Like" : "Like"}
              </span>
            </button>
            {showReactionPicker && (
              <div style={{position: "absolute", bottom: "48px", left: "0", backgroundColor: "#fff", borderRadius: "30px", padding: "8px 12px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", gap: "8px", zIndex: 300, border: "1px solid #F0F0F0"}}>
                {REACTIONS.map((emoji, i) => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} title={REACTION_NAMES[i]}
                    style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px", borderRadius: "50%"}}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => commentInputRef.current?.focus()} style={{flex: 1, background: "none", border: "none", cursor: "pointer", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit", borderRadius: "8px"}}>
            <Image src="/comment.png" alt="comment" width={20} height={20} />
            <span style={{fontSize: "0.78rem", color: "#888"}}>Comment</span>
          </button>

          <button style={{flex: 1, background: "none", border: "none", cursor: "pointer", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit", borderRadius: "8px"}}>
            <Image src="/share.png" alt="share" width={20} height={20} />
            <span style={{fontSize: "0.78rem", color: "#888"}}>Share</span>
          </button>
        </div>
      </div>

      {/* Comments */}
      <div style={{flex: 1, paddingBottom: "80px"}}>
        <div style={{padding: "10px 16px 4px", fontSize: "0.78rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em"}}>
          Comments ({post.commentCount})
        </div>

        {comments.length === 0 ? (
          <div style={{textAlign: "center", padding: "32px 16px", color: "#888"}}>
            <div style={{fontSize: "2rem", marginBottom: "8px"}}>💬</div>
            <div style={{fontSize: "0.85rem"}}>Walay comment pa. Be the first!</div>
          </div>
        ) : comments.map(comment => (
          <div key={comment.id} style={{backgroundColor: "#fff", marginBottom: "4px", padding: "12px 16px"}}>
            <div style={{display: "flex", gap: "10px", alignItems: "flex-start"}}>
              {comment.users?.avatar_url
                ? <img src={comment.users.avatar_url} alt="" style={{width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                : <div style={{width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0}}>{comment.users?.full_name?.charAt(0).toUpperCase()}</div>
              }
              <div style={{flex: 1}}>
                <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "8px 12px"}}>
                  <div style={{fontWeight: 700, fontSize: "0.82rem", color: "#1A1A1A", marginBottom: "2px"}}>{comment.users?.full_name}</div>
                  <div style={{fontSize: "0.85rem", color: "#1A1A1A", lineHeight: 1.4}}>{comment.content}</div>
                </div>
                <div style={{display: "flex", gap: "12px", marginTop: "4px", paddingLeft: "4px", alignItems: "center"}}>
                  <span style={{fontSize: "0.72rem", color: "#888"}}>{formatTime(comment.created_at)}</span>
                  <div style={{position: "relative"}}>
                    <button
                      onMouseDown={() => startCommentLongPress(comment.id)}
                      onMouseUp={() => { cancelCommentLongPress(); if (showCommentReactionPicker !== comment.id) handleQuickCommentLike(comment.id, comment.userReaction || null); }}
                      onMouseLeave={cancelCommentLongPress}
                      onTouchStart={() => startCommentLongPress(comment.id)}
                      onTouchEnd={() => { cancelCommentLongPress(); if (showCommentReactionPicker !== comment.id) handleQuickCommentLike(comment.id, comment.userReaction || null); }}
                      style={{background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: comment.userReaction ? "#1D9E75" : "#888", padding: 0, fontFamily: "inherit"}}>
                      {comment.userReaction ? comment.userReaction + " " + (REACTION_NAMES[REACTIONS.indexOf(comment.userReaction)] || "Like") : "Like"}
                    </button>
                    {Object.values(comment.reactionCounts || {}).reduce((a,b) => a+b, 0) > 0 && (
                      <span style={{fontSize: "0.68rem", color: "#888", marginLeft: "4px"}}>
                        {Object.entries(comment.reactionCounts || {}).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k]) => k).join("")} {Object.values(comment.reactionCounts || {}).reduce((a,b) => a+b, 0)}
                      </span>
                    )}
                    {showCommentReactionPicker === comment.id && (
                      <div style={{position: "absolute", bottom: "24px", left: "0", backgroundColor: "#fff", borderRadius: "30px", padding: "8px 12px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", gap: "8px", zIndex: 300, border: "1px solid #F0F0F0"}}>
                        {REACTIONS.map((emoji, i) => (
                          <button key={emoji} onClick={() => handleCommentReaction(comment.id, emoji, comment.userReaction || null)} title={REACTION_NAMES[i]}
                            style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px", borderRadius: "50%"}}
                            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setReplyTo({ id: comment.id, name: comment.users?.full_name || "" }); commentInputRef.current?.focus(); }}
                    style={{background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#888", padding: 0, fontFamily: "inherit"}}>
                    Reply
                  </button>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div style={{marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px"}}>
                    {comment.replies.map(reply => (
                      <div key={reply.id} style={{display: "flex", gap: "8px", alignItems: "flex-start"}}>
                        {reply.users?.avatar_url
                          ? <img src={reply.users.avatar_url} alt="" style={{width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
                          : <div style={{width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.72rem", flexShrink: 0}}>{reply.users?.full_name?.charAt(0).toUpperCase()}</div>
                        }
                        <div style={{flex: 1}}>
                          <div style={{backgroundColor: "#F7F7F7", borderRadius: "12px", padding: "6px 10px"}}>
                            <div style={{fontWeight: 700, fontSize: "0.78rem", color: "#1A1A1A", marginBottom: "2px"}}>{reply.users?.full_name}</div>
                            <div style={{fontSize: "0.82rem", color: "#1A1A1A", lineHeight: 1.4}}>{reply.content}</div>
                          </div>
                          <div style={{display: "flex", gap: "12px", marginTop: "4px", paddingLeft: "4px", alignItems: "center"}}>
                            <span style={{fontSize: "0.68rem", color: "#888"}}>{formatTime(reply.created_at)}</span>
                            <div style={{position: "relative"}}>
                              <button
                                onMouseDown={() => startCommentLongPress(reply.id)}
                                onMouseUp={() => { cancelCommentLongPress(); if (showCommentReactionPicker !== reply.id) handleQuickCommentLike(reply.id, reply.userReaction || null); }}
                                onMouseLeave={cancelCommentLongPress}
                                onTouchStart={() => startCommentLongPress(reply.id)}
                                onTouchEnd={() => { cancelCommentLongPress(); if (showCommentReactionPicker !== reply.id) handleQuickCommentLike(reply.id, reply.userReaction || null); }}
                                style={{background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 700, color: reply.userReaction ? "#1D9E75" : "#888", padding: 0, fontFamily: "inherit"}}>
                                {reply.userReaction ? reply.userReaction + " " + (REACTION_NAMES[REACTIONS.indexOf(reply.userReaction)] || "Like") : "Like"}
                              </button>
                              {Object.values(reply.reactionCounts || {}).reduce((a,b) => a+b, 0) > 0 && (
                                <span style={{fontSize: "0.65rem", color: "#888", marginLeft: "4px"}}>
                                  {Object.entries(reply.reactionCounts || {}).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k]) => k).join("")} {Object.values(reply.reactionCounts || {}).reduce((a,b) => a+b, 0)}
                                </span>
                              )}
                              {showCommentReactionPicker === reply.id && (
                                <div style={{position: "absolute", bottom: "24px", left: "0", backgroundColor: "#fff", borderRadius: "30px", padding: "8px 12px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", gap: "8px", zIndex: 300, border: "1px solid #F0F0F0"}}>
                                  {REACTIONS.map((emoji, i) => (
                                    <button key={emoji} onClick={() => handleCommentReaction(reply.id, emoji, reply.userReaction || null)} title={REACTION_NAMES[i]}
                                      style={{background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", padding: "2px", borderRadius: "50%"}}
                                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
                                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comment Input */}
      <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderTop: "1px solid #F0F0F0", padding: "8px 12px", zIndex: 100}}>
        {replyTo && (
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", backgroundColor: "#E1F5EE", padding: "4px 10px", borderRadius: "8px"}}>
            <span style={{fontSize: "0.75rem", color: "#1D9E75", fontWeight: 600}}>Replying to {replyTo.name}</span>
            <button onClick={() => setReplyTo(null)} style={{background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "0.8rem", padding: 0}}>✕</button>
          </div>
        )}
        <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
          {currentUser?.avatar_url
            ? <img src={currentUser.avatar_url} alt="" style={{width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0}} />
            : <div style={{width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
          }
          <input
            ref={commentInputRef}
            type="text"
            placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Write a comment..."}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
            style={{flex: 1, backgroundColor: "#F7F7F7", border: "1px solid #F0F0F0", borderRadius: "20px", padding: "8px 14px", fontSize: "0.85rem", color: "#1A1A1A", outline: "none", fontFamily: "inherit"}}
          />
          <button onClick={handleComment} disabled={submitting || !commentText.trim()}
            style={{backgroundColor: submitting || !commentText.trim() ? "#ccc" : "#1D9E75", color: "#fff", border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: submitting || !commentText.trim() ? "not-allowed" : "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0}}>
            ➤
          </button>
        </div>
      </div>

      {/* Reaction Slide Panel */}
      {showReactionList && (
        <>
          <div onClick={() => setShowReactionList(false)} style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 400}} />
          <div style={{position: "fixed", top: 0, right: 0, width: "100%", maxWidth: "480px", height: "100vh", backgroundColor: "#fff", zIndex: 500, display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.2)", animation: "slideInRight 0.25s ease-out"}}>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div style={{padding: "16px", borderBottom: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1D9E75"}}>
              <span style={{fontWeight: 700, fontSize: "1rem", color: "#fff"}}>Reactions</span>
              <button onClick={() => setShowReactionList(false)} style={{background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "#fff", fontSize: "1rem", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center"}}>X</button>
            </div>
            <div style={{display: "flex", gap: "4px", padding: "10px 12px", borderBottom: "1px solid #F0F0F0", overflowX: "auto"}}>
              {getReactionTabs().map(tab => {
                const idx = REACTION_NAMES.indexOf(tab);
                const emoji = idx >= 0 ? REACTIONS[idx] : "";
                return (
                  <button key={tab} onClick={() => setReactionTab(tab)}
                    style={{padding: "6px 14px", borderRadius: "20px", border: "none", backgroundColor: reactionTab === tab ? "#E1F5EE" : "#F7F7F7", color: reactionTab === tab ? "#1D9E75" : "#888", fontWeight: reactionTab === tab ? 700 : 400, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0}}>
                    {tab === "All" ? "All " + reactionList.length : emoji + " " + tab}
                  </button>
                );
              })}
            </div>
            <div style={{overflowY: "auto", flex: 1}}>
              {loadingReactions ? (
                <div style={{textAlign: "center", padding: "32px", color: "#888", fontSize: "0.85rem"}}>Loading...</div>
              ) : getFilteredReactions().length === 0 ? (
                <div style={{textAlign: "center", padding: "32px", color: "#888", fontSize: "0.85rem"}}>No reactions yet.</div>
              ) : getFilteredReactions().map((r, i) => {
                const emoji = REACTIONS[REACTION_VALUES.indexOf(r.type)] || REACTIONS[0];
                return (
                  <div key={i} style={{display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #F0F0F0", cursor: "pointer"}}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F7F7F7")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
                    <div style={{position: "relative", flexShrink: 0}}>
                      {r.users?.avatar_url
                        ? <img src={r.users.avatar_url} alt="" style={{width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover"}} />
                        : <div style={{width: "46px", height: "46px", borderRadius: "50%", backgroundColor: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D9E75", fontWeight: 700, fontSize: "1.1rem"}}>{r.users?.full_name?.charAt(0).toUpperCase()}</div>
                      }
                      <div style={{position: "absolute", bottom: "-2px", right: "-2px", fontSize: "1rem", backgroundColor: "#fff", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.15)"}}>{emoji}</div>
                    </div>
                    <span style={{fontWeight: 600, fontSize: "0.9rem", color: "#1A1A1A"}}>{r.users?.full_name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      {showReactionPicker && <div onClick={() => setShowReactionPicker(false)} style={{position: "fixed", inset: 0, zIndex: 250}} />}
      {showCommentReactionPicker && <div onClick={() => setShowCommentReactionPicker(null)} style={{position: "fixed", inset: 0, zIndex: 250}} />}
      {viewerImages.length > 0 && (
        <PhotoViewer
          images={viewerImages}
          startIndex={viewerIndex}
          currentIndex={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerImages([])}
        />
      )}
    </div>
  );
}