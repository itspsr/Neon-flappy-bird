'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Zap, Settings2, Pause, Home, Shield, Flame, ShoppingBag, Coins, Lock, Unlock, Volume2, VolumeX } from 'lucide-react';

// --- Web Audio Engine ---
class AudioEngine {
  ctx: AudioContext | null = null;
  isMuted: boolean = false;
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  playFlap() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }
  playScore() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }
  playCrash() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
  playPowerup() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.setValueAtTime(600, this.ctx.currentTime + 0.05);
    osc.frequency.setValueAtTime(800, this.ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}
const audio = new AudioEngine();

// --- Colors & Time of Day ---
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
}
function interpColor(color1: string, color2: string, factor: number) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + factor * (c2.r - c1.r));
  const g = Math.round(c1.g + factor * (c2.g - c1.g));
  const b = Math.round(c1.b + factor * (c2.b - c1.b));
  return `rgb(${r}, ${g}, ${b})`;
}
const PALETTES = [
  { skyTop: '#38bdf8', skyBot: '#bae6fd', build: '#0284c7', gndTop: '#15803d', gndBot: '#166534', cloud: 'rgba(255,255,255,0.8)' }, // Day
  { skyTop: '#ea580c', skyBot: '#fcd34d', build: '#7c2d12', gndTop: '#9a3412', gndBot: '#7c2d12', cloud: 'rgba(255,237,213,0.5)' }, // Sunset
  { skyTop: '#0f172a', skyBot: '#1e293b', build: '#020617', gndTop: '#1e293b', gndBot: '#0f172a', cloud: 'rgba(255,255,255,0.05)' }, // Night
  { skyTop: '#7e22ce', skyBot: '#f472b6', build: '#4a044e', gndTop: '#4c1d95', gndBot: '#2e1065', cloud: 'rgba(255,208,255,0.3)' }, // Dawn
];

// --- Constants & Types ---
type GameState = 'BOOTING' | 'START' | 'SHOP' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type Difficulty = 'EASY' | 'NORMAL' | 'HARD' | 'DAILY';
type BirdStyleKey = 'canary' | 'bluebird' | 'cardinal' | 'parrot' | 'eagle' | 'pigeon';

