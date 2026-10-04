import React, { useState } from 'react';
import type { AppMode, PresetItem } from '../types';
import { PRESETS } from '../utils/presets';
import { 
  Binary, 
  FileCode2, 
  Sparkles, 
  Share2, 
  Code2, 
  HelpCircle, 
  ChevronDown, 
  Check, 
  Play, 
  Bug,
  Compass
} from 'lucide-react';

interface NavbarProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  onSelectPreset: (preset: PresetItem) => void;
  onGenerateSample: (shouldPass: boolean) => void;
  onOpenExport: () => void;
  onOpenTour: () => void;
  onShare: () => void;
  isCopiedShare: boolean;
  onReenterMatrix?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  setMode,
  onSelectPreset,
  onGenerateSample,
  onOpenExport,
  onOpenTour,
  onShare,
  isCopiedShare,
  onReenterMatrix,
}) => {
  const [presetOpen, setPresetOpen] = useState(false);

  const filteredPresets = PRESETS.filter(p => p.mode === mode);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-500/20 bg-[#050507]/90 backdrop-blur-md px-3 lg:px-6 py-2 transition-all font-mono">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        
        {/* Left: Terminal Hacker Logo & Matrix Gateway Re-entry */}
        <div className="flex items-center gap-3">
          <div 
            onClick={onOpenTour}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <img 
              src="/logo.png" 
              alt="SpecGuard Logo" 
              className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform" 
            />
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold tracking-wider text-emerald-400 group-hover:text-emerald-300 transition-colors">
              <span className="text-zinc-600">[</span>
              <span className="text-white">SpecGuard</span>
              <span className="text-zinc-600">]</span>
            </div>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
              v1.4
            </span>
          </div>

          {onReenterMatrix && (
            <button
              onClick={onReenterMatrix}
              title="Return to Matrix Gateway Intro screen"
              className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-400 text-[11px] text-emerald-400 hover:text-white transition-all shadow-[0_0_8px_rgba(16,185,129,0.15)] cursor-pointer"
            >
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>&lt; Re-enter Matrix</span>
            </button>
          )}
        </div>

        {/* Center: Unified Hacker Command Pill Navigation */}
        <div className="flex items-center p-0.5 bg-[#0c0d12] rounded-md border border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
          <button
            onClick={() => setMode('regex')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-all duration-150 cursor-pointer ${
              mode === 'regex'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-semibold'
                : 'text-zinc-400 hover:text-emerald-300 hover:bg-emerald-950/20 border border-transparent'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-emerald-400" />
            <span>Regex Tracer</span>
          </button>
          
          <div className="w-[1px] h-3.5 bg-emerald-500/20 mx-0.5" />

          <button
            onClick={() => setMode('json')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-all duration-150 cursor-pointer ${
              mode === 'json'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-semibold'
                : 'text-zinc-400 hover:text-emerald-300 hover:bg-emerald-950/20 border border-transparent'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>JSON Contract</span>
          </button>
        </div>

        {/* Right: Sleek Glowing Terminal Chips */}
        <div className="flex items-center gap-1.5">
          
          {/* Preset Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPresetOpen(!presetOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0c0d12] hover:bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-400 text-xs font-mono text-zinc-300 hover:text-emerald-300 transition-all hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Presets</span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-150 ${presetOpen ? 'rotate-180' : ''}`} />
            </button>

            {presetOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setPresetOpen(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-72 max-h-96 overflow-y-auto rounded-lg bg-[#0c0d12] border border-emerald-500/30 shadow-[0_0_25px_rgba(0,0,0,0.9)] p-1.5 z-50 animate-in fade-in duration-100">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400/70 border-b border-emerald-500/20 mb-1 flex items-center justify-between">
                    <span>{mode === 'regex' ? 'Regex Presets' : 'JSON Presets'}</span>
                    <span className="text-[9px] text-zinc-500">[{filteredPresets.length}]</span>
                  </div>
                  {filteredPresets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectPreset(preset);
                        setPresetOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded hover:bg-emerald-950/40 border border-transparent hover:border-emerald-500/30 text-xs font-mono transition-colors flex flex-col gap-0.5 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200 group-hover:text-emerald-300">
                          {preset.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 line-clamp-1">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Mock Sample Generator */}
          <div className="flex items-center bg-[#0c0d12] rounded border border-emerald-500/20 p-0.5">
            <button
              onClick={() => onGenerateSample(true)}
              title="Generate valid passing sample payload"
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded text-zinc-300 hover:text-emerald-300 hover:bg-emerald-950/40 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Pass</span>
            </button>
            <div className="w-[1px] h-3 bg-emerald-500/20" />
            <button
              onClick={() => onGenerateSample(false)}
              title="Generate intentional failing payload"
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded text-zinc-300 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Bug className="w-3 h-3 text-rose-400" />
              <span>Fail</span>
            </button>
          </div>

          {/* Export Code */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0c0d12] hover:bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-400 text-xs font-mono text-zinc-300 hover:text-emerald-300 transition-all hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-pointer"
          >
            <Code2 className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Share */}
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0c0d12] hover:bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-400 text-xs font-mono text-zinc-300 hover:text-emerald-300 transition-all hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-pointer"
          >
            {isCopiedShare ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {/* Tour / Guide */}
          <button
            onClick={onOpenTour}
            className="p-1 rounded bg-[#0c0d12] hover:bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-400 text-zinc-400 hover:text-emerald-300 transition-colors cursor-pointer"
            title="Press Ctrl+K for CLI Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>
    </header>
  );
};
