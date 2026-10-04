import React, { useState } from 'react';
import type { AppMode } from '../types';
import { generateCodeSnippet } from '../utils/codeGenerators';
import { X, Copy, Check, Download, Terminal } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AppMode;
  pattern: string;
  flags: string;
  schemaStr: string;
  sampleStr: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  mode,
  pattern,
  flags,
  schemaStr,
  sampleStr,
}) => {
  const [activeLang, setActiveLang] = useState<'typescript' | 'python' | 'go' | 'rust' | 'zod'>('typescript');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const languages = [
    { id: 'typescript', name: 'TypeScript', ext: 'ts' },
    { id: 'python', name: 'Python', ext: 'py' },
    { id: 'go', name: 'Go', ext: 'go' },
    { id: 'rust', name: 'Rust', ext: 'rs' },
    { id: 'zod', name: 'Zod', ext: 'ts' },
  ] as const;

  const snippet = generateCodeSnippet(mode, activeLang, pattern, flags, schemaStr, sampleStr);

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const ext = languages.find(l => l.id === activeLang)?.ext || 'txt';
    const blob = new Blob([snippet], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `specguard_export.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-2xl rounded-lg bg-[#0c0d12] border border-emerald-500/30 shadow-[0_0_35px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-4 py-3 bg-[#07080c] border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-xs font-bold text-emerald-300">
                [EXPORT_VALIDATION_SNIPPET]
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-emerald-950/40 text-zinc-500 hover:text-emerald-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Tabs & Actions */}
        <div className="px-4 py-2 bg-[#050507] border-b border-emerald-500/15 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 p-0.5 bg-[#0c0d12] rounded border border-emerald-500/20">
            {languages.map(lang => (
              <button
                key={lang.id}
                onClick={() => setActiveLang(lang.id)}
                className={`px-2.5 py-0.5 rounded text-xs transition-all ${
                  activeLang === lang.id
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-semibold shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                    : 'text-zinc-400 hover:text-emerald-300'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0c0d12] hover:bg-emerald-950/40 text-xs font-mono text-emerald-300 border border-emerald-500/25 hover:border-emerald-400 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0c0d12] hover:bg-emerald-950/40 text-xs font-mono text-zinc-300 hover:text-emerald-300 border border-emerald-500/25 hover:border-emerald-400 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>DOWNLOAD</span>
            </button>
          </div>
        </div>

        {/* Code Display */}
        <div className="p-4 flex-1 overflow-y-auto bg-[#050507] text-xs text-emerald-100/90 leading-relaxed select-text">
          <pre className="p-3 rounded bg-[#07080c] border border-emerald-500/20 overflow-x-auto shadow-inner">
            <code>{snippet}</code>
          </pre>
        </div>

      </div>
    </div>
  );
};