// --- Seeded RNG for Daily Challenge ---
function createSeededRNG(seed: number) {
  let a = seed;
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getTodaySeedString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getTodaySeedNumber() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

const DIFFICULTIES = {
  EASY: { gravity: 0.35, jump: -6.5, speed: 2.5, spawnRate: 140, gap: 200, movingPipes: false, pipeSpeedY: 0 },
  NORMAL: { gravity: 0.45, jump: -7.5, speed: 3.5, spawnRate: 100, gap: 160, movingPipes: false, pipeSpeedY: 0 },
  HARD: { gravity: 0.65, jump: -9.5, speed: 7.5, spawnRate: 60, gap: 110, movingPipes: true, pipeSpeedY: 0.08 },
  DAILY: { gravity: 0.55, jump: -8.5, speed: 5.5, spawnRate: 80, gap: 130, movingPipes: true, pipeSpeedY: 0.06 },
};

const BIRD_STYLES: Record<BirdStyleKey, { body: string, wing: string, head: string, beak: string, label: string, cost: number }> = {
  canary: { body: '#facc15', wing: '#eab308', head: '#facc15', beak: '#f97316', label: 'Canary', cost: 0 },
  bluebird: { body: '#3b82f6', wing: '#1d4ed8', head: '#3b82f6', beak: '#fbbf24', label: 'Bluebird', cost: 50 },
  cardinal: { body: '#ef4444', wing: '#b91c1c', head: '#ef4444', beak: '#f59e0b', label: 'Cardinal', cost: 150 },
  parrot: { body: '#22c55e', wing: '#ef4444', head: '#22c55e', beak: '#facc15', label: 'Parrot', cost: 300 },
  eagle: { body: '#78350f', wing: '#451a03', head: '#ffffff', beak: '#facc15', label: 'Eagle', cost: 600 },
  pigeon: { body: '#94a3b8', wing: '#64748b', head: '#a855f7', beak: '#0f172a', label: 'Pigeon', cost: 1000 },
};

const PIPE_WIDTH = 60;
const BIRD_SIZE = 34;

interface Pipe {
  x: number;
  baseTopHeight: number;
  topHeight: number;
  passed: boolean;
  movingPipes: boolean;
  phase: number;
  speedY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  rotation: number;
  vr: number;
}

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Powerup {
  x: number;
  y: number;
  type: 'SHIELD' | 'COIN';
  collected: boolean;
  phase: number;
}

export default function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('BOOTING');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [dailyHighScore, setDailyHighScore] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [unlockedBirds, setUnlockedBirds] = useState<BirdStyleKey[]>(['canary']);
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [birdStyle, setBirdStyle] = useState<BirdStyleKey>('canary');
  const [isMuted, setIsMuted] = useState(false);
  
  // Game refs
  const rngRef = useRef<() => number>(Math.random);
  const birdY = useRef(300);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const particles = useRef<Particle[]>([]);
  const trailParticles = useRef<TrailParticle[]>([]);
  const powerups = useRef<Powerup[]>([]);
  const birdHistory = useRef<{x: number, y: number, rotation: number, flap: number}[]>([]);
  const activeShield = useRef(0); // timer
  const frameCount = useRef(0);
  const requestRef = useRef<number>(null);

  // Achievement ref
  const achievementRef = useRef<{ text: string, opacity: number, y: number, life: number } | null>(null);

  // Parallax refs
  const bgOffset = useRef(0);
  const midOffset = useRef(0);
  const fgOffset = useRef(0);
  const timeOffset = useRef(0);

  // Boot timer
  useEffect(() => {
    if (gameState === 'BOOTING') {
      const timer = setTimeout(() => {
        setGameState('START');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const resetGame = useCallback(() => {
    birdY.current = 300;
    birdVelocity.current = 0;
    pipes.current = [];
    particles.current = [];
    trailParticles.current = [];
    powerups.current = [];
    birdHistory.current = [];
    activeShield.current = 0;
    frameCount.current = 0;
    if (difficulty === 'DAILY') {
      rngRef.current = createSeededRNG(getTodaySeedNumber());
    } else {
      rngRef.current = Math.random;
    }
    setScore(0);
    setGameState('PLAYING');
  }, [difficulty]);

  const jump = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    // If it's a mouse event from a button or overlay, don't jump
    if (e && 'stopPropagation' in e && (e.target as HTMLElement).closest('button')) return;
    
    audio.init();

    if (gameState === 'PLAYING') {
      birdVelocity.current = DIFFICULTIES[difficulty].jump;
      audio.playFlap();
    } else if (gameState === 'START' || gameState === 'GAME_OVER') {
      resetGame();
    }
  }, [gameState, difficulty, resetGame]);

  useEffect(() => {
    const saved = localStorage.getItem('flappyHighScore');
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighScore(parseInt(saved, 10));
    }
    const savedDaily = localStorage.getItem('flappyDaily_' + getTodaySeedString());
    if (savedDaily) {
      setDailyHighScore(parseInt(savedDaily, 10));
    }
    const savedCoins = localStorage.getItem('flappyCoins');
    if (savedCoins) {
      setTotalCoins(parseInt(savedCoins, 10));
    }
    const savedBirds = localStorage.getItem('flappyUnlockedBirds');
    if (savedBirds) {
      try {
        setUnlockedBirds(JSON.parse(savedBirds));
      } catch (e) {
        // ignore
      }
    }
    const savedMuted = localStorage.getItem('flappyMuted');
    if (savedMuted === 'true') {
      setIsMuted(true);
      audio.isMuted = true;
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(prev => {
      const next = !prev;
      audio.isMuted = next;
      localStorage.setItem('flappyMuted', next.toString());
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump(e);
        e.preventDefault(); // Prevent scrolling
      }
      if (e.code === 'Escape') {
        setGameState(prev => {
          if (prev === 'PLAYING') return 'PAUSED';
          if (prev === 'PAUSED') return 'PLAYING';
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const explodeBird = useCallback(() => {
    const colors = BIRD_STYLES[birdStyle];
    const newParticles: Particle[] = [];
    // Spawn 40 particles for a juicy explosion
    for (let i = 0; i < 40; i++) {
      newParticles.push({
        x: 100, // Bird's fixed X position
        y: birdY.current,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 4, // Upward bias
        life: 1,
        color: Math.random() > 0.3 ? colors.body : (Math.random() > 0.5 ? colors.wing : '#ffffff'),
        size: Math.random() * 8 + 2,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.5,
      });
    }
    particles.current = newParticles;
    birdY.current = -1000; // Hide bird offscreen
  }, [birdStyle]);

  const update = useCallback(() => {
    const config = DIFFICULTIES[difficulty];

    if (gameState === 'PLAYING') {
      // Trail particles spawning
      if (frameCount.current % 3 === 0) {
        const timeVal = (timeOffset.current / 2500) * 4;
        const phaseIdx = Math.floor(timeVal) % 4;
        const nextIdx = (phaseIdx + 1) % 4;
        const factor = timeVal % 1;
        const TRAIL_COLORS = ['#bae6fd', '#fcd34d', '#e2e8f0', '#f472b6']; // Day, Sunset, Night, Dawn
        const trailColor = interpColor(TRAIL_COLORS[phaseIdx], TRAIL_COLORS[nextIdx], factor);
        
        trailParticles.current.push({
          x: 100 - BIRD_SIZE / 2,
          y: birdY.current + (Math.random() * 10 - 5),
          vx: -config.speed - Math.random() * 2,
          vy: (Math.random() - 0.5),
          life: 1,
          maxLife: 20 + Math.random() * 10,
          color: trailColor,
          size: Math.random() * 4 + 2
        });
      }

      // Update trail particles
      trailParticles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
      });
      trailParticles.current = trailParticles.current.filter(p => p.life < p.maxLife);

      // Bird physics
      birdVelocity.current += config.gravity;
      birdY.current += birdVelocity.current;

      // Collision with floor/ceiling
        if (birdY.current + BIRD_SIZE / 2 > 560 || birdY.current - BIRD_SIZE / 2 < 0) {
          if (activeShield.current <= 0) {
            audio.playCrash();
            explodeBird();
            setGameState('GAME_OVER');
          } else {
            // Bounce off edges with shield
            birdVelocity.current = -birdVelocity.current * 0.8;
            if (birdY.current + BIRD_SIZE / 2 > 560) birdY.current = 560 - BIRD_SIZE / 2;
            if (birdY.current - BIRD_SIZE / 2 < 0) birdY.current = BIRD_SIZE / 2;
          }
        }
  
        // Active shield countdown
        if (activeShield.current > 0) activeShield.current--;
  
        // Pipes
        frameCount.current++;
        if (frameCount.current % config.spawnRate === 0) {
          const rand = rngRef.current;
          const minPipeHeight = 50;
          const maxPipeHeight = 560 - config.gap - minPipeHeight;
          const topHeight = Math.floor(rand() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
          pipes.current.push({ 
            x: 800, 
            baseTopHeight: topHeight,
            topHeight: topHeight, 
            passed: false,
            movingPipes: config.movingPipes,
            phase: rand() * Math.PI * 2,
            speedY: config.movingPipes ? (rand() * config.pipeSpeedY + config.pipeSpeedY) : 0
          });

          // Spawn powerup occasionally
          if (rand() < 0.2) {
            powerups.current.push({
              x: 800 + config.speed * (config.spawnRate / 2),
              y: topHeight + config.gap / 2,
              type: rand() > 0.3 ? 'COIN' : 'SHIELD',
              collected: false,
              phase: rand() * Math.PI * 2
            });
          }
        }

      pipes.current.forEach((pipe) => {
        pipe.x -= config.speed;

        // "Crushing" moving pipes logic
        if (pipe.movingPipes) {
          pipe.phase += pipe.speedY;
          pipe.topHeight = pipe.baseTopHeight + Math.sin(pipe.phase) * 80;
          // Clamp within screen bounds
          if (pipe.topHeight < 40) pipe.topHeight = 40;
          if (pipe.topHeight > 560 - config.gap - 40) pipe.topHeight = 560 - config.gap - 40;
        }

        // Collision detection
        const margin = 5; // generous margin
        const birdLeft = 100 - BIRD_SIZE / 2 + margin;
        const birdRight = 100 + BIRD_SIZE / 2 - margin;
        const birdTop = birdY.current - BIRD_SIZE / 2 + margin;
        const birdBottom = birdY.current + BIRD_SIZE / 2 - margin;

        if (
          birdRight > pipe.x &&
          birdLeft < pipe.x + PIPE_WIDTH &&
          (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + config.gap)
        ) {
          if (activeShield.current <= 0) {
            audio.playCrash();
            explodeBird();
            setGameState('GAME_OVER');
          } else {
             // Shield absorbs hit, bounce back slightly
             pipe.x += 10;
          }
        }

        // Score
        if (!pipe.passed && pipe.x + PIPE_WIDTH < 100) {
          pipe.passed = true;
          audio.playScore();
          setScore((s) => {
            const newScore = s + 1;
            
            // Check for milestones to spawn visual achievements
            if ([10, 25, 50, 100].includes(newScore)) {
              let text = "NICE!";
              if (newScore === 10) text = "10 POINTS - WARM UP!";
              if (newScore === 25) text = "25 POINTS - FLYING HIGH!";
              if (newScore === 50) text = "50 POINTS - UNSTOPPABLE!";
              if (newScore === 100) text = "100 POINTS - GOD TIER!";
              achievementRef.current = { text, opacity: 0, y: 150, life: 150 };
            }

            if (difficulty === 'DAILY') {
              setDailyHighScore((h) => {
                const newHigh = Math.max(h, newScore);
                if (newHigh > h) {
                  localStorage.setItem('flappyDaily_' + getTodaySeedString(), newHigh.toString());
                }
                return newHigh;
              });
            } else {
              setHighScore((h) => {
                const newHigh = Math.max(h, newScore);
                if (newHigh > h) {
                  localStorage.setItem('flappyHighScore', newHigh.toString());
                }
                return newHigh;
              });
            }
            return newScore;
          });
        }
      });

      // Remove off-screen pipes
      pipes.current = pipes.current.filter((p) => p.x + PIPE_WIDTH > 0);

      // Update Powerups
      powerups.current.forEach(pu => {
        pu.x -= config.speed;
        pu.phase += 0.1;
        pu.y += Math.sin(pu.phase) * 1.5;

        if (!pu.collected) {
           const dx = pu.x - 100;
           const dy = pu.y - birdY.current;
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist < BIRD_SIZE/2 + 15) {
             pu.collected = true;
             audio.playPowerup();
             if (pu.type === 'SHIELD') {
               activeShield.current = 600; // ~10 seconds of invincibility at 60fps
               achievementRef.current = { text: "SHIELD ACTIVE!", opacity: 0, y: 150, life: 120 };
             } else if (pu.type === 'COIN') {
               setScore(s => s + 5);
               setTotalCoins(c => {
                 const nc = c + 5;
                 localStorage.setItem('flappyCoins', nc.toString());
                 return nc;
               });
               achievementRef.current = { text: "+5 COINS!", opacity: 0, y: 150, life: 90 };
             }
           }
        }
      });
      powerups.current = powerups.current.filter(pu => !pu.collected && pu.x > -50);

      // Update Achievement Animation
      if (achievementRef.current) {
        const ach = achievementRef.current;
        ach.life--;
        if (ach.life > 120) {
          // Fade in and slide up
          ach.opacity = Math.min(1, ach.opacity + 0.05);
          ach.y = Math.max(100, ach.y - 2);
        } else if (ach.life < 30) {
          // Fade out and slide up
          ach.opacity = Math.max(0, ach.opacity - 0.05);
          ach.y -= 2;
        }
        if (ach.life <= 0) achievementRef.current = null;
      }
    }

    // Update Particles
    if (gameState === 'GAME_OVER') {
      particles.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // Gravity for particles
        p.rotation += p.vr;
        p.life -= 0.015;
      });
      particles.current = particles.current.filter((p) => p.life > 0);
    }

    // Update parallax offsets continuously unless game over
    if (gameState !== 'GAME_OVER' && gameState !== 'PAUSED') {
      const currentSpeed = (gameState === 'START' || gameState === 'BOOTING') ? 2 : config.speed;
      bgOffset.current = (bgOffset.current + currentSpeed * 0.1) % 800;
      midOffset.current = (midOffset.current + currentSpeed * 0.4) % 800;
      fgOffset.current = (fgOffset.current + currentSpeed) % 40;
      timeOffset.current += 1; // Continuous time counter
    }

    if (gameState === 'PLAYING') {
      // Update Bird History for motion blur (especially in hard mode or moving fast)
      birdHistory.current.push({
        x: 100, 
        y: birdY.current, 
        rotation: Math.min(Math.PI / 4, Math.max(-Math.PI / 4, birdVelocity.current * 0.12)), 
        flap: Math.sin(frameCount.current * 0.5)
      });
      if (birdHistory.current.length > (difficulty === 'HARD' ? 10 : 5)) {
        birdHistory.current.shift();
      }
    }
  }, [gameState, difficulty, explodeBird]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 800, 600);

    // Time of Day calculation based on timeOffset
    const timeVal = (timeOffset.current / 2500) * 4; // Cycles 4 phases every 2500 frames (~40s)
    const phaseIdx = Math.floor(timeVal) % 4;
    const nextIdx = (phaseIdx + 1) % 4;
    const factor = timeVal % 1;
    const p1 = PALETTES[phaseIdx];
    const p2 = PALETTES[nextIdx];

    const curSkyTop = interpColor(p1.skyTop, p2.skyTop, factor);
    const curSkyBot = interpColor(p1.skyBot, p2.skyBot, factor);
    const curBuild = interpColor(p1.build, p2.build, factor);
    const curGndTop = interpColor(p1.gndTop, p2.gndTop, factor);
    const curGndBot = interpColor(p1.gndBot, p2.gndBot, factor);
    
    // Cloud opacity varies with time of day
    let c1a = 0.8; if(phaseIdx===1) c1a=0.5; else if(phaseIdx===2) c1a=0.1; else if(phaseIdx===3) c1a=0.3;
    let c2a = 0.8; if(nextIdx===1) c2a=0.5; else if(nextIdx===2) c2a=0.1; else if(nextIdx===3) c2a=0.3;
    const curCloudAlpha = c1a + factor * (c2a - c1a);

    // 1. Sky Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, 600);
    bgGradient.addColorStop(0, curSkyTop);
    bgGradient.addColorStop(1, curSkyBot);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 800, 600);

    // Stars at night
    if (phaseIdx === 2 || (phaseIdx === 1 && factor > 0.5) || (phaseIdx === 3 && factor < 0.5)) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, phaseIdx === 2 ? 0.8 : (phaseIdx===1 ? (factor-0.5)*1.6 : (0.5-factor)*1.6))})`;
      ctx.beginPath();
      for(let i=0; i<30; i++) {
        // Pseudo random star positions based on index
        ctx.arc(((i*37 + 10) % 800) - (bgOffset.current * 0.05), (i*59) % 300, Math.random()*1.5, 0, Math.PI*2);
      }
      ctx.fill();
    }

    // 2. Realistic Clouds (Parallax 1)
    for (let i = 0; i < 2; i++) {
      const startX = (i * 800) - bgOffset.current;
      
      // Cloud rendering function using layered radial gradients for volumetric look
      const drawCloud = (cx: number, cy: number, w: number, h: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(w/50, h/30); // Base scale unit
        
        // Soft volumetric cloud
        const cloudGrad = ctx.createRadialGradient(0, -10, 0, 0, 0, 30);
        cloudGrad.addColorStop(0, `rgba(255, 255, 255, ${curCloudAlpha * 1.5})`);
        cloudGrad.addColorStop(1, `rgba(255, 255, 255, ${curCloudAlpha * 0.2})`);
        
        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.arc(-20, 0, 20, 0, Math.PI*2);
        ctx.arc(20, 0, 20, 0, Math.PI*2);
        ctx.arc(0, -15, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      };

      drawCloud(startX + 200, 150, 60, 40);
      drawCloud(startX + 600, 250, 100, 60);
      drawCloud(startX + 400, 100, 50, 30);
    }

    // 3. Mid-ground Cityscape (Parallax 2)
    ctx.fillStyle = curBuild;
    for (let i = 0; i < 2; i++) {
      const startX = (i * 800) - midOffset.current;
      ctx.fillRect(startX + 50, 400, 80, 160);
      ctx.fillRect(startX + 150, 350, 100, 210);
      ctx.fillRect(startX + 270, 450, 60, 110);
      ctx.fillRect(startX + 350, 300, 120, 260);
      ctx.fillRect(startX + 500, 380, 90, 180);
      ctx.fillRect(startX + 620, 480, 100, 80);
      ctx.fillRect(startX + 740, 420, 60, 140);
    }

    const config = DIFFICULTIES[difficulty];

    // 4. Draw Pipes
    pipes.current.forEach((pipe) => {
      // Top Pipe
      const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      // Hard mode pipes look slightly red/danger tinted when moving
      if (pipe.movingPipes) {
        topGradient.addColorStop(0, '#b91c1c');
        topGradient.addColorStop(1, '#991b1b');
      } else {
        topGradient.addColorStop(0, '#10b981');
        topGradient.addColorStop(1, '#059669');
      }
      ctx.fillStyle = topGradient;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      
      ctx.fillStyle = pipe.movingPipes ? '#ef4444' : '#34d399';
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);

      // Bottom Pipe
      const bottomGradient = ctx.createLinearGradient(pipe.x, pipe.topHeight + config.gap, pipe.x + PIPE_WIDTH, pipe.topHeight + config.gap);
      if (pipe.movingPipes) {
        bottomGradient.addColorStop(0, '#b91c1c');
        bottomGradient.addColorStop(1, '#991b1b');
      } else {
        bottomGradient.addColorStop(0, '#10b981');
        bottomGradient.addColorStop(1, '#059669');
      }
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(pipe.x, pipe.topHeight + config.gap, PIPE_WIDTH, 560 - (pipe.topHeight + config.gap));
      
      ctx.fillStyle = pipe.movingPipes ? '#ef4444' : '#34d399';
      ctx.fillRect(pipe.x - 5, pipe.topHeight + config.gap, PIPE_WIDTH + 10, 20);
    });

    // 5. Ground (Parallax 3)
    ctx.fillStyle = curGndTop;
    ctx.fillRect(0, 560, 800, 40);
    ctx.fillStyle = curGndBot;
    for (let i = -1; i < 21; i++) {
      ctx.fillRect((i * 40) - fgOffset.current, 560, 20, 40);
    }
    ctx.fillStyle = '#22c55e'; // Bright grass line
    ctx.fillRect(0, 560, 800, 4);

    // 5.5 Draw Powerups
    powerups.current.forEach(pu => {
      ctx.save();
      ctx.translate(pu.x, pu.y);
      if (pu.type === 'SHIELD') {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#bfdbfe';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#854d0e';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
      }
      ctx.restore();
    });

    // Draw Trail Particles
    trailParticles.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - (p.life / p.maxLife));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    });

    // 6. Draw Bird (if not dead)
    if (gameState !== 'GAME_OVER') {
      const style = BIRD_STYLES[birdStyle];

      // Draw Motion Blur (Ghost Trail) for Hard Mode / Speed
      if (gameState === 'PLAYING') {
        birdHistory.current.forEach((past, index) => {
          const alpha = (index / birdHistory.current.length) * 0.3; // Fades out
          ctx.save();
          ctx.translate(past.x, past.y);
          ctx.rotate(past.rotation);
          
          ctx.beginPath();
          ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${hexToRgb(style.body).r}, ${hexToRgb(style.body).g}, ${hexToRgb(style.body).b}, ${alpha})`;
          ctx.fill();
          
          ctx.restore();
        });
      }

      ctx.save();
      let currentBirdY = birdY.current;
      if (gameState === 'START') {
        currentBirdY = 300 + Math.sin(Date.now() / 200) * 10;
      }
      
      ctx.translate(100, currentBirdY);
      let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, birdVelocity.current * 0.12));
      if (gameState === 'START') rotation = 0;
      ctx.rotate(rotation);
      
      // 1. Tail feathers (drawn first to stay behind body)
      ctx.fillStyle = style.wing;
      ctx.beginPath();
      ctx.moveTo(-BIRD_SIZE / 2 + 5, 0);
      ctx.lineTo(-BIRD_SIZE / 2 - 12, -8);
      ctx.lineTo(-BIRD_SIZE / 2 - 14, 0);
      ctx.lineTo(-BIRD_SIZE / 2 - 12, 8);
      ctx.fill();
      // Shade tail to push it to the background
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();

      // 2. Main Body (Pseudo-3D Volumetric Sphere)
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = style.body;
      ctx.fill();
      // 3D Shadow (bottom right)
      const shadowGrad = ctx.createRadialGradient(BIRD_SIZE/4, BIRD_SIZE/4, 0, 0, 0, BIRD_SIZE);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadowGrad;
      ctx.fill();
      // 3D Highlight (top left)
      const highGrad = ctx.createRadialGradient(-BIRD_SIZE/4, -BIRD_SIZE/4, 0, -BIRD_SIZE/4, -BIRD_SIZE/4, BIRD_SIZE/2);
      highGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
      highGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = highGrad;
      ctx.fill();
      
      // 3. Head/Plumage (for eagle/pigeon etc)
      if (style.head !== style.body) {
        ctx.beginPath();
        ctx.ellipse(6, -3, BIRD_SIZE / 3, BIRD_SIZE / 3.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = style.head;
        ctx.fill();
        ctx.fillStyle = shadowGrad; // apply same 3D shadow
        ctx.fill();
        ctx.fillStyle = highGrad; // apply same 3D highlight
        ctx.fill();
      }
      
      // 4. 3D Glossy Eye
      ctx.fillStyle = '#f8fafc'; // Eye White
      ctx.beginPath();
      ctx.arc(8, -5, 5, 0, Math.PI * 2);
      ctx.fill();
      // Eye inner shadow for spherical depth
      const eyeShadow = ctx.createRadialGradient(8, -5, 5, 8, -5, 0);
      eyeShadow.addColorStop(0, 'rgba(0,0,0,0.3)');
      eyeShadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = eyeShadow;
      ctx.fill();
      
      // Pupil
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(10, -5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Eye Catchlight (glossy reflection)
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(10.5, -6, 1, 0, Math.PI * 2);
      ctx.fill();
      
      // 5. Beak with 3D cylindrical shading
      ctx.beginPath();
      if (birdStyle === 'parrot') {
        ctx.arc(14, 0, 6, -Math.PI/2, Math.PI/4);
        ctx.lineTo(14, 6);
      } else if (birdStyle === 'eagle') {
        ctx.moveTo(12, -2);
        ctx.lineTo(24, 2);
        ctx.lineTo(12, 6);
      } else {
        ctx.moveTo(13, -1);
        ctx.lineTo(22, 2);
        ctx.lineTo(13, 5);
      }
      ctx.closePath();
      ctx.fillStyle = style.beak;
      ctx.fill();
      // Beak shadow gradient
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();
      // Beak highlight line
      ctx.beginPath();
      ctx.moveTo(13, -1);
      ctx.lineTo(20, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // 6. 3D Wing (Animated for true foreshortening)
      let wingFlap = 1;
      if (gameState === 'PLAYING') {
        wingFlap = Math.sin(frameCount.current * 0.5); // ranges -1 to 1
      } else if (gameState === 'START') {
        wingFlap = Math.sin(Date.now() / 100);
      }
      
      // Transform wing to simulate 3D rotation around x-axis
      const wingY = 2 + wingFlap * 4; 
      const wingHeight = 6 * Math.abs(wingFlap); // Gets thinner as it crosses center
      
      ctx.beginPath();
      ctx.ellipse(-4, wingY, 12, wingHeight + 0.5, -Math.PI / 8, 0, Math.PI * 2);
      ctx.fillStyle = style.wing;
      ctx.fill();
      
      // Wing 3D Highlight & Shadow
      const wingShadow = ctx.createRadialGradient(-4, wingY+4, 0, -4, wingY, 12);
      wingShadow.addColorStop(0, 'rgba(0,0,0,0.5)');
      wingShadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wingShadow;
      ctx.fill();

      // Shield Aura
      if (activeShield.current > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_SIZE + (Math.sin(frameCount.current * 0.1) * 3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + (activeShield.current % 10 < 5 ? 0.2 : 0)})`;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(147, 197, 253, ${activeShield.current < 60 ? (activeShield.current % 10 < 5 ? 1 : 0) : 0.8})`;
        ctx.stroke();
      }

      ctx.restore();
    }

    // 7. Draw Particles (Explosion)
    if (particles.current.length > 0) {
      particles.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      });
    }

    // 8. Draw Achievement Badge
    if (achievementRef.current) {
      const ach = achievementRef.current;
      ctx.save();
      ctx.globalAlpha = ach.opacity;
      ctx.translate(400, ach.y);

      ctx.font = 'bold 22px "Space Grotesk", sans-serif';
      const textWidth = ctx.measureText(ach.text).width;
      const bgWidth = textWidth + 50;
      const bgHeight = 44;

      // Glow
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 20;

      // Badge BG
      ctx.beginPath();
      ctx.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 22);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)'; // amber-500
      ctx.fill();
      
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fef3c7'; // amber-50
      ctx.stroke();

      // Text
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ach.text, 0, 2); // offset text slightly for visual centering

      ctx.restore();
    }

  }, [difficulty, birdStyle, gameState]);

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
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-zinc-800 bg-zinc-900 w-full max-w-[800px] aspect-[4/3]">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={jump}
          className="w-full h-full cursor-pointer"
        />

        {/* Score Overlay */}
        {gameState === 'PLAYING' && (
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
        )}

        {/* Mute Button */}
        {gameState !== 'BOOTING' && (
          <button
            onClick={toggleMute}
            className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors hover:scale-110 p-2 z-30"
          >
            {isMuted ? <VolumeX size={32} className="fill-current" /> : <Volume2 size={32} className="fill-current" />}
          </button>
        )}

        {/* Pause Button */}
        {gameState === 'PLAYING' && (
          <button
            onClick={(e) => { e.stopPropagation(); setGameState('PAUSED'); }}
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors hover:scale-110 p-2 z-10"
          >
            <Pause size={32} className="fill-current" />
          </button>
        )}

        {/* UI Overlays */}
        <AnimatePresence>
          {gameState === 'BOOTING' && (
            <motion.div
              key="boot"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.8 } }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-50"
            >
              <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-t-amber-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-4 border-t-transparent border-r-blue-400 border-b-transparent border-l-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.7s' }}></div>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center relative overflow-hidden shadow-inner border border-black/20 z-10 animate-bounce"
                  style={{ backgroundColor: BIRD_STYLES[birdStyle].body }}
                >
                  <div className="absolute inset-0 opacity-50" style={{ backgroundColor: BIRD_STYLES[birdStyle].wing, transform: 'translateY(50%)' }} />
                </div>
              </div>
              <h1 className="text-3xl font-display font-black text-white tracking-widest mb-4">FLAPPY STUDIO</h1>
              <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  className="h-full bg-amber-400"
                />
              </div>
            </motion.div>
          )}

          {gameState === 'START' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            >
              <motion.h1 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-5xl md:text-6xl font-display font-black text-white mb-8 tracking-tighter text-center"
              >
                NEON <span className="text-emerald-400">FLAP</span>
              </motion.h1>

              <div className="flex flex-col md:flex-row gap-6 mb-8 w-full max-w-lg">
                {/* Difficulty Selector */}
                <div className="flex-1 bg-zinc-900/80 border border-zinc-700 p-4 rounded-2xl backdrop-blur">
                  <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Settings2 size={14} /> Difficulty
                  </h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all ${
                            difficulty === level 
                              ? level === 'HARD' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 text-zinc-950' 
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                          }`}
                        >
                          {level} {level === 'HARD' && '💀'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setDifficulty('DAILY')}
                      className={`w-full py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        difficulty === 'DAILY'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      <Trophy size={14} /> DAILY CHALLENGE
                    </button>
                  </div>
                </div>

                {/* Bird Customizer & Shop */}
                <div className="flex-1 bg-zinc-900/80 border border-zinc-700 p-4 rounded-2xl backdrop-blur flex flex-col items-center justify-center">
                  <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Coins size={14} className="text-amber-400" /> {totalCoins} COINS
                  </div>
                  <div 
                    className="w-20 h-20 rounded-full border-4 border-zinc-700 mb-3 flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: BIRD_STYLES[birdStyle].body }}
                  >
                    <div className="absolute inset-0 opacity-50" style={{ backgroundColor: BIRD_STYLES[birdStyle].wing, transform: 'translateY(50%)' }} />
                  </div>
                  <span className="text-white font-bold mb-3">{BIRD_STYLES[birdStyle].label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setGameState('SHOP'); }}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-colors"
                  >
                    <ShoppingBag size={16} /> AVIARY & SHOP
                  </button>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); resetGame(); }}
                className="group flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-10 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
              >
                <Play className="fill-current" />
                START GAME
              </button>
            </motion.div>
          )}

          {gameState === 'SHOP' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col h-[500px]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-display font-black text-white flex items-center gap-3">
                    <ShoppingBag className="text-emerald-400" size={28} /> AVIARY SHOP
                  </h2>
                  <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-full font-bold text-amber-400 text-xl border border-zinc-700">
                    <Coins size={20} /> {totalCoins}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(Object.entries(BIRD_STYLES) as [BirdStyleKey, any][]).map(([key, style]) => {
                    const isUnlocked = unlockedBirds.includes(key);
                    const isEquipped = birdStyle === key;
                    const canAfford = totalCoins >= style.cost;
                    
                    return (
                      <div 
                        key={key}
                        className={`relative rounded-2xl p-4 flex flex-col items-center border-2 transition-all ${
                          isEquipped ? 'border-emerald-500 bg-emerald-500/10' : 
                          isUnlocked ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-500' :
                          'border-zinc-800 bg-zinc-900/50 opacity-80'
                        }`}
                      >
                        {/* 3D Bird Preview Style */}
                        <div 
                          className="w-16 h-16 rounded-full mb-3 flex items-center justify-center relative shadow-inner overflow-hidden border border-black/20"
                          style={{ backgroundColor: style.body }}
                        >
                          <div className="absolute inset-0 opacity-50" style={{ backgroundColor: style.wing, transform: 'translateY(50%)' }} />
                        </div>
                        <h3 className="text-white font-bold mb-1 text-center">{style.label}</h3>
                        
                        {isUnlocked ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setBirdStyle(key); }}
                            disabled={isEquipped}
                            className={`mt-auto w-full py-2 rounded-lg font-bold text-xs transition-colors ${
                              isEquipped ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                            }`}
                          >
                            {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canAfford) {
                                setTotalCoins(c => {
                                  const nc = c - style.cost;
                                  localStorage.setItem('flappyCoins', nc.toString());
                                  return nc;
                                });
                                setUnlockedBirds(b => {
                                  const nb = [...b, key];
                                  localStorage.setItem('flappyUnlockedBirds', JSON.stringify(nb));
                                  return nb;
                                });
                                setBirdStyle(key);
                              }
                            }}
                            disabled={!canAfford}
                            className={`mt-auto w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors ${
                              canAfford ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            <Lock size={12} /> {style.cost} COINS
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setGameState('START'); }}
                    className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-6 py-3 rounded-full font-bold text-sm transition-all hover:bg-zinc-700 hover:text-white"
                  >
                    <Home size={16} /> BACK TO MENU
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'PAUSED' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-20"
            >
              <h2 className="text-5xl font-display font-black text-white mb-8 tracking-widest drop-shadow-xl">PAUSED</h2>
              <div className="flex gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); setGameState('PLAYING'); }}
                  className="flex items-center gap-3 bg-white text-zinc-950 px-8 py-4 rounded-full font-bold text-xl transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
                >
                  <Play className="fill-current" />
                  RESUME
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setGameState('START'); }}
                  className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-6 py-4 rounded-full font-bold text-lg transition-all hover:bg-zinc-700 hover:text-white border border-zinc-700"
                >
                  <Home size={20} />
                  HOME
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-20"
            >
              <h2 className="text-5xl font-display font-black text-red-500 mb-2">WASTED</h2>
              <div className="bg-zinc-800/50 p-8 rounded-3xl border border-zinc-700 mb-8 w-72">
                <div className="flex justify-between items-center mb-4 border-b border-zinc-700 pb-4">
                  <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest">Score</span>
                  <span className="text-4xl font-display font-bold text-white">{score}</span>
                </div>
                {difficulty === 'DAILY' ? (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest flex items-center gap-1">
                      <Trophy size={12} className="text-purple-400" /> Daily Best
                    </span>
                    <span className="text-3xl font-display font-bold text-purple-400">{dailyHighScore}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest flex items-center gap-1">
                      <Trophy size={12} className="text-amber-400" /> All-Time Best
                    </span>
                    <span className="text-3xl font-display font-bold text-amber-400">{highScore}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-3 max-w-md">
                <button
                  onClick={(e) => { e.stopPropagation(); resetGame(); }}
                  className="flex items-center gap-2 bg-white text-zinc-950 px-6 py-3 rounded-full font-bold text-lg transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
                >
                  <RotateCcw size={20} />
                  RESTART
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setGameState('START'); }}
                  className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-5 py-3 rounded-full font-bold text-md transition-all hover:bg-zinc-700 hover:text-white border border-zinc-700"
                >
                  <Home size={18} />
                  HOME
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHighScore(0);
                    localStorage.setItem('flappyHighScore', '0');
                  }}
                  className="flex items-center gap-2 bg-zinc-900 text-red-400 px-4 py-3 rounded-full font-bold text-sm transition-all hover:bg-red-500/10 hover:text-red-300 border border-zinc-800"
                  title="Reset High Score"
                >
                  <RotateCcw size={14} />
                  RESET SCORE
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex gap-8 text-zinc-500 text-sm font-medium">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-300">SPACE</kbd>
          <span>to Fly</span>
        </div>
      </div>
    </div>
  );
}
