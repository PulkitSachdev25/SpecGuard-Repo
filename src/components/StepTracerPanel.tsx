import React, { useState, useEffect } from 'react';
import type { TraceResult } from '../types';
import { Play, Pause, SkipForward, RotateCcw, AlertTriangle, CheckCircle2, Sparkles, Terminal } from 'lucide-react';

interface StepTracerPanelProps {
  traceResult: TraceResult;
  inputString: string;
}

export const StepTracerPanel: React.FC<StepTracerPanelProps> = ({ traceResult, inputString }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playbackSpeed = 500;

  const steps = traceResult.steps || [];
  const maxStep = steps.length > 0 ? steps.length - 1 : 0;

  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(false);
  }, [traceResult]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStepIdx < maxStep) {
          setCurrentStepIdx(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx, maxStep, playbackSpeed]);

  const activeStep = steps[currentStepIdx] || null;

  return (
    <div className="surface-card overflow-hidden flex flex-col font-mono">
      {/* Header bar */}
      <div className="px-3.5 py-2 bg-[#07080c] border-b border-emerald-500/15 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400 font-semibold">
            [STEP_TRACER]
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.2 rounded border font-semibold ${
            traceResult.isFullMatch 
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : traceResult.isPartialMatch
              ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
              : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
          }`}>
            {traceResult.isFullMatch ? 'FULL_MATCH' : traceResult.isPartialMatch ? 'PARTIAL_MATCH' : 'MISMATCH'}
          </span>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-1 bg-[#0c0d12] p-0.5 rounded border border-emerald-500/20">
          <button
            onClick={() => setCurrentStepIdx(0)}
            className="p-1 rounded hover:bg-emerald-950/50 text-zinc-400 hover:text-emerald-300 transition-colors"
            title="Reset"
            disabled={steps.length === 0}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-xs font-mono transition-all hover:shadow-[0_0_8px_rgba(16,185,129,0.3)]"
            disabled={steps.length === 0}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 text-emerald-400" />
                <span>pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-emerald-400" />
                <span>play</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              if (currentStepIdx < maxStep) setCurrentStepIdx(prev => prev + 1);
            }}
            className="p-1 rounded hover:bg-emerald-950/50 text-zinc-400 hover:text-emerald-300 transition-colors"
            title="Step forward"
            disabled={currentStepIdx >= maxStep || steps.length === 0}
          >
            <SkipForward className="w-3 h-3" />
          </button>

          <span className="text-[10px] font-mono text-zinc-500 px-1.5 border-l border-emerald-500/20">
            {steps.length > 0 ? currentStepIdx + 1 : 0} / {steps.length}
          </span>
        </div>
      </div>

      {/* Diagnostic Banners */}
      {(!traceResult.isFullMatch || activeStep?.status === 'failed' || traceResult.failedAtIndex !== undefined) ? (
        <div className="px-3.5 py-2 bg-amber-950/30 border-b border-amber-500/30 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-amber-200">
              {activeStep?.status === 'failed' 
                ? `STEP_${activeStep.stepNumber}_FAIL:` 
                : 'DIAGNOSTIC:'}
            </span>{' '}
            <span className="text-amber-300">
              {traceResult.failedAtIndex !== undefined
                ? `Mismatch at index ${traceResult.failedAtIndex}${traceResult.failedChar ? ` ('${traceResult.failedChar}')` : ''}. ${traceResult.failureReason || ''}`
                : traceResult.failureReason || 'Pattern could not be verified across candidate input.'}
            </span>
            {traceResult.suggestedFix && (
              <div className="mt-1 text-[11px] text-emerald-300 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span>Fix: {traceResult.suggestedFix}</span>
              </div>
            )}
          </div>
        </div>
      ) : traceResult.isFullMatch && steps.length > 0 && !steps.some(s => s.status === 'failed') ? (
        <div className="px-3.5 py-1.5 bg-emerald-950/40 border-b border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Full regular expression contract verified successfully across all tokens.</span>
        </div>
      ) : null}

      {/* Interactive Character Stream Tape */}
      <div className="p-3 bg-[#07080c] border-b border-emerald-500/15">
        <div className="text-[10px] font-mono text-zinc-500 mb-1.5 flex items-center justify-between">
          <span className="text-emerald-500/60">[CHAR_STREAM_TAPE]</span>
          <span>CURSOR: INDEX {activeStep ? activeStep.charIndex : 0}</span>
        </div>

        <div className="flex flex-wrap gap-1 items-center font-mono text-xs overflow-x-auto py-0.5">
          {inputString.split('').map((ch, idx) => {
            const isTarget = activeStep && activeStep.charIndex === idx;
            const isMatchedBefore = activeStep && idx < activeStep.charIndex;
            const isFailed = !traceResult.isFullMatch && traceResult.failedAtIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => {
                  const stepForIdx = steps.findIndex(s => s.charIndex === idx);
                  if (stepForIdx !== -1) setCurrentStepIdx(stepForIdx);
                }}
                className={`relative flex flex-col items-center justify-center min-w-[24px] h-8 px-1 rounded cursor-pointer transition-all border ${
                  isFailed
                    ? 'bg-rose-950/80 border-rose-500/60 text-rose-200 danger-pulse'
                    : isTarget
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : isMatchedBefore
                    ? 'bg-[#0c0d12] border-emerald-500/30 text-emerald-300'
                    : 'bg-[#050507] border-emerald-500/10 text-zinc-600 hover:border-emerald-500/40'
                }`}
                title={`Index: ${idx} | Char: "${ch}"`}
              >
                <span className="font-semibold text-xs">{ch === ' ' ? '␣' : ch === '\n' ? '↵' : ch}</span>
                <span className="text-[8px] text-zinc-600">{idx}</span>
              </div>
            );
          })}
          {inputString.length === 0 && (
            <span className="text-xs text-zinc-600 font-mono italic py-1">No characters to trace.</span>
          )}
        </div>
      </div>

      {/* Active Step Live Details */}
      {activeStep && (
        <div className="p-3 bg-[#0c0d12] flex-1">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-semibold">
                STEP_{activeStep.stepNumber}
              </span>
              <span className="text-xs px-1.5 py-0.2 rounded bg-[#07080c] text-emerald-400 border border-emerald-500/20 font-bold">
                {activeStep.tokenRaw}
              </span>
              <span className="text-xs text-zinc-400">
                {activeStep.tokenDesc}
              </span>
            </div>

            <span className={`text-[10px] uppercase px-1.5 py-0.2 rounded font-bold ${
              activeStep.status === 'matched' || activeStep.status === 'complete'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
            }`}>
              {activeStep.status}
            </span>
          </div>

          <div className="p-2 rounded bg-[#07080c] border border-emerald-500/20 text-xs text-emerald-200/90 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>{activeStep.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
