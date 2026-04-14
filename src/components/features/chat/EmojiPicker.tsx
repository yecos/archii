'use client';
import React, { useMemo } from 'react';
import { EMOJI_CATEGORIES } from './chat-helpers';

interface EmojiPickerProps {
  emojiSearch: string;
  setEmojiSearch: (v: string) => void;
  activeEmojiCat: string;
  setActiveEmojiCat: (v: string) => void;
  recentEmojis: string[];
  filteredEmojis: string[] | null;
  insertEmoji: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({
  emojiSearch,
  setEmojiSearch,
  activeEmojiCat,
  setActiveEmojiCat,
  recentEmojis,
  filteredEmojis,
  insertEmoji,
  onClose,
}: EmojiPickerProps) {
  const emojisToRender = useMemo(() => {
    if (emojiSearch.trim()) return filteredEmojis || [];
    return EMOJI_CATEGORIES.find(c => c.name === activeEmojiCat)?.emojis || [];
  }, [emojiSearch, filteredEmojis, activeEmojiCat]);

  return (
    <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--card)] animate-fadeIn flex flex-col" style={{ animationDuration: '0.15s', maxHeight: '280px' }}>
      {/* Emoji search */}
      <div className="px-3 pt-2 pb-1">
        <input
          className="w-full bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--af-accent)] placeholder:text-[var(--af-text3)]"
          placeholder="Buscar emoji..."
          value={emojiSearch}
          onChange={e => setEmojiSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 px-2 py-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {EMOJI_CATEGORIES.map(cat => (
          <button
            key={cat.name}
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer border-none transition-colors ${activeEmojiCat === cat.name ? 'bg-[var(--af-accent)]/15' : 'bg-transparent hover:bg-[var(--af-bg3)]'}`}
            onClick={() => { setActiveEmojiCat(cat.name); setEmojiSearch(''); }}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="flex-1 overflow-y-auto px-2 pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        {/* Recent emojis */}
        {activeEmojiCat === 'Frecuentes' && !emojiSearch.trim() && (
          <div className="py-1">
            <div className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] px-1 mb-1">Recientes</div>
            <div className="flex flex-wrap gap-0.5">
              {recentEmojis.map((e, i) => (
                <button key={`recent-${i}`} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg3)] transition-colors cursor-pointer border-none bg-transparent text-[20px]" onClick={() => insertEmoji(e)}>{e}</button>
              ))}
            </div>
            <div className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] px-1 mb-1 mt-2">Comunes</div>
          </div>
        )}

        {/* Emojis for active category or search */}
        {emojisToRender.map((e, i) => (
          <button key={`${activeEmojiCat}-${i}`} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--af-bg3)] transition-colors cursor-pointer border-none bg-transparent text-[20px]" onClick={() => insertEmoji(e)}>{e}</button>
        ))}
      </div>

      {/* Close button */}
      <div className="text-center py-1 border-t border-[var(--border)]">
        <button className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer border-none bg-transparent py-1 px-4" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
