import React, { useEffect, useRef, useState } from 'react';
import type { AppMode } from '../types';
import { Terminal, Flame, FileCode2 } from 'lucide-react';

interface MatrixGatewayProps {
  onSelectMode: (mode: AppMode) => void;
}

export const MatrixGateway: React.FC<MatrixGatewayProps> = ({ onSelectMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typedText, setTypedText] = useState<string>('');
  const [showSubtitle, setShowSubtitle] = useState<boolean>(false);
  const [isGlitching, setIsGlitching] = useState<boolean>(false);

  const fullHeadline = 'Wake up, Developer...';

  // Typewriter effect for Morpheus headline
  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx <= fullHeadline.length) {
        setTypedText(fullHeadline.slice(0, currentIdx));
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowSubtitle(true), 300);
      }
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // Matrix Digital Rain Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initDrops();
    };

    window.addEventListener('resize', handleResize);

    // Matrix glyph characters: 01 binary, Japanese katakana-style, regex operators & delimiters
    const chars = '01アカサタナハマヤラワガザダバパイキシチニヒミリヰギジヂビピウクスツヌフムユルグズヅブプエケセテネヘメレヱゲゼデベペオコソトノホモヨロヲゴゾドボポアイウエオカキクケコサシスセソタチツテト^$*+{}[]()|\\?!=~_<>:#@&%';
    const fontSize = 15;
    let columns = Math.floor(width / fontSize);
    let drops: number[] = [];

    const initDrops = () => {
      columns = Math.floor(width / fontSize);
      drops = [];
      for (let i = 0; i < columns; i++) {
        drops[i] = Math.floor(Math.random() * -height / fontSize);
      }
    };

    initDrops();

    let lastTime = 0;
    const fpsInterval = 1000 / 30; // Solid 30-40fps for authentic green phosphor stream

    const render = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(render);

      const elapsed = currentTime - lastTime;
      if (elapsed < fpsInterval) return;
      lastTime = currentTime - (elapsed % fpsInterval);

      // Semi-transparent fade background for silky phosphor trails
      ctx.fillStyle = 'rgba(5, 5, 7, 0.08)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Bright electric white leading head
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 8;
        ctx.fillText(char, x, y);

        // Fading trailing neon green characters
        ctx.fillStyle = '#00ff66';
        ctx.shadowBlur = 2;
        const trailChar = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(trailChar, x, y - fontSize);

        ctx.shadowBlur = 0;

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handlePillChoice = (mode: AppMode) => {
    setIsGlitching(true);
    setTimeout(() => {
      onSelectMode(mode);
    }, 450);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#050507] overflow-hidden select-none font-mono ${isGlitching ? 'animate-pulse contrast-200' : ''}`}>
      
      {/* Fullscreen HTML5 Matrix Rain Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
      />

      {/* CRT Scanline & Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,5,7,0.85)_100%)]" />
      <div 
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0) 50%, rgba(0, 0, 0, 0.75) 50%)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Floating Morpheus Decision Card */}
      <div className="relative z-10 w-full max-w-xl mx-4 bg-[#0c0d12]/90 backdrop-blur-2xl border border-emerald-500/40 rounded-2xl p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(0,255,102,0.18)] flex flex-col items-center">
        
        {/* Eyebrow Protocol Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[11px] text-emerald-400 font-semibold tracking-widest uppercase mb-5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#00ff88] animate-pulse" />
          <span>PROTOCOL: CARRIER_DETECT // SPECGUARD_v1.4</span>
        </div>

        {/* Typewriter Main Title */}
        <div className="min-h-[44px] flex items-center justify-center">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-1">
            <span>{typedText}</span>
            <span className="inline-block w-2.5 h-6 bg-emerald-400 ml-1 shadow-[0_0_8px_#00ff88] animate-cursor" />
          </h1>
        </div>

        {/* Subtitle & Reality Prompt */}
        <div className={`transition-all duration-700 mt-2 ${showSubtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <p className="text-sm font-semibold text-emerald-300 tracking-wide uppercase">
            Choose your reality.
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
            Validate the code, or see how deep the regular expression rabbit hole goes.
          </p>
        </div>

        {/* 3D Tactile Decision Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-8 pt-6 border-t border-emerald-500/20">
          
          {/* RED PILL (Regex Tracer) */}
          <button
            onClick={() => handlePillChoice('regex')}
            className="group relative flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-rose-950/90 via-red-900/80 to-[#180408] border-2 border-rose-500/60 hover:border-rose-400 text-white shadow-[0_0_30px_rgba(244,63,94,0.35)] hover:shadow-[0_0_45px_rgba(255,0,85,0.6)] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] text-left cursor-pointer overflow-hidden"
          >
            {/* Pill Sheen */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-[0_0_10px_#ff0055]">
                <Flame className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-sm tracking-wider text-rose-100 group-hover:text-white">
                [ RED PILL ]
              </span>
            </div>

            <div className="text-xs font-semibold text-rose-300 mt-1">
              Regex Tracer & ReDoS Sentry
            </div>
            <p className="text-[10px] text-rose-200/60 mt-1 text-center font-normal">
              AST Tokenizer, Step Trace & Web Worker Isolation
            </p>
          </button>

          {/* BLUE PILL (JSON Contract) */}
          <button
            onClick={() => handlePillChoice('json')}
            className="group relative flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-cyan-950/90 via-blue-900/80 to-[#041018] border-2 border-cyan-500/60 hover:border-cyan-400 text-white shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:shadow-[0_0_45px_rgba(0,229,255,0.6)] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] text-left cursor-pointer overflow-hidden"
          >
            {/* Pill Sheen */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-white shadow-[0_0_10px_#06b6d4]">
                <FileCode2 className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-sm tracking-wider text-cyan-100 group-hover:text-white">
                [ BLUE PILL ]
              </span>
            </div>

            <div className="text-xs font-semibold text-cyan-300 mt-1">
              JSON Contract & Schema Core
            </div>
            <p className="text-[10px] text-cyan-200/60 mt-1 text-center font-normal">
              Draft-07 / 2020 Validation, Tree & Diagnostics
            </p>
          </button>

        </div>

        {/* Footer Hint */}
        <div className="mt-5 flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
          <Terminal className="w-3 h-3 text-emerald-500/70" />
          <span>Press either pill to enter the SpecGuard kernel isolate</span>
        </div>

      </div>

    </div>
  );
};
