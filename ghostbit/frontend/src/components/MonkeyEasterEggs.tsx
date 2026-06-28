"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const MONKEY_EMOJIS = ["🐒", "🙈", "🙉", "🙊", "🐵"];
const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];
const PEEK_FIRST_MIN_MS = 15_000;   // first one shows within 15-25s so users find it
const PEEK_FIRST_MAX_MS = 25_000;
const PEEK_MIN_MS = 2 * 60 * 1000;  // then settles into 2-4 min cadence
const PEEK_MAX_MS = 4 * 60 * 1000;
const PEEK_VISIBLE_MS = 4500;

type Edge = "left" | "right" | "bottom";
interface PeekMonkey {
  id: number;
  edge: Edge;
  emoji: string;
  pos: number;
}

interface RainDrop {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

export default function MonkeyEasterEggs() {
  const [peek, setPeek] = useState<PeekMonkey | null>(null);
  const [found, setFound] = useState(false);
  const [rain, setRain] = useState<RainDrop[]>([]);

  const peekIdRef = useRef(0);
  const rainIdRef = useRef(0);
  const peekScheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const konamiRef = useRef<string[]>([]);
  const peekCountRef = useRef(0);

  const schedulePeek = useCallback(() => {
    if (peekScheduleRef.current) clearTimeout(peekScheduleRef.current);
    const first = peekCountRef.current === 0;
    const min = first ? PEEK_FIRST_MIN_MS : PEEK_MIN_MS;
    const max = first ? PEEK_FIRST_MAX_MS : PEEK_MAX_MS;
    const delay = min + Math.random() * (max - min);
    peekScheduleRef.current = setTimeout(() => {
      peekCountRef.current += 1;
      const edges: Edge[] = ["left", "right", "bottom"];
      const edge = edges[Math.floor(Math.random() * edges.length)];
      const emoji = MONKEY_EMOJIS[Math.floor(Math.random() * MONKEY_EMOJIS.length)];
      const pos = 20 + Math.random() * 55;
      setPeek({ id: ++peekIdRef.current, edge, emoji, pos });
      setFound(false);
      if (peekHideRef.current) clearTimeout(peekHideRef.current);
      peekHideRef.current = setTimeout(() => {
        setPeek(null);
        schedulePeek();
      }, PEEK_VISIBLE_MS);
    }, delay);
  }, []);

  useEffect(() => {
    schedulePeek();

    function onKonami(e: KeyboardEvent) {
      konamiRef.current = [...konamiRef.current, e.key].slice(-KONAMI.length);
      if (konamiRef.current.length === KONAMI.length &&
          konamiRef.current.every((k, i) => k === KONAMI[i])) {
        konamiRef.current = [];
        const drops: RainDrop[] = Array.from({ length: 24 }, () => ({
          id: ++rainIdRef.current,
          emoji: MONKEY_EMOJIS[Math.floor(Math.random() * MONKEY_EMOJIS.length)],
          x: Math.random() * 100,
          delay: Math.random() * 1.4,
          duration: 2.2 + Math.random() * 1.8,
          size: 1.4 + Math.random() * 1.6,
        }));
        setRain(drops);
        setTimeout(() => setRain([]), 5500);
      }
    }
    window.addEventListener("keydown", onKonami);

    return () => {
      if (peekScheduleRef.current) clearTimeout(peekScheduleRef.current);
      if (peekHideRef.current) clearTimeout(peekHideRef.current);
      window.removeEventListener("keydown", onKonami);
    };
  }, [schedulePeek]);

  function handlePeekClick() {
    setFound(true);
    if (peekHideRef.current) clearTimeout(peekHideRef.current);
    peekHideRef.current = setTimeout(() => {
      setPeek(null);
      schedulePeek();
    }, 1600);
  }

  function peekStyle(m: PeekMonkey): React.CSSProperties {
    const base: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
      cursor: "pointer",
      fontSize: "2.6rem",
      lineHeight: 1,
      userSelect: "none",
      filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.6))",
    };
    if (m.edge === "left") {
      return { ...base, left: 0, top: `${m.pos}%`, animation: `gbPeekFromLeft ${PEEK_VISIBLE_MS}ms cubic-bezier(0.22,1,0.36,1) forwards` };
    }
    if (m.edge === "right") {
      return { ...base, right: 0, top: `${m.pos}%`, animation: `gbPeekFromRight ${PEEK_VISIBLE_MS}ms cubic-bezier(0.22,1,0.36,1) forwards` };
    }
    return { ...base, bottom: 0, left: `${m.pos}%`, animation: `gbPeekFromBottom ${PEEK_VISIBLE_MS}ms cubic-bezier(0.22,1,0.36,1) forwards` };
  }

  return (
    <>
      {/* #1 Peek-a-boo */}
      {peek && (
        <div
          key={peek.id}
          onClick={handlePeekClick}
          aria-label="A mysterious monkey is peeking"
          style={peekStyle(peek)}
        >
          {peek.emoji}
        </div>
      )}

      {/* "You found me!" toast */}
      {found && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10000,
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: 12,
            padding: "12px 20px",
            color: "#a5b4fc",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            fontWeight: 700,
            boxShadow: "0 0 32px rgba(99,102,241,0.35)",
            animation: "gbFoundFade 1.6s ease forwards",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          You found me! 🎉
        </div>
      )}

      {/* #2 Konami rain */}
      {rain.map((d) => (
        <div
          key={d.id}
          style={{
            position: "fixed",
            top: 0,
            left: `${d.x}%`,
            zIndex: 9998,
            fontSize: `${d.size}rem`,
            animation: `gbMonkeyRain ${d.duration}s ${d.delay}s ease-in forwards`,
            pointerEvents: "none",
            userSelect: "none",
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
          }}
        >
          {d.emoji}
        </div>
      ))}
    </>
  );
}
