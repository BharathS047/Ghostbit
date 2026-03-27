"use client";

import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

const TicTacToe = lazy(() => import("../../components/games/TicTacToe"));
const SnakeGame = lazy(() => import("../../components/games/SnakeGame"));
const MemoryMatch = lazy(() => import("../../components/games/MemoryMatch"));
const PixelRunner = lazy(() => import("../../components/games/PixelRunner"));

import HeroSection from "../../components/HeroSection";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ── Game catalogue ── */
interface GameDef {
  id: string;
  title: string;
  desc: string;
  thumbnail: string;
  gradient: string;
  badgeColor: string;
  badgeBg: string;
  badgeLabel: string;
  category: string;
  players: string;
}

const GAMES: GameDef[] = [
  {
    id: "tictactoe",
    title: "Tic Tac Toe",
    desc: "Classic 3x3 strategy. Play against a smart AI opponent.",
    thumbnail: "/images/thumb-tictactoe.svg",
    gradient: "linear-gradient(135deg, #1e3a5f, #0f172a)",
    badgeColor: "#60a5fa",
    badgeBg: "rgba(96,165,250,0.1)",
    badgeLabel: "Strategy",
    category: "strategy",
    players: "vs AI",
  },
  {
    id: "snake",
    title: "Snake",
    desc: "Eat, grow, survive. How long can you last?",
    thumbnail: "/images/thumb-snake.svg",
    gradient: "linear-gradient(135deg, #14532d, #0f172a)",
    badgeColor: "#4ade80",
    badgeBg: "rgba(74,222,128,0.1)",
    badgeLabel: "Arcade",
    category: "arcade",
    players: "Solo",
  },
  {
    id: "memory",
    title: "Memory Match",
    desc: "Flip cards and find matching pairs. Train your memory.",
    thumbnail: "/images/thumb-memory.svg",
    gradient: "linear-gradient(135deg, #4c1d95, #0f172a)",
    badgeColor: "#c084fc",
    badgeBg: "rgba(192,132,252,0.1)",
    badgeLabel: "Puzzle",
    category: "puzzle",
    players: "Solo",
  },
  {
    id: "pixelrunner",
    title: "Pixel Runner",
    desc: "Endless runner through a neon cityscape. How far can you go?",
    thumbnail: "/images/thumb-pixel-runner.svg",
    gradient: "linear-gradient(135deg, #713f12, #0f172a)",
    badgeColor: "#fbbf24",
    badgeBg: "rgba(251,191,36,0.1)",
    badgeLabel: "Arcade",
    category: "arcade",
    players: "Solo",
  },
  {
    id: "coming2",
    title: "Battleships",
    desc: "Naval warfare on a grid. Multiplayer coming soon!",
    thumbnail: "/images/thumb-battleships.svg",
    gradient: "linear-gradient(135deg, #164e63, #0f172a)",
    badgeColor: "#22d3ee",
    badgeBg: "rgba(34,211,238,0.1)",
    badgeLabel: "Coming Soon",
    category: "strategy",
    players: "1v1",
  },
  {
    id: "coming3",
    title: "Word Scramble",
    desc: "Unscramble letters against the clock. Coming soon!",
    thumbnail: "/images/thumb-word-scramble.svg",
    gradient: "linear-gradient(135deg, #831843, #0f172a)",
    badgeColor: "#f472b6",
    badgeBg: "rgba(244,114,182,0.1)",
    badgeLabel: "Coming Soon",
    category: "puzzle",
    players: "Solo",
  },
];

const CATEGORIES = ["all", "arcade", "strategy", "puzzle"];

