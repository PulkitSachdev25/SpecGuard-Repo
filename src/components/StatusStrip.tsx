import React from 'react';
import type { AppMode } from '../types';
import { Terminal, ShieldCheck, ShieldAlert } from 'lucide-react';

interface StatusStripProps {
  mode: AppMode;
  executionTimeMs: number;
  matchCountOrIsValid: number | boolean;
  charCount: number;
  lineCount: number;
  isReDoS?: boolean;
  hasError?: boolean;
}

export const StatusStrip: React.FC<StatusStripProps> = ({
  mode,
  executionTimeMs,
  matchCountOrIsValid,
  charCount,
  lineCount,
  isReDoS = false,
  hasError = false,
}) => {
  const isRegex = mode === 'regex';
  const matchCount = typeof matchCountOrIsValid === 'number' ? matchCountOrIsValid : 0;
  const isJsonValid = typeof matchCountOrIsValid === 'boolean' ? matchCountOrIsValid : false;

  const formattedLatency = executionTimeMs < 0.1 ? '<0.1ms' : `${executionTimeMs.toFixed(2)}ms`;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-emerald-500/20 bg-[#050507]/95 backdrop-blur-md px-3 lg:px-6 py-1.5 text-xs font-mono select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        
        {/* CLI System Monitor Telemetry */}
        <div className="flex items-center gap-2.5 text-[11px] whitespace-nowrap">
          
          {/* Security Status */}
          {isReDoS ? (
            <span className="flex items-center gap-1.5 text-[#ff0055] font-semibold tracking-wider danger-pulse px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-500/40">
              <ShieldAlert className="w-3 h-3 text-[#ff0055]" />
              <span>● RE_DOS_ALERT</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              <span>SEC_CLEAN</span>
            </span>
          )}

          <span className="text-zinc-700">|</span>

          {/* System OK / Error */}
          {hasError ? (
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span>SYS_WARN</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981]" />
              <span>SYS_OK</span>
            </span>
          )}

          <span className="text-zinc-700">|</span>

          {/* Match / Contract State */}
          {isRegex ? (
            matchCount > 0 ? (
              <span className="text-emerald-300 font-semibold">
                {matchCount} {matchCount === 1 ? 'MATCH' : 'MATCHES'}
              </span>
            ) : (
              <span className="text-zinc-500">
                0 MATCHES
              </span>
            )
          ) : isJsonValid ? (
            <span className="text-emerald-300 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>VALID_CONTRACT</span>
            </span>
          ) : (
            <span className="text-rose-400 font-semibold">
              CONTRACT_FAIL
            </span>
          )}

          <span className="text-zinc-700">|</span>

          {/* Latency Benchmark */}
          <span className="text-zinc-400">
            LATENCY: <span className="text-emerald-300 font-semibold">{formattedLatency}</span>
          </span>

          <span className="text-zinc-700 hidden md:inline">|</span>

          {/* Engine Isolate */}
          <span className="text-zinc-500 hidden md:inline">
            ENGINE: <span className="text-zinc-300">V8_ISOLATE</span>
          </span>
        </div>

        {/* Right Telemetry */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 whitespace-nowrap">
          <span className="hidden sm:inline">
            BUF: <span className="text-zinc-400">{charCount}B / {lineCount}L</span>
          </span>
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <span className="text-emerald-500/70 flex items-center gap-1">
            <Terminal className="w-3 h-3 inline" />
            <kbd className="px-1 py-0.2 rounded bg-zinc-900 border border-emerald-500/20 text-emerald-300 text-[10px]">CTRL+K</kbd>
          </span>
        </div>

      </div>
    </footer>
  );
};
