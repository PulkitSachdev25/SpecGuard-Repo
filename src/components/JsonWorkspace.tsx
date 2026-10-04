import React, { useState, useMemo, useEffect } from 'react';
import type { JsonValidationResult } from '../types';
import { validateJsonContract } from '../utils/jsonValidator';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  AlignLeft, 
  Minimize2, 
  ListTree, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface JsonWorkspaceProps {
  schemaStr: string;
  setSchemaStr: (s: string) => void;
  sampleStr: string;
  setSampleStr: (s: string) => void;
  onBenchmarkUpdate: (timeMs: number, isValid: boolean) => void;
}

export const JsonWorkspace: React.FC<JsonWorkspaceProps> = ({
  schemaStr,
  setSchemaStr,
  sampleStr,
  setSampleStr,
  onBenchmarkUpdate,
}) => {
  const [activeRightTab, setActiveRightTab] = useState<'diagnostics' | 'tree'>('diagnostics');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);

  // Validate Contract
  const validation: JsonValidationResult = useMemo(() => {
    const res = validateJsonContract(schemaStr, sampleStr);
    onBenchmarkUpdate(res.executionTimeMs, res.isValid);
    return res;
  }, [schemaStr, sampleStr, onBenchmarkUpdate]);

  // Trigger confetti when fixing all contract errors to valid state
  useEffect(() => {
    if (validation.isValid && sampleStr.trim().length > 0) {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.85 },
        colors: ['#10b981', '#00ff88', '#6ee7b7'],
      });
    }
  }, [validation.isValid, sampleStr]);

  const formatJson = (type: 'schema' | 'sample') => {
    try {
      if (type === 'schema') {
        const obj = JSON.parse(schemaStr);
        setSchemaStr(JSON.stringify(obj, null, 2));
      } else {
        const obj = JSON.parse(sampleStr);
        setSampleStr(JSON.stringify(obj, null, 2));
      }
    } catch {
      // ignore
    }
  };

  const minifyJson = (type: 'schema' | 'sample') => {
    try {
      if (type === 'schema') {
        const obj = JSON.parse(schemaStr);
        setSchemaStr(JSON.stringify(obj));
      } else {
        const obj = JSON.parse(sampleStr);
        setSampleStr(JSON.stringify(obj));
      }
    } catch {
      // ignore
    }
  };

  const parsedSchema = useMemo(() => {
    try {
      return JSON.parse(schemaStr);
    } catch {
      return null;
    }
  }, [schemaStr]);

  return (
    <div className="space-y-3 font-mono">
      
      {/* 3-PANE CYBER WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        
        {/* PANE 1: JSON SCHEMA DEFINITION (4 cols) */}
        <div className="lg:col-span-4 surface-card p-3 flex flex-col h-[540px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-semibold">
                [SCHEMA_CONTRACT]
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => formatJson('schema')}
                className="p-1 rounded hover:bg-emerald-950/40 text-zinc-500 hover:text-emerald-300 transition-colors"
                title="Format JSON"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => minifyJson('schema')}
                className="p-1 rounded hover:bg-emerald-950/40 text-zinc-500 hover:text-emerald-300 transition-colors"
                title="Minify JSON"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(schemaStr);
                  setCopiedSchema(true);
                  setTimeout(() => setCopiedSchema(false), 1500);
                }}
                className="p-1 rounded hover:bg-emerald-950/40 text-zinc-500 hover:text-emerald-300 transition-colors"
                title="Copy Schema"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="relative flex-1 rounded bg-[#07080c] border border-emerald-500/20 overflow-hidden focus-within:border-emerald-400 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <textarea
              value={schemaStr}
              onChange={e => setSchemaStr(e.target.value)}
              placeholder="JSON Schema specification..."
              className="w-full h-full p-2.5 font-mono text-xs leading-relaxed bg-transparent text-emerald-100 outline-hidden resize-none placeholder:text-zinc-700"
              spellCheck={false}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Draft-07 / 2020</span>
            <span>{schemaStr.split('\n').length} lines</span>
          </div>
        </div>

        {/* PANE 2: SAMPLE JSON PAYLOAD (4 cols) */}
        <div className="lg:col-span-4 surface-card p-3 flex flex-col h-[540px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-semibold">
                [PAYLOAD_BUFFER]
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => formatJson('sample')}
                className="p-1 rounded hover:bg-emerald-950/40 text-zinc-500 hover:text-emerald-300 transition-colors"
                title="Format JSON"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => minifyJson('sample')}
                className="p-1 rounded hover:bg-emerald-950/40 text-zinc-500 hover:text-emerald-300 transition-colors"
                title="Minify JSON"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sampleStr);
                  setCopiedSample(true);
                  setTimeout(() => setCopiedSample(false), 1500);
                }}
                className="p-1 rounded hover:bg-emerald-950/40 text-zinc-500 hover:text-emerald-300 transition-colors"
                title="Copy Payload"
              >
                {copiedSample ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setSampleStr('')}
                className="p-1 rounded hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 transition-colors"
                title="Clear Payload"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 rounded bg-[#07080c] border border-emerald-500/20 overflow-hidden focus-within:border-emerald-400 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <textarea
              value={sampleStr}
              onChange={e => setSampleStr(e.target.value)}
              placeholder="candidate JSON telemetry payload..."
              className="w-full h-full p-2.5 font-mono text-xs leading-relaxed bg-transparent text-emerald-100 outline-hidden resize-none placeholder:text-zinc-700"
              spellCheck={false}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
            <span>{sampleStr.length} chars</span>
            <span>{sampleStr.split('\n').length} lines</span>
          </div>
        </div>

        {/* PANE 3: LIVE CONTRACT DIAGNOSTICS (4 cols) */}
        <div className="lg:col-span-4 surface-card p-3 flex flex-col h-[540px]">
          
          {/* Header tabs */}
          <div className="flex items-center justify-between mb-2 border-b border-emerald-500/15 pb-1.5">
            <div className="flex items-center gap-1 p-0.5 bg-[#07080c] rounded border border-emerald-500/20">
              <button
                onClick={() => setActiveRightTab('diagnostics')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs transition-all ${
                  activeRightTab === 'diagnostics'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-zinc-400 hover:text-emerald-300'
                }`}
              >
                <Layers className="w-3 h-3 text-emerald-400" />
                <span>Diagnostics [{validation.errors.length}]</span>
              </button>

              <button
                onClick={() => setActiveRightTab('tree')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs transition-all ${
                  activeRightTab === 'tree'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-zinc-400 hover:text-emerald-300'
                }`}
              >
                <ListTree className="w-3 h-3 text-emerald-400" />
                <span>Tree</span>
              </button>
            </div>
          </div>

          {/* Validation Status Banner */}
          <div className={`p-2.5 rounded border mb-2 flex items-center justify-between transition-all ${
            validation.isValid
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300 danger-pulse'
          }`}>
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              )}
              <div>
                <div className="font-bold text-xs">
                  {validation.isValid ? 'VALID_CONTRACT' : 'CONTRACT_VIOLATIONS'}
                </div>
                <div className="text-[10px] opacity-80">
                  {validation.isValid
                    ? '0 schema errors'
                    : `${validation.errors.length} issue(s) detected`}
                </div>
              </div>
            </div>

            <span className="text-[10px] text-zinc-400">
              {validation.executionTimeMs < 0.1 ? '<0.1ms' : `${validation.executionTimeMs.toFixed(2)}ms`}
            </span>
          </div>

          {/* Tab 1: Detailed Error Pinouts */}
          {activeRightTab === 'diagnostics' ? (
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-none">
              {validation.errors.map(err => (
                <div
                  key={err.id}
                  className="p-2 rounded bg-[#07080c] border border-rose-500/30 hover:border-rose-500/60 transition-colors text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                      {err.path}
                    </span>
                    {err.lineNumber && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-white/5">
                        line {err.lineNumber}
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-300 text-[11px] leading-snug">
                    {err.message}
                  </p>

                  {err.expected && (
                    <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-rose-500/15">
                      <span className="text-zinc-500">Exp:</span>
                      <span className="text-emerald-400">{err.expected}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-zinc-600" />
                      <span className="text-rose-400">{err.received}</span>
                    </div>
                  )}

                  {err.fixSuggestion && (
                    <div className="text-[10px] text-amber-300 flex items-center gap-1 pt-0.5">
                      <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span>{err.fixSuggestion}</span>
                    </div>
                  )}
                </div>
              ))}

              {validation.isValid && (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-950/60 flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/30">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-emerald-300">100% CONTRACT COMPLIANCE</h5>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                    All types, properties, and constraints verified.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Schema Structure Tree */
            <div className="flex-1 overflow-y-auto bg-[#07080c] p-2.5 rounded border border-emerald-500/15 text-xs">
              {parsedSchema ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase text-emerald-500/70 font-semibold">
                    {parsedSchema.title || 'Root'} ({parsedSchema.type || 'object'})
                  </div>
                  {parsedSchema.properties ? (
                    <div className="space-y-1 pl-2 border-l border-emerald-500/20">
                      {Object.entries(parsedSchema.properties).map(([key, prop]: [string, any]) => {
                        const isRequired = Array.isArray(parsedSchema.required) && parsedSchema.required.includes(key);
                        return (
                          <div key={key} className="p-1 rounded bg-[#0c0d12] border border-emerald-500/15 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-emerald-200">{key}</span>
                              {isRequired && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950/60 text-rose-300 border border-rose-500/30 font-bold">
                                  req
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              {prop.type || 'any'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-zinc-600 italic">No explicit properties defined.</div>
                  )}
                </div>
              ) : (
                <div className="text-zinc-600 italic">Invalid Schema syntax.</div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