/* ── Main page ── */
export default function PlayPage() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [view, setView] = useState<"games" | "leaderboard">("games");
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect approved/admin users away
  useEffect(() => {
    if (loading) return;
    if (user?.role === "approved") {
      router.replace("/dashboard");
      return;
    }
    if (user?.role === "admin") {
      router.replace("/admin");
      return;
    }
  }, [user, loading, router]);

  function openGame(id: string) {
    const game = GAMES.find((g) => g.id === id);
    if (game?.badgeLabel === "Coming Soon") return;
    setActiveGame(id);
  }

  const filtered = GAMES.filter((g) => {
    if (category !== "all" && g.category !== category) return false;
    if (searchQuery && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) return null;

  // Guests only see the hero landing page
  if (!user) {
    return <HeroSection />;
  }

  async function handleScore(game: string, score: number) {
    if (!token) return;
    await fetch(`${API}/scores`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ game, score }),
    }).catch(() => { });
  }

  // If a game is open, show the game overlay
  if (activeGame) {
    return (
      <GameOverlay
        gameId={activeGame}
        onClose={() => setActiveGame(null)}
        onScore={(score) => handleScore(activeGame, score)}
      />
    );
  }

  return (
    <div style={{ background: "#030712", minHeight: "100vh" }}>
      {/* ── Navigation bar ── */}
      <nav className="portal-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow: "0 0 18px rgba(99,102,241,0.35)",
              }}
            >
              <span className="text-xs font-black text-white">GP</span>
            </div>
            <span className="font-bold tracking-tight text-base" style={{ color: "#e2e8f0" }}>
              GhostPlay
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            {(["Games", "Leaderboard"] as const).map((item) => {
              const isActive = (item === "Games" && view === "games") || (item === "Leaderboard" && view === "leaderboard");
              return (
                <button
                  key={item}
                  onClick={() => setView(item === "Games" ? "games" : "leaderboard")}
                  className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  style={{
                    color: isActive ? "#a5b4fc" : "#64748b",
                    background: isActive ? "rgba(99,102,241,0.08)" : "transparent",
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
                  >
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>
                    {user.username}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    color: "#94a3b8",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  color: "#fff",
                  boxShadow: "0 0 14px rgba(99,102,241,0.25)",
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* Leaderboard view */}
          {view === "leaderboard" && (
            <LeaderboardView token={token} />
          )}

          {/* Games view */}
          {view === "games" && (<>
            {/* Hero banner */}
            <div className="portal-hero mb-8 portal-animate">
              <div className="relative z-10">
                <div
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,0.25)",
                  }}
                >
                  NEW GAMES WEEKLY
                </div>
                <h1
                  className="text-3xl sm:text-4xl font-black mb-2"
                  style={{ color: "#f1f5f9", lineHeight: 1.15 }}
                >
                  Play. Compete. <br />
                  <span style={{ color: "#a5b4fc" }}>Level Up.</span>
                </h1>
                <p className="text-sm sm:text-base max-w-md" style={{ color: "#94a3b8" }}>
                  Free browser games you can jump into instantly. No downloads, no installs.
                </p>
              </div>

              {/* Decorative grid on the right */}
              <div
                className="absolute top-0 right-0 hidden sm:block pointer-events-none"
                style={{ width: "55%", height: "100%", zIndex: 2 }}
              >
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0 }}>
                  <defs>
                    <linearGradient id="heroGridFade" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="white" stopOpacity="0" />
                      <stop offset="35%" stopColor="white" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="white" stopOpacity="0.3" />
                    </linearGradient>
                    <mask id="heroGridMask">
                      <rect width="100%" height="100%" fill="url(#heroGridFade)" />
                    </mask>
                  </defs>
                  <g mask="url(#heroGridMask)">
                    {/* Vertical grid lines */}
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <line
                        key={`v${i}`}
                        x1={`${(i + 1) * 10}%`}
                        y1="0"
                        x2={`${(i + 1) * 10}%`}
                        y2="100%"
                        stroke="#6366f1"
                        strokeOpacity="0.12"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Horizontal grid lines */}
                    {[0, 1, 2, 3].map((i) => (
                      <line
                        key={`h${i}`}
                        x1="0"
                        y1={`${(i + 1) * 20}%`}
                        x2="100%"
                        y2={`${(i + 1) * 20}%`}
                        stroke="#6366f1"
                        strokeOpacity="0.12"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Intersection dots */}
                    {[20, 40, 60, 80].flatMap((y) =>
                      [20, 40, 60, 80].map((x) => (
                        <circle
                          key={`d${x}-${y}`}
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="2"
                          fill="#6366f1"
                          fillOpacity="0.35"
                        />
                      ))
                    )}
                    {/* Accent node — larger glow */}
                    <circle cx="60%" cy="40%" r="5" fill="#6366f1" fillOpacity="0.2" />
                    <circle cx="60%" cy="40%" r="12" fill="none" stroke="#6366f1" strokeOpacity="0.08" strokeWidth="1" />
                    {/* Crosshair */}
                    <line x1="37%" y1="60%" x2="43%" y2="60%" stroke="#818cf8" strokeOpacity="0.25" strokeWidth="1" />
                    <line x1="40%" y1="57%" x2="40%" y2="63%" stroke="#818cf8" strokeOpacity="0.25" strokeWidth="1" />
                    <circle cx="40%" cy="60%" r="4" fill="none" stroke="#818cf8" strokeOpacity="0.15" strokeWidth="1" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 portal-animate portal-animate-d1">
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 rounded-xl text-sm"
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e2e8f0",
                  outline: "none",
                }}
              />
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`category-pill ${category === cat ? "active" : ""}`}
                  >
                    {cat === "all" ? "All Games" : cat[0].toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Section label */}
            <div className="flex items-center gap-3 mb-4 portal-animate portal-animate-d2">
              <h2 className="text-lg font-bold" style={{ color: "#e2e8f0" }}>
                {category === "all" ? "All Games" : category[0].toUpperCase() + category.slice(1)}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#64748b" }}>
                {filtered.length} {filtered.length === 1 ? "game" : "games"}
              </span>
            </div>

            {/* Main layout — game grid + right sidebar */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">

              {/* Game cards grid */}
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((game, i) => (
                  <div
                    key={game.id}
                    className={`game-card portal-animate portal-animate-d${Math.min(i + 2, 6)}`}
                    onClick={() => openGame(game.id)}
                  >
                    <div className="game-card-thumb" style={{ background: game.gradient }}>
                      <img
                        src={game.thumbnail}
                        alt={game.title}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.9,
                        }}
                      />
                      {game.badgeLabel !== "Coming Soon" && (
                        <div className="game-play-btn">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}
                      {game.badgeLabel === "Coming Soon" && (
                        <div
                          className="absolute top-2 right-2 z-10 text-xs font-bold px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(0,0,0,0.6)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}
                        >
                          SOON
                        </div>
                      )}
                    </div>
                    <div className="game-card-body">
                      <p className="game-card-title">{game.title}</p>
                      <p className="game-card-desc">{game.desc}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="game-card-badge"
                          style={{ color: game.badgeColor, background: game.badgeBg, border: `1px solid ${game.badgeColor}22` }}
                        >
                          {game.badgeLabel}
                        </span>
                        <span className="text-xs font-mono" style={{ color: "#475569" }}>
                          {game.players}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right sidebar — same tile style as game cards */}
              <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">

                {/* Player info tile */}
                <div className="game-card portal-animate portal-animate-d2" style={{ cursor: "default" }}>
                  <div
                    className="game-card-thumb"
                    style={{ background: "linear-gradient(135deg, #1e1b4b, #0f0e2a)" }}
                  >
                    <div
                      style={{
                        zIndex: 2,
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.8rem",
                        fontWeight: 700,
                        color: "#fff",
                        boxShadow: "0 0 24px rgba(99,102,241,0.4)",
                      }}
                    >
                      {user.username[0].toUpperCase()}
                    </div>
                  </div>
                  <div className="game-card-body">
                    <p className="game-card-title">{user.username}</p>
                    <p className="game-card-desc">Free Player</p>
                    <div className="mt-3">
                      <div className="portal-stat">
                        <span className="portal-stat-label">Member Since</span>
                        <span className="portal-stat-value" style={{ color: "#94a3b8" }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Today"}
                        </span>
                      </div>
                      <div className="portal-stat">
                        <span className="portal-stat-label">Games Played</span>
                        <span className="portal-stat-value" style={{ color: "#a5b4fc" }}>0</span>
                      </div>
                      <div className="portal-stat">
                        <span className="portal-stat-label">Account Level</span>
                        <span className="portal-stat-value" style={{ color: "#4ade80" }}>1</span>
                      </div>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </>)}
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
              >
                <span className="text-[8px] font-black text-white">GP</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: "#475569" }}>
                GhostPlay
              </span>
            </div>
            <div className="flex gap-4 text-xs" style={{ color: "#334155" }}>
              <span>Terms</span>
              <span>Privacy</span>
              <span>Support</span>
            </div>
            <p className="text-xs" style={{ color: "#1e293b" }}>
              &copy; 2026 GhostPlay. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ── Game overlay (fullscreen game view) ── */
