import React, { useState } from 'react';
import type { RegexMatchResult } from '../types';
import { Layers, Copy, Check, ChevronDown, ChevronRight, Hash, Tag, FileText } from 'lucide-react';

interface MatchInspectorProps {
  matches: RegexMatchResult[];
}

export const MatchInspector: React.FC<MatchInspectorProps> = ({ matches }) => {
  const [expandedMatches, setExpandedMatches] = useState<Record<number, boolean>>({ 1: true });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedMatches(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-[#0c0d12] border border-emerald-500/20 text-center font-mono">
        <div className="w-8 h-8 rounded-full bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
          <Layers className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-semibold text-zinc-300">NO_MATCHES_FOUND</h4>
        <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
          Adjust regular expression pattern or provide matching input telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-3.5 py-2 bg-[#07080c] border-b border-emerald-500/15 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-xs text-emerald-400 font-semibold">
            [MATCH_INSPECTOR]
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            {matches.length} {matches.length === 1 ? 'MATCH' : 'MATCHES'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
          <button
            onClick={() => {
              const allExpanded = matches.reduce((acc, m) => ({ ...acc, [m.matchIndex]: true }), {});
              setExpandedMatches(allExpanded);
            }}
            className="hover:text-emerald-300 transition-colors"
          >
            expand_all
          </button>
          <span>•</span>
          <button
            onClick={() => setExpandedMatches({})}
            className="hover:text-emerald-300 transition-colors"
          >
            collapse
          </button>
        </div>
      </div>

      <div className="divide-y divide-emerald-500/10 max-h-80 overflow-y-auto">
        {matches.map(m => {
          const isExpanded = !!expandedMatches[m.matchIndex];
          const hasGroups = m.groups && m.groups.length > 0;

          return (
            <div key={m.matchIndex} className="hover:bg-emerald-950/20 transition-colors">
              <div 
                className="px-3.5 py-2 flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleExpand(m.matchIndex)}
              >
                <div className="flex items-center gap-2 min-w-0 font-mono">
                  <button className="text-emerald-400/70 hover:text-emerald-300 transition-colors">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>

                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    #{m.matchIndex}
                  </span>

                  <span className="text-[11px] text-zinc-500">
                    [{m.start}:{m.end}]
                  </span>

                  <span className="text-xs text-emerald-200 truncate max-w-xs md:max-w-md bg-[#07080c] px-2 py-0.5 rounded border border-emerald-500/20">
                    {m.fullMatch}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {hasGroups && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-400/80 border border-emerald-500/20">
                      {m.groups.length} {m.groups.length === 1 ? 'grp' : 'grps'}
                    </span>
                  )}
                  <button
                    onClick={() => copyText(`match_${m.matchIndex}`, m.fullMatch)}
                    className="p-1 rounded hover:bg-emerald-950/60 text-zinc-400 hover:text-emerald-300 transition-colors"
                    title="Copy match string"
                  >
                    {copiedId === `match_${m.matchIndex}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible details for capture groups */}
              {isExpanded && (
                <div className="px-5 pb-2.5 pt-1.5 bg-[#07080c]/80 border-t border-emerald-500/10">
                  {hasGroups ? (
                    <div className="space-y-1 mt-0.5">
                      <div className="text-[10px] uppercase font-mono text-emerald-500/60 font-semibold">
                        [CAPTURE_GROUPS]
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {m.groups.map(grp => (
                          <div 
                            key={grp.index}
                            className="flex items-center justify-between p-1.5 rounded bg-[#0c0d12] border border-emerald-500/20 text-xs font-mono"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {grp.name ? (
                                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-semibold">
                                  <Tag className="w-2.5 h-2.5 text-emerald-400" />
                                  {grp.name}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/5">
                                  <Hash className="w-2.5 h-2.5" />
                                  grp_{grp.index}
                                </span>
                              )}
                              <span className="text-zinc-200 truncate max-w-[140px]">
                                "{grp.value}"
                              </span>
                            </div>
                            <button
                              onClick={() => copyText(`grp_${m.matchIndex}_${grp.index}`, grp.value)}
                              className="p-1 rounded hover:bg-emerald-950 text-zinc-400 hover:text-emerald-300 transition-colors"
                              title="Copy group text"
                            >
                              {copiedId === `grp_${m.matchIndex}_${grp.index}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-500 italic py-0.5 flex items-center gap-1.5 font-mono">
                      <FileText className="w-3 h-3 text-zinc-600" />
                      Full expression match without explicit capture groups.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
