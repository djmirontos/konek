"use client"
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const FEED_REACTIONS = [
  { emoji: "👍", label: "Like",  value: "like"  },
  { emoji: "❤️", label: "Love",  value: "love"  },
  { emoji: "😂", label: "Haha",  value: "haha"  },
  { emoji: "😮", label: "Wow",   value: "wow"   },
  { emoji: "😢", label: "Sad",   value: "sad"   },
  { emoji: "💪", label: "Laban", value: "laban" },
  { emoji: "🔥", label: "Grabe", value: "grabe" },
];

export const CONFESSION_REACTIONS = [
  { emoji: "👍", label: "Like",  value: "like"  },
  { emoji: "❤️", label: "Love",  value: "love"  },
  { emoji: "😢", label: "Sad",   value: "sad"   },
  { emoji: "😂", label: "Haha",  value: "haha"  },
  { emoji: "💪", label: "Laban", value: "laban" },
];

type Reaction = { emoji: string; label: string; value: string };

type Props = {
  postId: string;
  userReaction: string | null;
  reactionCounts: Record<string, number>;
  reactions?: Reaction[];
  onReact: (postId: string, value: string) => void;
  onOpenReactionList?: () => void;
  commentCount?: number;
};

function getTotal(counts: Record<string, number>) {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function getTopEmojis(counts: Record<string, number>, reactions: Reaction[]) {
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => reactions.find(r => r.value === key)?.emoji || "")
    .filter(Boolean);
}

export default function ReactionButton({
  postId, userReaction, reactionCounts,
  reactions = FEED_REACTIONS,
  onReact,
  onOpenReactionList,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const total = getTotal(reactionCounts);
  const topEmojis = getTopEmojis(reactionCounts, reactions);

  function startLongPress() {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(30);
      setShowPicker(true);
    }, 400);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handleTap() {
    if (showPicker) return;
    onReact(postId, userReaction ? userReaction : reactions[0].value);
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
    if (hoveredIndex !== null) onReact(postId, reactions[hoveredIndex].value);
    setShowPicker(false);
    setHoveredIndex(null);
  }

  return (
    <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, position: "relative"}}>

      {/* LEFT — Like button + total count */}
      <div style={{position: "relative"}}>
        <AnimatePresence>
          {showPicker && (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{position: "absolute", bottom: "48px", left: "-8px", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: "40px", padding: "8px 10px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "flex-end", gap: "2px", zIndex: 600, border: "1px solid rgba(0,0,0,0.06)", backdropFilter: "blur(8px)"}}
              onTouchMove={handlePickerTouchMove}
              onTouchEnd={handlePickerTouchEnd}
            >
              {reactions.map((r, i) => (
                <motion.div
                  key={r.value}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 500, damping: 20 }}
                  whileHover={{ scale: 1.4 }}
                  style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: "pointer", padding: "2px 4px"}}
                  onClick={() => { onReact(postId, r.value); setShowPicker(false); setHoveredIndex(null); }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <motion.span
                    animate={{ scale: hoveredIndex === i ? 1.5 : hoveredIndex !== null && Math.abs(hoveredIndex - i) === 1 ? 1.2 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    style={{fontSize: hoveredIndex === i ? "2rem" : "1.6rem", lineHeight: 1, display: "block"}}
                  >
                    {r.emoji}
                  </motion.span>
                  <AnimatePresence>
                    {hoveredIndex === i && (
                      <motion.span
                        initial={{ opacity: 0, y: 4, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        style={{fontSize: "0.58rem", fontWeight: 700, color: "#1D9E75", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.03em"}}
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

        <motion.button
          onMouseDown={startLongPress}
          onMouseUp={() => { cancelLongPress(); if (!showPicker) handleTap(); }}
          onMouseLeave={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={() => { cancelLongPress(); if (!showPicker) handleTap(); }}
          whileTap={{ scale: 0.85 }}
          style={{background: "none", border: "none", cursor: "pointer", padding: "6px 4px", display: "flex", alignItems: "center", gap: "5px", fontFamily: "inherit", WebkitTapHighlightColor: "transparent"}}
          aria-label="React"
        >
          <img
            src="/like.png"
            alt="like"
            style={{width: "20px", height: "20px", objectFit: "contain", opacity: userReaction ? 1 : 0.5,
              filter: userReaction ? "hue-rotate(0deg) saturate(1.5)" : "none",
              transition: "opacity 0.2s"}}
          />
          {total > 0 && (
            <span style={{fontSize: "0.78rem", fontWeight: 600, color: userReaction ? "#1D9E75" : "#888", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
              {total}
            </span>
          )}
        </motion.button>
      </div>



      {/* OVERLAY */}
      {showPicker && (
        <div style={{position: "fixed", inset: 0, zIndex: 599}} onClick={() => { setShowPicker(false); setHoveredIndex(null); }} />
      )}
    </div>
  );
}
