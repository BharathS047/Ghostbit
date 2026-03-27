"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const GRID = 20;
const CELL = 24;
const TICK_MS = 120;

type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

interface Props {
  onScore?: (score: number) => void;
}

export default function SnakeGame({ onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Dir>("RIGHT");
  const nextDirRef = useRef<Dir>("RIGHT");
  const foodRef = useRef<Point>(randomFood(snakeRef.current));
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const W = GRID * CELL;

    // Background
    ctx.fillStyle = "#0a0f1e";
    ctx.fillRect(0, 0, W, W);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, W);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(W, i * CELL);
      ctx.stroke();
    }

    // Snake
    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      const t = 1 - i / snake.length;
      const r = Math.round(99 + t * 50);
      const g = Math.round(102 + t * 150);
      const b = Math.round(241);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.fill();
    });

    // Food
    const f = foodRef.current;
    ctx.fillStyle = "#f87171";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  const gameOver = useCallback(() => {
    setGameState("over");
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setScore((s) => {
      setHighScore((h) => Math.max(h, s));
      onScore?.(s);
      return s;
    });
  }, [onScore]);

  const tick = useCallback(() => {
    dirRef.current = nextDirRef.current;
    const snake = [...snakeRef.current];
    const head = { ...snake[0] };

    switch (dirRef.current) {
      case "UP": head.y--; break;
      case "DOWN": head.y++; break;
      case "LEFT": head.x--; break;
      case "RIGHT": head.x++; break;
    }

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      gameOver();
      return;
    }
    // Self collision
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);

    // Eat food
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      foodRef.current = randomFood(snake);
      setScore((s) => s + 1);
    } else {
      snake.pop();
    }

    snakeRef.current = snake;
    draw();
  }, [draw, gameOver]);

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = "RIGHT";
    nextDirRef.current = "RIGHT";
    foodRef.current = randomFood(snakeRef.current);
    setScore(0);
    setGameState("playing");
    draw();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, TICK_MS);
  }, [draw, tick]);

  // Keyboard controls
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (gameState !== "playing") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      const d = dirRef.current;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          if (d !== "DOWN") nextDirRef.current = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          if (d !== "UP") nextDirRef.current = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          if (d !== "RIGHT") nextDirRef.current = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          if (d !== "LEFT") nextDirRef.current = "RIGHT";
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  // Initial draw
  useEffect(() => {
    draw();
  }, [draw]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const W = GRID * CELL;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score bar */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: W }}>
        <div className="flex gap-4 text-xs font-mono" style={{ color: "#94a3b8" }}>
          <span>
            Score: <span style={{ color: "#60a5fa" }}>{score}</span>
          </span>
          <span>
            Best: <span style={{ color: "#eab308" }}>{highScore}</span>
          </span>
        </div>
        {gameState === "playing" && (
          <div className="flex gap-1 text-xs font-mono" style={{ color: "#475569" }}>
            <span>WASD / Arrows</span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="relative" style={{ width: W, height: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={W}
          className="rounded-xl"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            display: "block",
          }}
        />
        {gameState !== "playing" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
            style={{ background: "rgba(10,15,30,0.85)" }}
          >
            {gameState === "over" && (
              <p className="text-lg font-bold mb-1" style={{ color: "#f87171" }}>
                Game Over
              </p>
            )}
            {gameState === "over" && (
              <p className="text-sm font-mono mb-4" style={{ color: "#94a3b8" }}>
                Score: {score}
              </p>
            )}
            <button
              onClick={startGame}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(99,102,241,0.3)",
              }}
            >
              {gameState === "over" ? "Play Again" : "Start Game"}
            </button>
            {gameState === "idle" && (
              <p className="text-xs font-mono mt-3" style={{ color: "#475569" }}>
                Use WASD or Arrow keys to move
              </p>
            )}
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-1.5 sm:hidden" style={{ width: 150 }}>
        <div />
        <button onClick={() => { if (dirRef.current !== "DOWN") nextDirRef.current = "UP"; }} className="game-dpad-btn">^</button>
        <div />
        <button onClick={() => { if (dirRef.current !== "RIGHT") nextDirRef.current = "LEFT"; }} className="game-dpad-btn">{"<"}</button>
        <button onClick={() => { if (dirRef.current !== "UP") nextDirRef.current = "DOWN"; }} className="game-dpad-btn">v</button>
        <button onClick={() => { if (dirRef.current !== "LEFT") nextDirRef.current = "RIGHT"; }} className="game-dpad-btn">{">"}</button>
      </div>
    </div>
  );
}
