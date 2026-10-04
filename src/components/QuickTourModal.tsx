import React from 'react';
import { X, Binary, FileCode2, Sparkles, Activity, ShieldAlert, Terminal } from 'lucide-react';

interface QuickTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryRegex: () => void;
  onTryJson: () => void;
}

export const QuickTourModal: React.FC<QuickTourModalProps> = ({
  isOpen,
  onClose,
  onTryRegex,
  onTryJson,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-xl rounded-lg bg-[#0c0d12] border border-emerald-500/30 shadow-[0_0_35px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#07080c] border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-emerald-300">
                [SPECGUARD_CLI_GUIDE]
              </h2>
              <p className="text-[11px] text-zinc-500">
                Interactive Penetration & Data Contract Testing Suite
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-emerald-950/40 text-zinc-500 hover:text-emerald-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Features list */}
        <div className="p-4 space-y-2.5 overflow-y-auto max-h-[55vh]">
          
          <div className="p-2.5 rounded bg-[#07080c] border border-emerald-500/20 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded bg-emerald-950/60 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs space-y-0.5">
              <h4 className="font-semibold text-emerald-200">
                AST Tokenizer & Step Tracer
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Deconstructs regular expressions into semantic AST badges. Pinpoint-traces character-by-character mismatches with lookaround assertions and actionable remediation suggestions.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#07080c] border border-emerald-500/20 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded bg-emerald-950/60 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
              <FileCode2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs space-y-0.5">
              <h4 className="font-semibold text-emerald-200">
                JSON Schema Contract Diagnostics
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                3-pane live workspace with instant Draft-07 / 2020 contract validation, precise line numbers, and expected vs received pinouts.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#07080c] border border-emerald-500/20 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded bg-emerald-950/60 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs space-y-0.5">
              <h4 className="font-semibold text-emerald-200">
                Deterministic Mock Data Generator
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Instant "Pass" and "Fail" generators create valid compliant or intentionally failing payloads for regression testing.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#07080c] border border-emerald-500/20 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded bg-rose-950/60 text-rose-400 flex items-center justify-center flex-shrink-0 border border-rose-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs space-y-0.5">
              <h4 className="font-semibold text-rose-200">
                ReDoS Isolation Engine (Web Worker)
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Runs off-thread with a 200ms abort watchdog timer to prevent catastrophic backtracking freezing the interface.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#07080c] border-t border-emerald-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onTryRegex();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
            >
              <Binary className="w-3 h-3 text-emerald-400" />
              <span>Regex Tracer</span>
            </button>

            <button
              onClick={() => {
                onTryJson();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
            >
              <FileCode2 className="w-3 h-3 text-emerald-400" />
              <span>JSON Contract</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#0c0d12] hover:bg-emerald-950/40 text-zinc-400 hover:text-emerald-300 border border-emerald-500/20 text-xs transition-colors"
          >
            [CLOSE]
          </button>
        </div>

      </div>
    </div>
  );
};