function GameOverlay({
  gameId,
  onClose,
  onScore,
}: {
  gameId: string;
  onClose: () => void;
  onScore: (score: number) => void;
}) {
  const game = GAMES.find((g) => g.id === gameId);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="game-overlay">
      <div className="game-overlay-header">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold" style={{ color: "#e2e8f0" }}>
            {game?.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="game-overlay-content">
        <Suspense
          fallback={
            <p className="text-sm font-mono" style={{ color: "#64748b" }}>
              Loading game...
            </p>
          }
        >
          {gameId === "tictactoe" && <TicTacToe onScore={onScore} />}
          {gameId === "snake" && <SnakeGame onScore={onScore} />}
          {gameId === "memory" && <MemoryMatch onScore={onScore} />}
          {gameId === "pixelrunner" && <PixelRunner onScore={onScore} />}
        </Suspense>
      </div>
      <p className="text-xs font-mono pb-4" style={{ color: "#334155" }}>
        Press ESC to close
      </p>
    </div>
  );
}

/* ── Leaderboard ── */
interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

const GAME_CONFIGS = {
  snake: { label: "Snake", unit: "pts", desc: "Highest single-run score" },
  tictactoe: { label: "Tic Tac Toe", unit: "wins", desc: "Total wins vs AI" },
  memory: { label: "Memory Match", unit: "moves", desc: "Fewest moves to complete" },
  pixelrunner: { label: "Pixel Runner", unit: "pts", desc: "Highest distance score" },
} as const;

