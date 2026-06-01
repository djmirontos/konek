"use client"
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FEED_REACTIONS } from "./ReactionButton";

type Reaction = { emoji: string; label: string; value: string };

type Props = {
  commentId: string;
  userReaction: string | null;
  reactionCounts: Record<string, number>;
  reactions?: Reaction[];
  onReact: (commentId: string, value: string) => void;
};

function getTotal(counts: Record<string, number>) {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function getTopEmojis(counts: Record<string, number>, reactions: Reaction[]) {
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => reactions.find(r => r.value === key)?.emoji || "👍");
}

export default function CommentReactionButton({
  commentId, userReaction, reactionCounts,
  reactions = FEED_REACTIONS,
  onReact,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const activeReaction = reactions.find(r => r.value === userReaction);
  const total = getTotal(reactionCounts);
  const topEmojis = getTopEmojis(reactionCounts, reactions);

  function startLongPress() {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(20);
      setShowPicker(true);
    }, 400);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handleTap() {
    if (showPicker) return;
    onReact(commentId, userReaction ? userReaction : reactions[0].value);
  }

  function handlePickerTouchMove(e: React.TouchEvent) {
    if (!pickerRef.current) return;
    const touch = e.touches[0];
    const rect = pickerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const itemW = rect.width / reactions.length;
    const idx = Math.floor(x / itemW);
    if (idx >= 0 && idx < reactions.length) setHoveredIndex(idx);
  }

  function handlePickerTouchEnd() {
    if (hoveredIndex !== null) onReact(commentId, reactions[hoveredIndex].value);
    setShowPicker(false);
    setHoveredIndex(null);
  }

  return (
    <div style={{display: "inline-flex", alignItems: "center", gap: "6px", position: "relative"}}>

      {/* FLOATING PICKER */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            ref={pickerRef}
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{position: "absolute", bottom: "28px", left: "-8px", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: "32px", padding: "6px 8px", boxShadow: "0 6px 24px rgba(0,0,0,0.15)", display: "flex", alignItems: "flex-end", gap: "2px", zIndex: 600, border: "1px solid rgba(0,0,0,0.06)", backdropFilter: "blur(8px)"}}
            onTouchMove={handlePickerTouchMove}
            onTouchEnd={handlePickerTouchEnd}
          >
            {reactions.map((r, i) => (
              <motion.div
                key={r.value}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 500, damping: 20 }}
                style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", cursor: "pointer", padding: "2px 3px"}}
                onClick={() => { onReact(commentId, r.value); setShowPicker(false); setHoveredIndex(null); }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <motion.span
                  animate={{ scale: hoveredIndex === i ? 1.5 : hoveredIndex !== null && Math.abs(hoveredIndex - i) === 1 ? 1.2 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{fontSize: "1.4rem", lineHeight: 1, display: "block"}}
                >
                  {r.emoji}
                </motion.span>
                <AnimatePresence>
                  {hoveredIndex === i && (
                    <motion.span
                      initial={{ opacity: 0, y: 2, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{fontSize: "0.52rem", fontWeight: 700, color: "#1D9E75", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", textTransform: "uppercase"}}
                    >
                      {r.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* REACTION BUTTON */}
      <motion.button
        onMouseDown={startLongPress}
        onMouseUp={() => { cancelLongPress(); if (!showPicker) handleTap(); }}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={() => { cancelLongPress(); if (!showPicker) handleTap(); }}
        whileTap={{ scale: 0.85 }}
        style={{background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", gap: "3px", fontFamily: "inherit", WebkitTapHighlightColor: "transparent"}}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={userReaction || "none"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            style={{fontSize: "0.95rem", lineHeight: 1}}
          >
            {activeReaction ? activeReaction.emoji : "👍"}
          </motion.span>
        </AnimatePresence>
        <span style={{fontSize: "0.72rem", fontWeight: 600, color: activeReaction ? "#1D9E75" : "#888", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
          {activeReaction ? activeReaction.label : "Like"}
        </span>
      </motion.button>

      {/* REACTION COUNT */}
      {total > 0 && (
        <span style={{fontSize: "0.7rem", color: "#888", fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", alignItems: "center", gap: "2px"}}>
          {topEmojis.map((emoji, i) => <span key={i} style={{fontSize: "0.75rem"}}>{emoji}</span>)}
          <span style={{marginLeft: "1px"}}>{total}</span>
        </span>
      )}

      {/* OVERLAY */}
      {showPicker && (
        <div style={{position: "fixed", inset: 0, zIndex: 599}} onClick={() => { setShowPicker(false); setHoveredIndex(null); }} />
      )}
    </div>
  );
}
