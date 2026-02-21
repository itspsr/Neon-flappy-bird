'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Zap } from 'lucide-react';

// --- Constants ---
const GRAVITY = 0.4;
const JUMP_STRENGTH = -7;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 100; // frames
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const BIRD_SIZE = 34;

type GameState = 'START' | 'PLAYING' | 'GAME_OVER';

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export default function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Game refs to avoid closure issues in the loop
  const birdY = useRef(300);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frameCount = useRef(0);
  const requestRef = useRef<number>(null);

  const resetGame = useCallback(() => {
    birdY.current = 300;
    birdVelocity.current = 0;
    pipes.current = [];
    frameCount.current = 0;
    setScore(0);
    setGameState('PLAYING');
  }, []);

  const jump = useCallback(() => {
    if (gameState === 'PLAYING') {
      birdVelocity.current = JUMP_STRENGTH;
    } else if (gameState === 'START' || gameState === 'GAME_OVER') {
      resetGame();
    }
  }, [gameState, resetGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const update = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    // Bird physics
    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    // Collision with floor/ceiling
    if (birdY.current + BIRD_SIZE / 2 > 600 || birdY.current - BIRD_SIZE / 2 < 0) {
      setGameState('GAME_OVER');
    }

    // Pipes
    frameCount.current++;
    if (frameCount.current % PIPE_SPAWN_RATE === 0) {
      const minPipeHeight = 50;
      const maxPipeHeight = 600 - PIPE_GAP - minPipeHeight;
      const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
      pipes.current.push({ x: 800, topHeight, passed: false });
    }

    pipes.current.forEach((pipe, index) => {
      pipe.x -= PIPE_SPEED;

      // Collision detection
      const birdLeft = 100 - BIRD_SIZE / 2;
      const birdRight = 100 + BIRD_SIZE / 2;
      const birdTop = birdY.current - BIRD_SIZE / 2;
      const birdBottom = birdY.current + BIRD_SIZE / 2;

      if (
        birdRight > pipe.x &&
        birdLeft < pipe.x + PIPE_WIDTH &&
        (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + PIPE_GAP)
      ) {
        setGameState('GAME_OVER');
      }

      // Score
      if (!pipe.passed && pipe.x + PIPE_WIDTH < 100) {
        pipe.passed = true;
        setScore((s) => {
          const newScore = s + 1;
          setHighScore((h) => Math.max(h, newScore));
          return newScore;
        });
      }
    });

    // Remove off-screen pipes
    pipes.current = pipes.current.filter((p) => p.x + PIPE_WIDTH > 0);
  }, [gameState]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 800, 600);

    // Background (Gradient)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, 600);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 800, 600);

    // Draw Pipes
    pipes.current.forEach((pipe) => {
      // Top Pipe
      const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      topGradient.addColorStop(0, '#10b981');
      topGradient.addColorStop(1, '#059669');
      ctx.fillStyle = topGradient;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      
      // Top Pipe Cap
      ctx.fillStyle = '#34d399';
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);

      // Bottom Pipe
      const bottomGradient = ctx.createLinearGradient(pipe.x, pipe.topHeight + PIPE_GAP, pipe.x + PIPE_WIDTH, pipe.topHeight + PIPE_GAP);
      bottomGradient.addColorStop(0, '#10b981');
      bottomGradient.addColorStop(1, '#059669');
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, 600 - (pipe.topHeight + PIPE_GAP));
      
      // Bottom Pipe Cap
      ctx.fillStyle = '#34d399';
      ctx.fillRect(pipe.x - 5, pipe.topHeight + PIPE_GAP, PIPE_WIDTH + 10, 20);
    });

    // Draw Bird
    ctx.save();
    ctx.translate(100, birdY.current);
    const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, birdVelocity.current * 0.1));
    ctx.rotate(rotation);
    
    // Bird Body
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(8, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(10, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird Beak
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(24, 4);
    ctx.lineTo(14, 8);
    ctx.closePath();
    ctx.fill();
    
    // Bird Wing
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(-8, 2, 10, 6, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      update();
      draw(ctx);
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update, draw]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-4 font-sans">
      {/* Game Container */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-zinc-800 bg-zinc-900 w-full max-w-[800px] aspect-[4/3]">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={jump}
          className="w-full h-full cursor-pointer"
        />

        {/* Score Overlay */}
        <div className="absolute top-8 left-0 right-0 flex justify-center pointer-events-none">
          <motion.div 
            key={score}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-display font-bold text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
          >
            {score}
          </motion.div>
        </div>

        {/* UI Overlays */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.h1 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-6xl font-display font-black text-white mb-8 tracking-tighter"
              >
                NEON <span className="text-emerald-400">FLAP</span>
              </motion.h1>
              <button
                onClick={resetGame}
                className="group flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-8 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 active:scale-95"
              >
                <Play className="fill-current" />
                START GAME
              </button>
              <p className="mt-6 text-zinc-400 font-medium flex items-center gap-2">
                <Zap size={16} className="text-emerald-400" />
                Press SPACE or CLICK to fly
              </p>
            </motion.div>
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
            >
              <h2 className="text-5xl font-display font-black text-red-500 mb-2">GAME OVER</h2>
              <div className="bg-zinc-800/50 p-8 rounded-3xl border border-zinc-700 mb-8 w-64">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest">Score</span>
                  <span className="text-3xl font-display font-bold text-white">{score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest flex items-center gap-1">
                    <Trophy size={12} className="text-amber-400" /> Best
                  </span>
                  <span className="text-3xl font-display font-bold text-amber-400">{highScore}</span>
                </div>
              </div>
              <button
                onClick={resetGame}
                className="flex items-center gap-3 bg-white text-zinc-950 px-8 py-4 rounded-full font-bold text-xl transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95"
              >
                <RotateCcw />
                TRY AGAIN
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex gap-8 text-zinc-500 text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>High Score: {highScore}</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-300">SPACE</kbd>
          <span>to Fly</span>
        </div>
      </div>
    </div>
  );
}
