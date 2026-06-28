"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const W = 800;
const H = 500;
const PADDLE_W = 10;
const PADDLE_H = 80;
const BALL_R = 6;
const PADDLE_SPEED = 6;
const WIN_SCORE = 7;

interface Props {
  onScore?: (score: number) => void;
}

interface State {
  playerY: number;
  botY: number;
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  playerScore: number;
  botScore: number;
  running: boolean;
  keys: { up: boolean; down: boolean };
  mouseY: number;
  touchY: number;
}

function initialState(): State {
  return {
    playerY: H / 2 - PADDLE_H / 2,
    botY: H / 2 - PADDLE_H / 2,
    ballX: W / 2,
    ballY: H / 2,
    ballVX: 4.5,
    ballVY: 2,
    playerScore: 0,
    botScore: 0,
    running: false,
    keys: { up: false, down: false },
    mouseY: -1,
    touchY: -1,
  };
}

function launchBall(s: State, dir: 1 | -1) {
  const angle = (Math.random() * 0.6 - 0.3);
  const speed = 4.5;
  s.ballX = W / 2;
  s.ballY = H / 2 + (Math.random() * 80 - 40);
  s.ballVX = dir * Math.cos(angle) * speed;
  s.ballVY = Math.sin(angle) * speed;
}

export default function PongGame({ onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<State>(initialState());
  const rafRef = useRef<number | null>(null);
  const scaleRef = useRef(1);

  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState({ player: 0, bot: 0 });
  const [winner, setWinner] = useState<"player" | "bot" | null>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        scaleRef.current = Math.min(1, containerRef.current.clientWidth / W);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    // Background
    ctx.fillStyle = "#020a14";
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Score text
    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(129,140,248,0.2)";
    ctx.fillText(String(s.playerScore), W / 2 - 70, 56);
    ctx.fillStyle = "rgba(248,113,113,0.2)";
    ctx.fillText(String(s.botScore), W / 2 + 70, 56);

    // Player paddle
    ctx.shadowColor = "#6366f1";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#818cf8";
    roundRect(ctx, 14, s.playerY, PADDLE_W, PADDLE_H, 5);
    ctx.fill();

    // Bot paddle
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#f87171";
    roundRect(ctx, W - 14 - PADDLE_W, s.botY, PADDLE_W, PADDLE_H, 5);
    ctx.fill();

    // Ball
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }, []);

  const end = useCallback((w: "player" | "bot", s: State) => {
    s.running = false;
    setGameState("over");
    setWinner(w);
    onScore?.(s.playerScore);
  }, [onScore]);

  const update = useCallback(() => {
    const s = stateRef.current;

    // Player — keyboard
    if (s.keys.up) s.playerY = Math.max(0, s.playerY - PADDLE_SPEED);
    if (s.keys.down) s.playerY = Math.min(H - PADDLE_H, s.playerY + PADDLE_SPEED);

    // Player — mouse
    if (s.mouseY >= 0) {
      const t = s.mouseY - PADDLE_H / 2;
      s.playerY += (t - s.playerY) * 0.2;
      s.playerY = Math.max(0, Math.min(H - PADDLE_H, s.playerY));
    }

    // Player — touch
    if (s.touchY >= 0) {
      const t = s.touchY - PADDLE_H / 2;
      s.playerY += (t - s.playerY) * 0.22;
      s.playerY = Math.max(0, Math.min(H - PADDLE_H, s.playerY));
    }

    // Bot AI — imperfect tracking, only reacts when ball comes toward it
    if (s.ballVX > 0) {
      const botCenter = s.botY + PADDLE_H / 2;
      const diff = s.ballY - botCenter;
      // Bot speed scales with ball speed so it stays competitive but beatable
      const botSpeed = Math.min(4.8, Math.abs(s.ballVX) * 0.88);
      s.botY += Math.min(Math.abs(diff), botSpeed) * Math.sign(diff);
      s.botY = Math.max(0, Math.min(H - PADDLE_H, s.botY));
    }

    // Ball move
    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    // Top / bottom wall
    if (s.ballY - BALL_R <= 0) { s.ballY = BALL_R; s.ballVY = Math.abs(s.ballVY); }
    if (s.ballY + BALL_R >= H) { s.ballY = H - BALL_R; s.ballVY = -Math.abs(s.ballVY); }

    // Player paddle hit
    const px = 14 + PADDLE_W;
    if (s.ballVX < 0 && s.ballX - BALL_R <= px && s.ballX - BALL_R >= px - 6 &&
      s.ballY + BALL_R >= s.playerY && s.ballY - BALL_R <= s.playerY + PADDLE_H) {
      s.ballX = px + BALL_R;
      const rel = (s.ballY - (s.playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const spd = Math.min(Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2) * 1.04, 12);
      const angle = rel * 1.1;
      s.ballVX = Math.abs(Math.cos(angle) * spd);
      s.ballVY = Math.sin(angle) * spd;
    }

    // Bot paddle hit
    const bx = W - 14 - PADDLE_W;
    if (s.ballVX > 0 && s.ballX + BALL_R >= bx && s.ballX + BALL_R <= bx + 6 &&
      s.ballY + BALL_R >= s.botY && s.ballY - BALL_R <= s.botY + PADDLE_H) {
      s.ballX = bx - BALL_R;
      const rel = (s.ballY - (s.botY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const spd = Math.min(Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2) * 1.04, 12);
      const angle = rel * 1.1;
      s.ballVX = -Math.abs(Math.cos(angle) * spd);
      s.ballVY = Math.sin(angle) * spd;
    }

    // Scoring
    if (s.ballX + BALL_R < 0) {
      s.botScore += 1;
      if (s.botScore >= WIN_SCORE) { setScore({ player: s.playerScore, bot: s.botScore }); end("bot", s); return; }
      setScore({ player: s.playerScore, bot: s.botScore });
      launchBall(s, 1);
    }
    if (s.ballX - BALL_R > W) {
      s.playerScore += 1;
      if (s.playerScore >= WIN_SCORE) { setScore({ player: s.playerScore, bot: s.botScore }); end("player", s); return; }
      setScore({ player: s.playerScore, bot: s.botScore });
      launchBall(s, -1);
    }
  }, [end]);

  const loop = useCallback(() => {
    if (!stateRef.current.running) return;
    update();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  const startGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const s = initialState();
    s.running = true;
    launchBall(s, 1);
    stateRef.current = s;
    setScore({ player: 0, bot: 0 });
    setWinner(null);
    setGameState("playing");
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // Keyboard
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) { e.preventDefault(); stateRef.current.keys.up = true; }
      if (["ArrowDown", "s", "S"].includes(e.key)) { e.preventDefault(); stateRef.current.keys.down = true; }
    };
    const up = (e: KeyboardEvent) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) stateRef.current.keys.up = false;
      if (["ArrowDown", "s", "S"].includes(e.key)) stateRef.current.keys.down = false;
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stateRef.current.running = false;
  }, []);

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    stateRef.current.mouseY = (e.clientY - rect.top) / scaleRef.current;
    stateRef.current.keys.up = false;
    stateRef.current.keys.down = false;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = scaleRef.current;
    const tx = (touch.clientX - rect.left) / scale;
    if (tx < W / 2) stateRef.current.touchY = (touch.clientY - rect.top) / scale;
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Scoreboard */}
      <div className="flex items-center gap-8 text-sm font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-8 rounded-sm inline-block" style={{ background: "#818cf8" }} />
          <div>
            <div style={{ color: "#818cf8", fontSize: "0.7rem" }}>YOU</div>
            <div className="font-black text-lg" style={{ color: "#e2e8f0", lineHeight: 1 }}>{score.player}</div>
          </div>
        </div>
        <div className="text-xs" style={{ color: "#334155" }}>FIRST TO {WIN_SCORE}</div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div style={{ color: "#f87171", fontSize: "0.7rem" }}>BOT</div>
            <div className="font-black text-lg" style={{ color: "#e2e8f0", lineHeight: 1 }}>{score.bot}</div>
          </div>
          <span className="w-2.5 h-8 rounded-sm inline-block" style={{ background: "#f87171" }} />
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative w-full" style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onMouseMove={onMouseMove}
          onTouchMove={onTouchMove}
          onTouchEnd={() => { stateRef.current.touchY = -1; }}
          style={{ width: "100%", height: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", display: "block", touchAction: "none", cursor: "none" }}
        />

        {/* Idle overlay */}
        {gameState === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-xl" style={{ background: "rgba(2,10,20,0.92)", backdropFilter: "blur(4px)" }}>
            <div style={{ fontSize: "3.5rem" }}>🏓</div>
            <div className="text-center">
              <h3 className="text-2xl font-black mb-1" style={{ color: "#e2e8f0" }}>Pong</h3>
              <p className="text-xs" style={{ color: "#475569" }}>The game that started it all</p>
            </div>
            <div className="text-xs text-center space-y-1 font-mono" style={{ color: "#334155" }}>
              <p><span style={{ color: "#818cf8" }}>Mouse</span> or <span style={{ color: "#818cf8" }}>W / S</span> — move paddle</p>
              <p className="sm:hidden"><span style={{ color: "#818cf8" }}>Touch left side</span> — move paddle</p>
            </div>
            <button
              onClick={startGame}
              className="px-10 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", boxShadow: "0 0 24px rgba(99,102,241,0.4)" }}
            >
              Start Game
            </button>
          </div>
        )}

        {/* Game over overlay */}
        {gameState === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-xl" style={{ background: "rgba(2,10,20,0.94)", backdropFilter: "blur(4px)" }}>
            <div style={{ fontSize: "3rem" }}>{winner === "player" ? "🎉" : "🤖"}</div>
            <div className="text-center">
              <h3 className="text-2xl font-black mb-1" style={{ color: winner === "player" ? "#818cf8" : "#f87171" }}>
                {winner === "player" ? "You Win!" : "Bot Wins!"}
              </h3>
              <p className="text-sm font-mono" style={{ color: "#475569" }}>
                {score.player} — {score.bot}
              </p>
            </div>
            <button
              onClick={startGame}
              className="px-10 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", boxShadow: "0 0 24px rgba(99,102,241,0.4)" }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      <p className="text-xs font-mono" style={{ color: "#1e293b" }}>
        <span className="hidden sm:inline">Mouse or W/S to move · </span>First to {WIN_SCORE} wins
      </p>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
