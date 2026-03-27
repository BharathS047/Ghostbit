"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const W = 740;
const H = 280;
const GROUND_Y = 220;
const RUNNER_X = 80;
const RUNNER_W = 24;
const RUNNER_H = 36;
const GRAVITY = 0.55;
const JUMP_VY = -13;
const OBSTACLE_W = 18;
const OBSTACLE_MIN_H = 28;
const OBSTACLE_MAX_H = 52;
const INITIAL_SPEED = 5;
const SPEED_INC_INTERVAL = 300; // frames between speed bumps
const SPEED_INC_AMOUNT = 0.3;
const MAX_JUMPS = 2; // double-jump

interface Obstacle {
  x: number;
  h: number;
  y: number; // top of obstacle (GROUND_Y - h for ground, custom for flying)
  flying: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Props {
  onScore?: (score: number) => void;
}

export default function PixelRunner({ onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speedLevel, setSpeedLevel] = useState(1);

  // Game state in refs so the RAF loop reads current values
  const vy = useRef(0);
  const runnerY = useRef(GROUND_Y - RUNNER_H);
  const onGround = useRef(true);
  const jumpCount = useRef(0);
  const obstacles = useRef<Obstacle[]>([]);
  const particles = useRef<Particle[]>([]);
  const speed = useRef(INITIAL_SPEED);
  const frame = useRef(0);
  const scoreRef = useRef(0);
  const alive = useRef(false);
  const nextObstacleIn = useRef(80);
  const legPhase = useRef(0);
  const milestoneFlash = useRef(0);
  const speedLevelRef = useRef(1);
  const highScoreRef = useRef(0);

  // ── Particles ──
  const emitParticles = useCallback(
    (x: number, y: number, count: number, color: string, spread = 2, sizeRange = [1, 3] as [number, number]) => {
      for (let i = 0; i < count; i++) {
        particles.current.push({
          x,
          y,
          vx: (Math.random() - 0.7) * spread,
          vy: (Math.random() - 0.5) * spread,
          life: 20 + Math.random() * 20,
          maxLife: 20 + Math.random() * 20,
          color,
          size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
        });
      }
    },
    []
  );

  const spawnObstacle = useCallback(() => {
    const isFlying = Math.random() < 0.2 && frame.current > 300; // flying after ~50s
    if (isFlying) {
      const h = 14 + Math.random() * 10;
      const flyY = GROUND_Y - RUNNER_H - 20 - Math.random() * 30; // above runner head
      obstacles.current.push({ x: W + OBSTACLE_W, h, y: flyY, flying: true });
    } else {
      const h = OBSTACLE_MIN_H + Math.random() * (OBSTACLE_MAX_H - OBSTACLE_MIN_H);
      obstacles.current.push({ x: W + OBSTACLE_W, h, y: GROUND_Y - h, flying: false });
    }
    nextObstacleIn.current = 60 + Math.floor(Math.random() * 80);
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#0f0e1a";
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137 + frame.current * 0.2) % W;
      const sy = (i * 53) % (GROUND_Y - 30);
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Ground line
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#4ade80";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ground dashes (speed lines)
    ctx.strokeStyle = "rgba(74,222,128,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 18]);
    ctx.lineDashOffset = -(frame.current * speed.current * 0.5) % 30;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 6);
    ctx.lineTo(W, GROUND_Y + 6);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Particles ──
    for (const p of particles.current) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // ── Obstacles ──
    for (const obs of obstacles.current) {
      if (obs.flying) {
        // Flying obstacle — pulsing amber
        ctx.fillStyle = "#f59e0b";
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 10;
        ctx.fillRect(obs.x, obs.y, OBSTACLE_W, obs.h);
        // Warning chevrons
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(obs.x + 3, obs.y + 2, 4, 4);
        ctx.fillRect(obs.x + OBSTACLE_W - 7, obs.y + 2, 4, 4);
      } else {
        ctx.fillStyle = "#f87171";
        ctx.shadowColor = "#f87171";
        ctx.shadowBlur = 8;
        ctx.fillRect(obs.x, obs.y, OBSTACLE_W, obs.h);
        // Top cap
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(obs.x - 2, obs.y, OBSTACLE_W + 4, 4);
      }
      ctx.shadowBlur = 0;
    }

    // ── Runner ──
    const ry = runnerY.current;
    const isRunning = onGround.current;
    legPhase.current = isRunning ? frame.current % 16 : 8;
    const leg = legPhase.current < 8 ? 1 : -1;

    // Body
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 10;
    // Head
    ctx.fillRect(RUNNER_X, ry, RUNNER_W, 14);
    // Torso
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(RUNNER_X + 2, ry + 14, RUNNER_W - 4, 14);
    // Legs
    ctx.fillStyle = "#d97706";
    ctx.save();
    ctx.translate(RUNNER_X + 6, ry + 28);
    ctx.rotate(leg * 0.35);
    ctx.fillRect(-3, 0, 7, 12);
    ctx.restore();
    ctx.save();
    ctx.translate(RUNNER_X + 18, ry + 28);
    ctx.rotate(-leg * 0.35);
    ctx.fillRect(-3, 0, 7, 12);
    ctx.restore();
    ctx.shadowBlur = 0;

    // Eye
    ctx.fillStyle = "#0f0e1a";
    ctx.fillRect(RUNNER_X + 16, ry + 4, 4, 4);

    // Double-jump indicator (small dots under runner)
    if (!onGround.current && jumpCount.current < MAX_JUMPS) {
      ctx.fillStyle = "rgba(74,222,128,0.6)";
      for (let i = jumpCount.current; i < MAX_JUMPS; i++) {
        ctx.beginPath();
        ctx.arc(RUNNER_X + RUNNER_W / 2 + (i - 0.5) * 8, ry + RUNNER_H + 6, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Score (on canvas) ──
    const flashActive = milestoneFlash.current > 0;
    const scoreColor = flashActive ? "#fbbf24" : "#a5b4fc";
    const scoreGlow = flashActive ? "#fbbf24" : "#a5b4fc";
    ctx.fillStyle = scoreColor;
    ctx.font = flashActive ? "bold 16px monospace" : "bold 14px monospace";
    ctx.shadowColor = scoreGlow;
    ctx.shadowBlur = flashActive ? 14 : 6;
    ctx.fillText(`SCORE: ${scoreRef.current}`, 16, 24);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#334155";
    ctx.font = "12px monospace";
    ctx.fillText(`BEST: ${highScoreRef.current}`, 16, 42);

    // Speed level
    ctx.fillStyle = "#4ade80";
    ctx.font = "11px monospace";
    ctx.shadowColor = "#4ade80";
    ctx.shadowBlur = 4;
    ctx.fillText(`SPD: ${speedLevelRef.current}`, W - 70, 24);
    ctx.shadowBlur = 0;
  }, []);

  const loop = useCallback(() => {
    if (!alive.current) return;

    frame.current += 1;
    scoreRef.current = Math.floor(frame.current / 6);

    // Milestone flash
    if (milestoneFlash.current > 0) milestoneFlash.current -= 1;
    const sc = scoreRef.current;
    if (sc > 0 && sc % 50 === 0 && milestoneFlash.current === 0) {
      milestoneFlash.current = 30;
    }

    // Speed up over time
    if (frame.current % SPEED_INC_INTERVAL === 0) {
      speed.current += SPEED_INC_AMOUNT;
      speedLevelRef.current += 1;
      setSpeedLevel(speedLevelRef.current);
    }

    // Gravity
    vy.current += GRAVITY;
    runnerY.current += vy.current;

    // Land on ground
    if (runnerY.current >= GROUND_Y - RUNNER_H) {
      runnerY.current = GROUND_Y - RUNNER_H;
      vy.current = 0;
      onGround.current = true;
      jumpCount.current = 0;
    }

    // Running particles (trail)
    if (onGround.current && frame.current % 3 === 0) {
      emitParticles(RUNNER_X - 2, GROUND_Y - 4, 1, "rgba(74,222,128,0.5)", 1.5, [1, 2]);
    }

    // Move + spawn obstacles
    nextObstacleIn.current -= 1;
    if (nextObstacleIn.current <= 0) spawnObstacle();

    for (const obs of obstacles.current) {
      obs.x -= speed.current;
      // Flying obstacles bob gently
      if (obs.flying) {
        obs.y += Math.sin(frame.current * 0.08 + obs.x * 0.01) * 0.3;
      }
    }
    obstacles.current = obstacles.current.filter((o) => o.x > -OBSTACLE_W - 10);

    // Update particles
    for (const p of particles.current) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
    }
    particles.current = particles.current.filter((p) => p.life > 0);

    // Collision
    const rx1 = RUNNER_X + 3;
    const rx2 = RUNNER_X + RUNNER_W - 3;
    const ry1 = runnerY.current + 2;
    const ry2 = runnerY.current + RUNNER_H - 2;
    for (const obs of obstacles.current) {
      const ox1 = obs.x + 2;
      const ox2 = obs.x + OBSTACLE_W - 2;
      const oy1 = obs.y;
      const oy2 = obs.y + obs.h;
      if (rx2 > ox1 && rx1 < ox2 && ry2 > oy1 && ry1 < oy2) {
        alive.current = false;
        const finalScore = scoreRef.current;

        // Death particles
        emitParticles(RUNNER_X + RUNNER_W / 2, runnerY.current + RUNNER_H / 2, 20, "#f87171", 4, [2, 4]);
        emitParticles(RUNNER_X + RUNNER_W / 2, runnerY.current + RUNNER_H / 2, 10, "#fbbf24", 3, [1, 3]);

        setDisplayScore(finalScore);
        const best = Math.max(highScoreRef.current, finalScore);
        highScoreRef.current = best;
        setHighScore(best);
        onScore?.(best);
        setGameState("over");
        draw();
        return;
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, spawnObstacle, emitParticles, onScore]);

  const startGame = useCallback(() => {
    // Reset
    vy.current = 0;
    runnerY.current = GROUND_Y - RUNNER_H;
    onGround.current = true;
    jumpCount.current = 0;
    obstacles.current = [];
    particles.current = [];
    speed.current = INITIAL_SPEED;
    frame.current = 0;
    scoreRef.current = 0;
    nextObstacleIn.current = 80;
    legPhase.current = 0;
    milestoneFlash.current = 0;
    speedLevelRef.current = 1;
    alive.current = true;

    setDisplayScore(0);
    setSpeedLevel(1);
    setGameState("playing");

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const jump = useCallback(() => {
    if (jumpCount.current < MAX_JUMPS) {
      vy.current = JUMP_VY;
      onGround.current = false;
      jumpCount.current += 1;

      // Jump particles
      const jumpColor = jumpCount.current === 1 ? "#4ade80" : "#a5b4fc";
      emitParticles(RUNNER_X + RUNNER_W / 2, runnerY.current + RUNNER_H, 8, jumpColor, 3, [1, 3]);
    }
  }, [emitParticles]);

  // Input handling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState === "idle" || gameState === "over") startGame();
        else jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState, startGame, jump]);

  // Draw idle/over screen
  useEffect(() => {
    if (gameState !== "playing") {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0f0e1a";
      ctx.fillRect(0, 0, W, H);

      // Ground
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#4ade80";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(W, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Runner (idle pose)
      ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 10;
      ctx.fillRect(RUNNER_X, GROUND_Y - RUNNER_H, RUNNER_W, 14);
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(RUNNER_X + 2, GROUND_Y - RUNNER_H + 14, RUNNER_W - 4, 14);
      ctx.fillStyle = "#d97706";
      ctx.fillRect(RUNNER_X + 4, GROUND_Y - 10, 7, 10);
      ctx.fillRect(RUNNER_X + 14, GROUND_Y - 10, 7, 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0f0e1a";
      ctx.fillRect(RUNNER_X + 16, GROUND_Y - RUNNER_H + 4, 4, 4);

      // Death particles still visible
      for (const p of particles.current) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      if (gameState === "over") {
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#f87171";
        ctx.shadowBlur = 12;
        ctx.fillText("GAME OVER", W / 2, H / 2 - 16);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#a5b4fc";
        ctx.font = "14px monospace";
        ctx.fillText(`Score: ${displayScore}   Best: ${highScore}`, W / 2, H / 2 + 12);
        ctx.fillStyle = "#4ade80";
        ctx.font = "13px monospace";
        ctx.fillText("Press SPACE or tap to restart", W / 2, H / 2 + 38);
        ctx.textAlign = "left";
      } else {
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#6366f1";
        ctx.shadowBlur = 10;
        ctx.fillText("PIXEL RUNNER", W / 2, H / 2 - 14);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#4ade80";
        ctx.font = "14px monospace";
        ctx.fillText("Press SPACE or tap to start", W / 2, H / 2 + 14);
        ctx.fillStyle = "#475569";
        ctx.font = "11px monospace";
        ctx.fillText("Double-tap for double-jump!", W / 2, H / 2 + 34);
        ctx.textAlign = "left";
      }
    }
  }, [gameState, displayScore, highScore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      alive.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score bar */}
      <div
        className="flex items-center justify-between w-full"
        style={{ maxWidth: W }}
      >
        <div className="flex gap-4 text-xs font-mono" style={{ color: "#94a3b8" }}>
          <span>
            Score: <span style={{ color: "#a5b4fc" }}>{displayScore}</span>
          </span>
          <span>
            Best: <span style={{ color: "#eab308" }}>{highScore}</span>
          </span>
        </div>
        {gameState === "playing" && (
          <div className="flex gap-3 text-xs font-mono" style={{ color: "#475569" }}>
            <span>
              Speed: <span style={{ color: "#4ade80" }}>{speedLevel}</span>
            </span>
            <span>SPACE to jump</span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: "12px",
          border: "1px solid rgba(74,222,128,0.2)",
          boxShadow: "0 0 32px rgba(74,222,128,0.08)",
          cursor: "pointer",
          maxWidth: "100%",
        }}
        onClick={() => {
          if (gameState === "idle" || gameState === "over") startGame();
          else jump();
        }}
      />

      {/* Mobile jump button */}
      <button
        className="sm:hidden px-8 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, #4ade80, #16a34a)",
          color: "#fff",
          boxShadow: "0 0 20px rgba(74,222,128,0.25)",
          border: "none",
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          if (gameState === "idle" || gameState === "over") startGame();
          else jump();
        }}
      >
        JUMP
      </button>

      <p className="text-xs font-mono" style={{ color: "#334155" }}>
        SPACE / TAP to jump &nbsp;·&nbsp; double-tap for double-jump
        &nbsp;·&nbsp; avoid obstacles
      </p>
    </div>
  );
}
