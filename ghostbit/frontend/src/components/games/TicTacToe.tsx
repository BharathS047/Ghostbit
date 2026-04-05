"use client";

import { useState, useCallback } from "react";

type Cell = "X" | "O" | null;
type Board = Cell[];

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function getWinner(board: Board): { winner: Cell; line: number[] | null } {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

function minimax(board: Board, isMax: boolean): number {
  const { winner } = getWinner(board);
  if (winner === "O") return 1;
  if (winner === "X") return -1;
  if (board.every((c) => c !== null)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "O";
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "X";
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function getBotMove(board: Board): number {
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "O";
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

interface Props {
  onScore?: (score: number) => void;
}

export default function TicTacToe({ onScore }: Props) {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [scores, setScores] = useState({ wins: 0, losses: 0, draws: 0 });
  const { winner, line: winLine } = getWinner(board);
  const isDraw = !winner && board.every((c) => c !== null);

  const reset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  }, []);

  function handleClick(i: number) {
    if (board[i] || winner || isDraw) return;

    const next = [...board];
    next[i] = "X";
    setBoard(next);
    setXIsNext(false);

    const { winner: w1 } = getWinner(next);
    if (w1 || next.every((c) => c !== null)) {
      if (w1 === "X") { setScores((s) => ({ ...s, wins: s.wins + 1 })); onScore?.(1); }
      else if (!w1) setScores((s) => ({ ...s, draws: s.draws + 1 }));
      return;
    }

    // Bot move
    setTimeout(() => {
      const botIdx = getBotMove([...next]);
      if (botIdx >= 0) {
        const botBoard = [...next];
        botBoard[botIdx] = "O";
        setBoard(botBoard);
        setXIsNext(true);
        const { winner: w2 } = getWinner(botBoard);
        if (w2 === "O") setScores((s) => ({ ...s, losses: s.losses + 1 }));
        else if (botBoard.every((c) => c !== null)) setScores((s) => ({ ...s, draws: s.draws + 1 }));
      }
    }, 300);
  }

  const status = winner
    ? winner === "X"
      ? "You win!"
      : "Bot wins!"
    : isDraw
    ? "Draw!"
    : xIsNext
    ? "Your turn (X)"
    : "Bot thinking...";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Status */}
      <div className="text-center">
        <p
          className="text-lg font-bold mb-1"
          style={{
            color: winner === "X" ? "#22c55e" : winner === "O" ? "#ef4444" : "#e2e8f0",
          }}
        >
          {status}
        </p>
        <div className="flex gap-4 text-xs font-mono" style={{ color: "#94a3b8" }}>
          <span>
            W: <span style={{ color: "#22c55e" }}>{scores.wins}</span>
          </span>
          <span>
            L: <span style={{ color: "#ef4444" }}>{scores.losses}</span>
          </span>
          <span>
            D: <span style={{ color: "#eab308" }}>{scores.draws}</span>
          </span>
        </div>
      </div>

      {/* Board */}
      <div
        className="grid grid-cols-3 gap-2"
        style={{ width: "fit-content" }}
      >
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              className="w-[72px] h-[72px] sm:w-[90px] sm:h-[90px] md:w-[100px] md:h-[100px] rounded-xl text-2xl sm:text-3xl font-black flex items-center justify-center transition-all"
              style={{
                background: isWinCell
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(15,23,42,0.8)",
                border: isWinCell
                  ? "2px solid rgba(34,197,94,0.5)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: cell === "X" ? "#60a5fa" : cell === "O" ? "#f87171" : "transparent",
                cursor: cell || winner || isDraw ? "default" : "pointer",
                boxShadow: isWinCell ? "0 0 20px rgba(34,197,94,0.2)" : "none",
              }}
            >
              {cell || "."}
            </button>
          );
        })}
      </div>

      {/* Reset */}
      {(winner || isDraw) && (
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
      )}
    </div>
  );
}
