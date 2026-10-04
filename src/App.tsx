import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppMode, PresetItem } from './types';

import { PRESETS } from './utils/presets';
import { generateRegexMock, generateJsonMock } from './utils/mockGenerators';
import { analyzeReDoS } from './utils/regexParser';
import { Navbar } from './components/Navbar';
import { RegexWorkspace } from './components/RegexWorkspace';
import { JsonWorkspace } from './components/JsonWorkspace';
import { ExportModal } from './components/ExportModal';
import { QuickTourModal } from './components/QuickTourModal';
import { StatusStrip } from './components/StatusStrip';
import { MatrixGateway } from './components/MatrixGateway';

export const App: React.FC = () => {
  // Matrix Gateway state
  const [hasEntered, setHasEntered] = useState<boolean>(false);

  // Mode state
  const [mode, setMode] = useState<AppMode>('regex');

  // Regex Workspace state
  const defaultRegexPreset = PRESETS[0];
  const [pattern, setPattern] = useState<string>(defaultRegexPreset.regexData?.pattern || '^v?(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)$');
  const [flags, setFlags] = useState<string>(defaultRegexPreset.regexData?.flags || 'gm');
  const [testString, setTestString] = useState<string>(defaultRegexPreset.regexData?.testString || 'v2.4.1\nv0.9.0-rc.1\n3.14.159');

  // JSON Contract Workspace state
  const defaultJsonPreset = PRESETS.find(p => p.mode === 'json') || PRESETS[6];
  const [schemaStr, setSchemaStr] = useState<string>(defaultJsonPreset.jsonData?.schema || '{}');
  const [sampleStr, setSampleStr] = useState<string>(defaultJsonPreset.jsonData?.sample || '{}');

  // Benchmark metrics
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(0.05);
  const [matchCountOrIsValid, setMatchCountOrIsValid] = useState<number | boolean>(1);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isCopiedShare, setIsCopiedShare] = useState<boolean>(false);

  // Hash state serialization & loading
  useEffect(() => {
    try {
      if (window.location.hash && window.location.hash.length > 2) {
        const raw = decodeURIComponent(window.location.hash.slice(1));
        const parsed = JSON.parse(raw);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.pattern) setPattern(parsed.pattern);
        if (parsed.flags) setFlags(parsed.flags);
        if (parsed.testString) setTestString(parsed.testString);
        if (parsed.schemaStr) setSchemaStr(parsed.schemaStr);
        if (parsed.sampleStr) setSampleStr(parsed.sampleStr);
        setHasEntered(true);
      }
    } catch {
      // ignore invalid hash
    }
  }, []);

  const handleShare = useCallback(() => {
    const payload = {
      mode,
      pattern,
      flags,
      testString,
      schemaStr,
      sampleStr,
    };
    const hash = '#' + encodeURIComponent(JSON.stringify(payload));
    window.history.replaceState(null, '', hash);
    navigator.clipboard.writeText(window.location.href);
    setIsCopiedShare(true);
    setTimeout(() => setIsCopiedShare(false), 2000);
  }, [mode, pattern, flags, testString, schemaStr, sampleStr]);

  const handleSelectPreset = (preset: PresetItem) => {
    setMode(preset.mode);
    if (preset.mode === 'regex' && preset.regexData) {
      setPattern(preset.regexData.pattern);
      setFlags(preset.regexData.flags);
      setTestString(preset.regexData.testString);
    } else if (preset.mode === 'json' && preset.jsonData) {
      setSchemaStr(preset.jsonData.schema);
      setSampleStr(preset.jsonData.sample);
    }
  };

  const handleGenerateSample = (shouldPass: boolean) => {
    if (mode === 'regex') {
      const generated = generateRegexMock(pattern, shouldPass);
      if (flags.includes('g') && shouldPass) {
        setTestString(`${generated}\n${generated}\n${generateRegexMock(pattern, false)}`);
      } else {
        setTestString(generated);
      }
    } else {
      const generated = generateJsonMock(schemaStr, shouldPass);
      setSampleStr(generated);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsTourOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isReDoS = useMemo(() => {
    if (mode !== 'regex') return false;
    return analyzeReDoS(pattern).isVulnerable;
  }, [mode, pattern]);

  const charCount = mode === 'regex' ? testString.length : sampleStr.length;
  const lineCount = mode === 'regex' ? testString.split('\n').length : sampleStr.split('\n').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#050507] text-[#f8fafc] font-mono selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* 1. Interactive Matrix Gateway Screen */}
      {!hasEntered && (
        <MatrixGateway
          onSelectMode={(selectedMode) => {
            setMode(selectedMode);
            setHasEntered(true);
          }}
        />
      )}

      {/* Background cyber dot grid pattern */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-cyber-grid opacity-70" />

      {/* Top Navigation */}
      <Navbar
        mode={mode}
        setMode={setMode}
        onSelectPreset={handleSelectPreset}
        onGenerateSample={handleGenerateSample}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
        onShare={handleShare}
        isCopiedShare={isCopiedShare}
        onReenterMatrix={() => setHasEntered(false)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 lg:p-5 pb-20 space-y-4">
        
        {mode === 'regex' ? (
          <RegexWorkspace
            pattern={pattern}
            setPattern={setPattern}
            flags={flags}
            setFlags={setFlags}
            testString={testString}
            setTestString={setTestString}
            onBenchmarkUpdate={(timeMs, matchCount) => {
              setExecutionTimeMs(timeMs);
              setMatchCountOrIsValid(matchCount);
            }}
          />
        ) : (
          <JsonWorkspace
            schemaStr={schemaStr}
            setSchemaStr={setSchemaStr}
            sampleStr={sampleStr}
            setSampleStr={setSampleStr}
            onBenchmarkUpdate={(timeMs, isValid) => {
              setExecutionTimeMs(timeMs);
              setMatchCountOrIsValid(isValid);
            }}
          />
        )}

      </main>

      {/* Bottom Status Strip */}
      <StatusStrip
        mode={mode}
        executionTimeMs={executionTimeMs}
        matchCountOrIsValid={matchCountOrIsValid}
        charCount={charCount}
        lineCount={lineCount}
        isReDoS={isReDoS}
      />

      {/* Code Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        mode={mode}
        pattern={pattern}
        flags={flags}
        schemaStr={schemaStr}
        sampleStr={sampleStr}
      />

      {/* Quick Tour / Guide Modal */}
      <QuickTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onTryRegex={() => {
          setMode('regex');
          setIsTourOpen(false);
        }}
        onTryJson={() => {
          setMode('json');
          setIsTourOpen(false);
        }}
      />

    </div>
  );
};

export default App;
