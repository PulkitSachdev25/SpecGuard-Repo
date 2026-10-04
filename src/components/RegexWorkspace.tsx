import React, { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import type { RegexToken, ReDoSWarning, TraceResult, RegexMatchResult } from '../types';
import { tokenizeRegex, analyzeReDoS } from '../utils/regexParser';
import { runRegexInWorker, terminateCurrentWorker } from '../utils/regexWorkerRunner';
import { MatchInspector } from './MatchInspector';
import { StepTracerPanel } from './StepTracerPanel';
import { 
  Layers, 
  Activity, 
  Trash2, 
  Copy, 
  Check, 
  Flame, 
  AlertTriangle, 
  Loader2,
  Terminal
} from 'lucide-react';

interface RegexWorkspaceProps {
  pattern: string;
  setPattern: (p: string) => void;
  flags: string;
  setFlags: (f: string) => void;
  testString: string;
  setTestString: (t: string) => void;
  onBenchmarkUpdate: (timeMs: number, matchCount: number) => void;
}

export const RegexWorkspace: React.FC<RegexWorkspaceProps> = ({
  pattern,
  setPattern,
  flags,
  setFlags,
  testString,
  setTestString,
  onBenchmarkUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'tracer'>('inspector');
  const [copied, setCopied] = useState(false);
  const [hoveredToken, setHoveredToken] = useState<RegexToken | null>(null);

  // Execution state from isolated Web Worker
  const [execution, setExecution] = useState<{
    results: RegexMatchResult[];
    traceResult: TraceResult;
    executionTimeMs: number;
    error: string | null;
    isTimedOut: boolean;
  }>({
    results: [],
    traceResult: { isFullMatch: false, isPartialMatch: false, matchedCharsCount: 0, steps: [] },
    executionTimeMs: 0,
    error: null,
    isTimedOut: false,
  });
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Available flags
  const flagOptions = [
    { key: 'g', label: 'global', desc: 'Global search' },
    { key: 'i', label: 'insensitive', desc: 'Case-insensitive' },
    { key: 'm', label: 'multiline', desc: 'Multiline (^ and $)' },
    { key: 's', label: 'dotAll', desc: 'dot matches newline' },
    { key: 'u', label: 'unicode', desc: 'Unicode code points' },
  ];

  const toggleFlag = (flagKey: string) => {
    if (flags.includes(flagKey)) {
      setFlags(flags.replace(flagKey, ''));
    } else {
      setFlags(flags + flagKey);
    }
  };

  // 1. Static AST Tokenizer
  const tokens = useMemo(() => tokenizeRegex(pattern), [pattern]);

  // 2. Static ReDoS Safety Analysis
  const redosAnalysis: ReDoSWarning = useMemo(() => analyzeReDoS(pattern), [pattern]);

  // 3. Isolated Web Worker Regex Execution with strict 200ms abort watchdog
  useEffect(() => {
    let isMounted = true;
    setIsEvaluating(true);

    runRegexInWorker(pattern, flags, testString, 200).then((res) => {
      if (!isMounted) return;
      setIsEvaluating(false);
      setExecution({
        results: res.results,
        traceResult: res.traceResult,
        executionTimeMs: res.executionTimeMs,
        error: res.error,
        isTimedOut: !!res.isTimedOut,
      });
      onBenchmarkUpdate(res.executionTimeMs, res.results.length);
    });

    return () => {
      isMounted = false;
      terminateCurrentWorker();
    };
  }, [pattern, flags, testString, onBenchmarkUpdate]);

  // Sync scroll between textarea and backdrop overlay in lockstep
  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useLayoutEffect(() => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, [testString]);

  const copyPattern = () => {
    navigator.clipboard.writeText(`/${pattern}/${flags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleStressReDoS = () => {
    setPattern('(a+)+$');
    setTestString('a'.repeat(30) + '!');
  };

  // Developer font typography styles for pixel-perfect lockstep alignment
  const editorTypographyStyles: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: '13px',
    lineHeight: '1.6',
    padding: '12px 14px',
    letterSpacing: '-0.02em',
    boxSizing: 'border-box',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
    margin: 0,
    border: '1px solid transparent',
  };

  // Render vivid electric green highlights behind matched substrings
  const renderHighlightedText = () => {
    if (!pattern || execution.results.length === 0 || execution.isTimedOut) {
      return (
        <>
          <span>{testString}</span>
          {testString.endsWith('\n') && '\n'}
        </>
      );
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    execution.results.forEach((match, mIdx) => {
      if (match.start > lastIndex) {
        elements.push(
          <span key={`unmatched_${lastIndex}_${mIdx}`}>
            {testString.slice(lastIndex, match.start)}
          </span>
        );
      }

      elements.push(
        <mark
          key={`match_${match.matchIndex}_${match.start}`}
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            boxShadow: '0 0 10px rgba(0, 255, 136, 0.25)',
            borderBottom: '2px solid #00ff88',
            color: 'transparent',
            padding: '1px 0',
            margin: 0,
            borderRadius: '2px',
            display: 'inline',
          }}
        >
          {match.fullMatch}
        </mark>
      );

      lastIndex = match.end;
    });

    if (lastIndex < testString.length) {
      elements.push(
        <span key={`unmatched_tail_${lastIndex}`}>
          {testString.slice(lastIndex)}
        </span>
      );
    }

    if (testString.endsWith('\n')) {
      elements.push('\n');
    }

    return elements;
  };

  return (
    <div className="space-y-3">
      
      {/* 1. COMPACT TERMINAL COMMAND PROMPT & TOKENIZER */}
      <div className="surface-card p-3 sm:p-4">
        <div className="flex flex-col gap-2.5">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-semibold">[PROMPT]</span>
              
              {redosAnalysis.isVulnerable || execution.isTimedOut ? (
                <span className="flex items-center gap-1 text-[11px] text-[#ff0055] font-bold danger-pulse px-1.5 py-0.2 rounded bg-rose-950/50 border border-rose-500/40">
                  ● RE_DOS_ALERT
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981]" />
                  ● SEC_CLEAN
                </span>
              )}

              {isEvaluating && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400/80 font-mono ml-1">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  eval...
                </span>
              )}
            </div>

            <button
              onClick={copyPattern}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#07080c] hover:bg-emerald-950/40 text-[11px] font-mono text-zinc-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-400 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'copied' : 'copy'}</span>
            </button>
          </div>

          {/* Interactive Command Prompt: root@specguard:~# / <pattern> / flags */}
          <div className="flex items-center bg-[#07080c] border border-emerald-500/25 rounded-md p-1.5 focus-within:border-emerald-400 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all">
            <div className="flex items-center gap-1 px-2 select-none text-emerald-400/90 font-mono text-xs font-semibold whitespace-nowrap">
              <Terminal className="w-3 h-3 text-emerald-400 inline" />
              <span>root@specguard:~#</span>
              <span className="text-zinc-600 pl-1">/</span>
            </div>

            <input
              type="text"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="regular_expression..."
              className="flex-1 bg-transparent text-emerald-100 font-mono text-xs sm:text-sm outline-hidden placeholder:text-zinc-700 font-medium tracking-wide selection:bg-emerald-500/40"
              spellCheck={false}
            />

            <span className="text-zinc-600 font-mono text-xs px-1 select-none">/</span>

            {/* Flags toggles */}
            <div className="flex items-center gap-0.5 pl-1.5 pr-0.5 border-l border-emerald-500/20">
              {flagOptions.map(f => {
                const isActive = flags.includes(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleFlag(f.key)}
                    title={`${f.key}: ${f.label} — ${f.desc}`}
                    className={`w-5 h-5 rounded flex items-center justify-center font-mono text-xs transition-all ${
                      isActive
                        ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/40 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                        : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {f.key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ReDoS Alert Banner */}
          {execution.isTimedOut && (
            <div className="p-2.5 rounded bg-[#ff0055]/10 border border-[#ff0055]/40 text-xs font-mono text-[#ff0055] flex items-start gap-2 danger-pulse">
              <AlertTriangle className="w-4 h-4 text-[#ff0055] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">EXECUTION_ABORTED:</span> Pattern exceeded 200ms runtime limit. Isolated Web Worker terminated to safeguard browser thread.
              </div>
            </div>
          )}

          {/* Regex Syntax Error */}
          {!execution.isTimedOut && execution.error && (
            <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 text-xs font-mono text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span>{execution.error}</span>
            </div>
          )}

          {/* Sleek Token Rail */}
          <div className="pt-2 border-t border-emerald-500/15">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                <span className="text-emerald-500/70">[TOKENS]</span>
                <span>({tokens.length})</span>
              </div>
              {hoveredToken && (
                <span className="text-[11px] font-mono text-emerald-300">
                  {hoveredToken.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
              {tokens.map(token => (
                <div
                  key={token.id}
                  onMouseEnter={() => setHoveredToken(token)}
                  onMouseLeave={() => setHoveredToken(null)}
                  className="border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1.5 flex-shrink-0 cursor-default hover:border-emerald-400 hover:text-white transition-colors"
                >
                  <span className="font-bold text-emerald-200">{token.raw}</span>
                  <span className="text-[10px] text-emerald-500/70 border-l border-emerald-500/20 pl-1">{token.name}</span>
                </div>
              ))}
              {tokens.length === 0 && (
                <span className="text-xs text-zinc-600 font-mono italic">No tokens parsed.</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 2. STREAMLINED TEST BUFFER BOX */}
      <div className="surface-card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-emerald-500/70 font-semibold">[INPUT_BUFFER]</span>
            <span className="text-[10px] text-zinc-500">
              {testString.length}B • {testString.split('\n').length}L
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleStressReDoS}
              title="Test catastrophic backtracking with 30-char exponential payload"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#07080c] hover:bg-amber-950/40 text-[11px] font-mono text-zinc-400 hover:text-amber-300 border border-emerald-500/20 hover:border-amber-500/40 transition-colors"
            >
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Stress ReDoS</span>
            </button>
            <button
              onClick={() => setTestString('')}
              className="p-1 rounded hover:bg-emerald-950/40 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Clear Buffer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Highlight Overlay Textarea Container */}
        <div className="relative rounded bg-[#07080c] border border-emerald-500/20 min-h-[140px] max-h-[220px] overflow-hidden focus-within:border-emerald-400 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          {/* Backdrop Highlight Layer */}
          <div
            ref={backdropRef}
            style={{
              ...editorTypographyStyles,
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              pointerEvents: 'none',
              userSelect: 'none',
              color: 'transparent',
              backgroundColor: 'transparent',
            }}
            aria-hidden="true"
          >
            {renderHighlightedText()}
          </div>

          {/* Actual Foreground Textarea */}
          <textarea
            ref={textareaRef}
            value={testString}
            onChange={e => setTestString(e.target.value)}
            onScroll={handleScroll}
            placeholder="enter candidate test strings to evaluate..."
            style={{
              ...editorTypographyStyles,
              position: 'relative',
              width: '100%',
              height: '140px',
              backgroundColor: 'transparent',
              color: '#f8fafc',
              outline: 'none',
              resize: 'vertical',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
            spellCheck={false}
          />
        </div>
      </div>

      {/* 3. INSPECTION / TRACER COMMAND TABS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-emerald-500/15 pb-1.5">
          <div className="flex items-center gap-1 p-0.5 bg-[#07080c] rounded border border-emerald-500/20">
            <button
              onClick={() => setActiveTab('inspector')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
                activeTab === 'inspector'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-semibold shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'text-zinc-400 hover:text-emerald-300'
              }`}
            >
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>Inspector [{execution.results.length}]</span>
            </button>

            <button
              onClick={() => setActiveTab('tracer')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
                activeTab === 'tracer'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-semibold shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'text-zinc-400 hover:text-emerald-300'
              }`}
            >
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Step Tracer</span>
            </button>
          </div>
        </div>

        {activeTab === 'inspector' ? (
          <MatchInspector matches={execution.results} />
        ) : (
          <StepTracerPanel traceResult={execution.traceResult} inputString={testString} />
        )}
      </div>

    </div>
  );
};
