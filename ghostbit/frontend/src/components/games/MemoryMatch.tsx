"use client";

import { useState, useEffect, useCallback } from "react";

const ICONS = [
  "\u2660", "\u2665", "\u2666", "\u2663",
  "\u2605", "\u263A", "\u2600", "\u2602",
];

interface Card {
  id: number;
  icon: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): Card[] {
  const pairs = shuffle(ICONS).slice(0, 8);
  const doubled = [...pairs, ...pairs];
  return shuffle(doubled).map((icon, i) => ({
    id: i,
    icon,
    flipped: false,
    matched: false,
  }));
}

interface Props {
  onScore?: (score: number) => void;
}

export default function MemoryMatch({ onScore }: Props) {
  const [cards, setCards] = useState<Card[]>(buildDeck);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [bestMoves, setBestMoves] = useState(0);
  const matched = cards.filter((c) => c.matched).length;
  const won = matched === cards.length;

  const reset = useCallback(() => {
    setCards(buildDeck());
    setSelected([]);
    setMoves(0);
  }, []);

  // Check for match when 2 are selected
  useEffect(() => {
    if (selected.length !== 2) return;
    const [a, b] = selected;
    const timeout = setTimeout(() => {
      setCards((prev) => {
        const next = [...prev];
        if (next[a].icon === next[b].icon) {
          next[a] = { ...next[a], matched: true };
          next[b] = { ...next[b], matched: true };
        } else {
          next[a] = { ...next[a], flipped: false };
          next[b] = { ...next[b], flipped: false };
        }
        return next;
      });
      setSelected([]);
    }, 600);
    return () => clearTimeout(timeout);
  }, [selected]);

  // Track win
  useEffect(() => {
    if (won && moves > 0) {
      setBestMoves((b) => (b === 0 ? moves : Math.min(b, moves)));
      onScore?.(moves);
    }
  }, [won, moves, onScore]);

  function handleClick(idx: number) {
    if (selected.length >= 2) return;
    if (cards[idx].flipped || cards[idx].matched) return;

    setCards((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], flipped: true };
      return next;
    });
    setSelected((prev) => [...prev, idx]);
    setMoves((m) => m + 1);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Stats */}
      <div className="flex items-center gap-4 text-xs font-mono" style={{ color: "#94a3b8" }}>
        <span>
          Moves: <span style={{ color: "#e2e8f0" }}>{moves}</span>
        </span>
        <span>
          Pairs: <span style={{ color: "#22c55e" }}>{matched / 2}</span> / 8
        </span>
        {bestMoves > 0 && (
          <span>
            Best: <span style={{ color: "#eab308" }}>{bestMoves}</span>
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3" style={{ width: "fit-content" }}>
        {cards.map((card, i) => (
          <button
            key={card.id}
            onClick={() => handleClick(i)}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl text-xl sm:text-2xl flex items-center justify-center transition-all"
            style={{
              background: card.matched
                ? "rgba(34,197,94,0.12)"
                : card.flipped
                ? "rgba(99,102,241,0.15)"
                : "rgba(15,23,42,0.8)",
              border: card.matched
                ? "1px solid rgba(34,197,94,0.4)"
                : card.flipped
                ? "1px solid rgba(99,102,241,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              color: card.matched ? "#22c55e" : card.flipped ? "#c7d2fe" : "transparent",
              cursor: card.flipped || card.matched ? "default" : "pointer",
              transform: card.flipped || card.matched ? "rotateY(0)" : "rotateY(0)",
              boxShadow: card.matched ? "0 0 14px rgba(34,197,94,0.15)" : "none",
            }}
          >
            {card.flipped || card.matched ? card.icon : "?"}
          </button>
        ))}
      </div>

      {/* Win / Reset */}
      {won ? (
        <div className="text-center">
          <p className="text-lg font-bold mb-2" style={{ color: "#22c55e" }}>
            You matched all pairs!
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}
          >
            Play Again
          </button>
        </div>
      ) : null}
    </div>
  );
}
