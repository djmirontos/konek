"use client"
import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { id: "recent", label: "🕐", name: "Recent" },
  { id: "smileys", label: "😀", name: "Smileys" },
  { id: "people", label: "👍", name: "People" },
  { id: "hearts", label: "❤️", name: "Hearts" },
  { id: "animals", label: "🐶", name: "Animals" },
  { id: "food", label: "🍔", name: "Food" },
  { id: "activities", label: "⚽", name: "Activities" },
  { id: "travel", label: "🚗", name: "Travel" },
  { id: "objects", label: "💡", name: "Objects" },
  { id: "symbols", label: "🎉", name: "Symbols" },
];

const EMOJIS: Record<string, string[]> = {
  smileys: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿"],
  people: ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁","👅","👄","💋","🫦","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷"],
  hearts: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","♾","💯","💢","💥","💫","💦","💨","🕳","💬","💭","💤"],
  animals: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🪲","🦟","🦗","🕷","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐕‍🦺","🐈","🐈‍⬛","🪶","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿","🦔"],
  food: ["🍎","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🧋","☕","🫖","🍵","🧉","🍺","🍻","🥂","🍷","🫗","🥃","🍸","🍹","🧊"],
  activities: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🎣","🤿","🎽","🎿","🛷","🥌","🎯","🪀","🪆","🎮","🕹","🎰","🎲","🧩","🧸","🪅","🎭","🎨","🖼","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻","🎲","♟","🎯","🎳","🎮","🎰","🛹","🛼","🎪","🤹","🎠","🎡","🎢"],
  travel: ["🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍","🛵","🛺","🚲","🛴","🛹","🛼","🚏","🛣","🛤","⛽","🚨","🚥","🚦","🛑","🚧","⚓","🛟","⛵","🛶","🚤","🛳","⛴","🛥","🚢","✈️","🛩","🛫","🛬","🪂","💺","🚁","🚟","🚠","🚡","🛰","🚀","🛸","🪐","🌍","🌎","🌏","🗺","🧭","🏔","⛰","🌋","🗻","🏕","🏖","🏜","🏝","🏞","🏟","🏛","🏗","🧱","🪨","🪵","🛖","🏘","🏚","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕","🕍","⛩","🕋"],
  objects: ["⌚","📱","📲","💻","⌨️","🖥","🖨","🖱","🖲","💽","💾","💿","📀","📷","📸","📹","🎥","📽","🎞","📞","☎️","📟","📠","📺","📻","🧭","⏱","⏲","⏰","🕰","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯","🪔","🧯","🛢","💸","💵","💴","💶","💷","💰","💳","💎","⚖️","🪜","🧲","🔧","🪛","🔩","⚙️","🗜","🔗","⛓","🪝","🧰","🪤","🧲","🔫","💣","🪓","🔪","🗡","⚔️","🛡","🚬","⚰️","⚱️","🏺","🔮","📿","🧿","💈","⚗️","🔭","🔬","🕳","🩹","🩺","💊","💉","🩸","🩼","🩻","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🪥","🪒","🧴","🧷","🧦","🧤","🧣","🎩","🧢","👒","☂️","🌂","🧵","🪡","🧶","👓","🕶","🥽","🌂"],
  symbols: ["🎉","🎊","🎈","🎁","🎀","🎗","🎟","🎫","🏆","🥇","🥈","🥉","🏅","🎖","🏵","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎵","🎶","🎙","🎚","🎛","📻","🎷","🎸","🎹","🎺","🎻","🥁","🪘","🎲","♟","🎯","🎳","🎮","🕹","🎰","🧩","🪅","🎠","🎡","🎢","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚝","🚞","🛤","🛣","🚋","🚌","🚍","🚎","🚐","🚑","🚒","🚓","🚔","🚕","🚖","🚗","🚘","🚙","🛻","🚚","🚛","🚜","🏎","🏍","🛵","🛺","🚲","🛴","🛹","🛼","🚏","🚨","🚥","🚦","🛑","🚧","⚓","🛟","⛵","🛶","🚤","🛳","⛴","🛥","🚢","✈️","🛩","✨","⭐","🌟","💫","✨","🔥","💥","❄️","🌊","🌈","☀️","🌤","⛅","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","☃️","⛄","🌬","💨","🌪","🌫","🌈","🌂","☂️","☔","⛱","⚡","❄️","🔥","💧","🌊"],
};

const RECENT_KEY = "konek_recent_emojis";
const MAX_RECENT = 30;

function getRecentEmojis(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveRecentEmoji(emoji: string) {
  try {
    const recent = getRecentEmojis().filter(e => e !== emoji);
    recent.unshift(emoji);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {}
}

type Props = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(getRecentEmojis());
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  function handleSelect(emoji: string) {
    saveRecentEmoji(emoji);
    setRecent(getRecentEmojis());
    onSelect(emoji);
  }

  const searchResults = search.trim()
    ? Object.values(EMOJIS).flat().filter((e, i, arr) => arr.indexOf(e) === i).slice(0, 60)
    : [];

  const displayEmojis = search.trim()
    ? searchResults
    : activeCategory === "recent"
    ? recent
    : EMOJIS[activeCategory] || [];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position: "fixed", inset: 0, zIndex: 900}} />

      {/* Picker */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "min(480px, 100vw)", backgroundColor: "#fff",
        borderRadius: "20px 20px 0 0", zIndex: 1000,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        maxHeight: "55vh", display: "flex", flexDirection: "column"
      }}>
        {/* Handle */}
        <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "10px auto 0", flexShrink: 0}} />

        {/* Search */}
        <div style={{padding: "10px 12px 8px", flexShrink: 0}}>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search emoji..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{width: "100%", backgroundColor: "#F7F7F7", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "8px 12px", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}}
          />
        </div>

        {/* Category tabs */}
        {!search && (
          <div style={{display: "flex", gap: "2px", padding: "0 12px 8px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0}}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                title={cat.name}
                style={{
                  padding: "6px 8px", border: "none", borderRadius: "8px", cursor: "pointer",
                  backgroundColor: activeCategory === cat.id ? "#E1F5EE" : "transparent",
                  fontSize: "1.1rem", flexShrink: 0, lineHeight: 1
                }}>
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Category name */}
        <div style={{padding: "0 14px 6px", fontSize: "0.68rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0}}>
          {search ? "Search Results" : CATEGORIES.find(c => c.id === activeCategory)?.name}
        </div>

        {/* Emoji Grid */}
        <div style={{overflowY: "auto", flex: 1, padding: "0 8px 16px"}}>
          {displayEmojis.length === 0 ? (
            <div style={{textAlign: "center", padding: "24px", color: "#888", fontSize: "0.82rem"}}>
              {activeCategory === "recent" ? "No recent emojis yet" : "No results"}
            </div>
          ) : (
            <div style={{display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px"}}>
              {displayEmojis.map((emoji, i) => (
                <button key={i} onClick={() => handleSelect(emoji)}
                  style={{
                    padding: "6px", border: "none", backgroundColor: "transparent",
                    borderRadius: "8px", cursor: "pointer", fontSize: "1.4rem",
                    lineHeight: 1, textAlign: "center", transition: "background 0.1s"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F0F0F0")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export { getRecentEmojis, saveRecentEmoji };