type GameKey = keyof typeof GAME_CONFIGS;

function LeaderboardView({ token }: { token: string | null }) {
  const [game, setGame] = useState<GameKey>("snake");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!token) return;
    setFetching(true);
    fetch(`${API}/scores/${game}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setFetching(false));
  }, [game, token]);

  const cfg = GAME_CONFIGS[game];
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="portal-animate">
      {/* Header */}
      <div className="mb-8">
        <p className="section-label mb-3" style={{ color: "#64748b", fontSize: "11px", letterSpacing: "0.08em", fontFamily: "monospace", textTransform: "uppercase" }}>
          GhostPlay / Leaderboard
        </p>
        <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ color: "#e2e8f0" }}>
          Leaderboard
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>
          Top players across all games. Play to get on the board.
        </p>
      </div>

      {/* Game tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(Object.keys(GAME_CONFIGS) as GameKey[]).map((g) => {
          const c = GAME_CONFIGS[g];
          const active = g === game;
          return (
            <button
              key={g}
              onClick={() => setGame(g)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                color: active ? "#a5b4fc" : "#475569",
                border: active ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.06)",
                boxShadow: active ? "0 0 16px rgba(99,102,241,0.15)" : "none",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Leaderboard card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Card header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="font-bold text-sm" style={{ color: "#e2e8f0" }}>
              {cfg.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{cfg.desc}</p>
          </div>
          <span
            className="text-xs font-mono px-2.5 py-1 rounded-lg"
            style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            TOP 10
          </span>
        </div>

        {/* Entries */}
        {fetching ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-mono" style={{ color: "#334155" }}>Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-sm mb-1" style={{ color: "#475569" }}>No scores yet</p>
            <p className="text-xs" style={{ color: "#334155" }}>
              Be the first to play {cfg.label} and claim the top spot!
            </p>
          </div>
        ) : (
          <div>
            {entries.map((entry) => {
              return (
                <div
                  key={entry.rank}
                  className="flex items-center gap-4 px-6 py-4 transition-colors"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: entry.rank === 1 ? "rgba(234,179,8,0.04)" : "transparent",
                  }}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {entry.rank <= 3 ? (
                      <span className="text-lg leading-none">{medals[entry.rank - 1]}</span>
                    ) : (
                      <span className="text-xs font-mono font-bold" style={{ color: "#334155" }}>
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar + username */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{
                        background: entry.rank === 1
                          ? "linear-gradient(135deg, #eab308, #92400e)"
                          : entry.rank === 2
                            ? "linear-gradient(135deg, #94a3b8, #475569)"
                            : entry.rank === 3
                              ? "linear-gradient(135deg, #cd7c2f, #78350f)"
                              : "linear-gradient(135deg, #6366f1, #4f46e5)",
                        color: "#fff",
                      }}
                    >
                      {entry.username[0].toUpperCase()}
                    </div>
                    <span
                      className="font-semibold text-sm truncate"
                      style={{ color: entry.rank === 1 ? "#fde68a" : "#e2e8f0" }}
                    >
                      {entry.username}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <span
                      className="text-sm font-black font-mono"
                      style={{ color: entry.rank === 1 ? "#fbbf24" : "#a5b4fc" }}
                    >
                      {entry.score}
                    </span>
                    <span className="text-xs font-mono ml-1" style={{ color: "#334155" }}>
                      {cfg.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
