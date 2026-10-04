import type { RegexMatchResult, TraceResult } from '../types';

export interface RegexWorkerResponse {
  results: RegexMatchResult[];
  traceResult: TraceResult;
  executionTimeMs: number;
  error: string | null;
  isTimedOut: boolean;
}

const workerScript = `
function getHumanReadableLookaroundDescription(subPattern) {
  if (!subPattern) return 'condition';
  if (/\\[a-z\\]/.test(subPattern)) return 'at least one lowercase letter';
  if (/\\[A-Z\\]/.test(subPattern)) return 'at least one uppercase letter';
  if (/\\\\d|\\[0-9\\]/.test(subPattern)) return 'at least one digit (0-9)';
  if (/\\[@\\$!%*?&_\\-#\\]/.test(subPattern) || /[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>/?]/.test(subPattern)) {
    return 'at least one special symbol';
  }
  if (/\\\\w/.test(subPattern)) return 'at least one alphanumeric character';
  return 'condition "/' + subPattern + '/"';
}

function tokenizeRegex(pattern) {
  if (!pattern) return [];
  const tokens = [];
  let i = 0;
  let tokenId = 0;
  
  while (i < pattern.length) {
    const char = pattern[i];
    
    // 1. Escaped characters
    if (char === '\\\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      const raw = '\\\\' + next;
      const start = i;
      const end = i + 2;
      i += 2;
      let name = 'Escape ' + raw;
      let type = 'escape';
      if (next === 'd') { name = 'Digit [0-9]'; type = 'class'; }
      else if (next === 'D') { name = 'Non-Digit [^0-9]'; type = 'class'; }
      else if (next === 'w') { name = 'Word [a-zA-Z0-9_]'; type = 'class'; }
      else if (next === 'W') { name = 'Non-Word'; type = 'class'; }
      else if (next === 's') { name = 'Whitespace'; type = 'class'; }
      else if (next === 'S') { name = 'Non-Whitespace'; type = 'class'; }
      else if (next === 'b') { name = 'Word Boundary (\\\\b)'; type = 'anchor'; }
      else if (next === 'B') { name = 'Non-Word Boundary (\\\\B)'; type = 'anchor'; }
      tokens.push({ id: 'tok_' + (tokenId++), type, raw, name, description: name, start, end });
      continue;
    }
    
    // 2. Char Class
    if (char === '[') {
      const start = i;
      let j = i + 1;
      let escaped = false;
      while (j < pattern.length) {
        if (!escaped && pattern[j] === ']') break;
        escaped = !escaped && pattern[j] === '\\\\';
        j++;
      }
      const end = j < pattern.length ? j + 1 : pattern.length;
      const raw = pattern.slice(start, end);
      i = end;
      tokens.push({ id: 'tok_' + (tokenId++), type: 'class', raw, name: 'Char Class ' + raw, description: raw, start, end });
      continue;
    }
    
    // 3. Anchors
    if (char === '^' || char === '$') {
      tokens.push({ id: 'tok_' + (tokenId++), type: 'anchor', raw: char, name: char === '^' ? 'Start Anchor' : 'End Anchor', description: char, start: i, end: i + 1 });
      i++;
      continue;
    }
    
    // 4. Dot
    if (char === '.') {
      tokens.push({ id: 'tok_' + (tokenId++), type: 'class', raw: '.', name: 'Wildcard', description: 'Any character', start: i, end: i + 1 });
      i++;
      continue;
    }
    
    // 5. Alternation
    if (char === '|') {
      tokens.push({ id: 'tok_' + (tokenId++), type: 'alternation', raw: '|', name: 'OR', description: 'Alternation', start: i, end: i + 1 });
      i++;
      continue;
    }
    
    // 6. Lookarounds: (?=...), (?!...), (?<=...), (?<!...)
    if (
      pattern.slice(i, i + 3) === '(?=' ||
      pattern.slice(i, i + 3) === '(?!' ||
      pattern.slice(i, i + 4) === '(?<=' ||
      pattern.slice(i, i + 4) === '(?<!'
    ) {
      const start = i;
      const isPosAhead = pattern.slice(i, i + 3) === '(?=';
      const isNegAhead = pattern.slice(i, i + 3) === '(?!';
      const isPosBehind = pattern.slice(i, i + 4) === '(?<=';
      const prefixLen = isPosAhead || isNegAhead ? 3 : 4;
      
      let depth = 1;
      let j = i + prefixLen;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '\\\\') { j += 2; continue; }
        if (pattern[j] === '(') depth++;
        else if (pattern[j] === ')') depth--;
        j++;
      }
      
      const fullRaw = pattern.slice(start, j);
      const subPattern = pattern.slice(start + prefixLen, j - 1);
      i = j;
      
      const kindName = isPosAhead ? 'Positive Lookahead' : isNegAhead ? 'Negative Lookahead' : isPosBehind ? 'Positive Lookbehind' : 'Negative Lookbehind';
      const kindType = isPosAhead ? 'posAhead' : isNegAhead ? 'negAhead' : isPosBehind ? 'posBehind' : 'negBehind';
      const humanDesc = getHumanReadableLookaroundDescription(subPattern);
      
      tokens.push({
        id: 'tok_' + (tokenId++),
        type: 'lookaround',
        raw: fullRaw,
        name: kindName + ' (' + humanDesc + ')',
        description: humanDesc,
        subPattern: subPattern,
        lookaroundKind: kindType,
        start: start,
        end: j
      });
      continue;
    }
    
    // 7. Groups
    if (char === '(' || char === ')') {
      tokens.push({ id: 'tok_' + (tokenId++), type: 'group', raw: char, name: 'Group ' + char, description: 'Group', start: i, end: i + 1 });
      i++;
      continue;
    }
    
    // 8. Quantifiers
    if (char === '+' || char === '*' || char === '?') {
      tokens.push({ id: 'tok_' + (tokenId++), type: 'quantifier', raw: char, name: 'Quantifier ' + char, description: 'Quantifier', start: i, end: i + 1 });
      i++;
      continue;
    }
    
    // 9. Literals
    const start = i;
    let literalStr = '';
    const specialChars = new Set(['^', '$', '.', '[', ']', '(', ')', '{', '}', '+', '*', '?', '|', '\\\\']);
    while (i < pattern.length && !specialChars.has(pattern[i])) {
      literalStr += pattern[i];
      i++;
    }
    if (literalStr.length > 0) {
      tokens.push({ id: 'tok_' + (tokenId++), type: 'literal', raw: literalStr, name: 'Literal "' + literalStr + '"', description: literalStr, start, end: i });
    }
  }
  return tokens;
}

function traceRegex(pattern, flags, input) {
  const steps = [];
  if (!pattern || !input) {
    return { isFullMatch: false, isPartialMatch: false, matchedCharsCount: 0, steps: [] };
  }
  
  const cleanFlags = flags.replace(/g/g, '');
  const isMultiline = flags.includes('m');
  const tokens = tokenizeRegex(pattern);
  
  // 1. Evaluate lookaround assertions first
  const lookaroundTokens = tokens.filter(function(t) { return t.type === 'lookaround'; });
  for (let l = 0; l < lookaroundTokens.length; l++) {
    const lat = lookaroundTokens[l];
    const sub = lat.subPattern || '';
    const humanDesc = getHumanReadableLookaroundDescription(sub);
    let passed = false;
    try {
      if (lat.lookaroundKind === 'posAhead') {
        const reg = new RegExp(sub);
        passed = reg.test(input);
      } else if (lat.lookaroundKind === 'negAhead') {
        const reg = new RegExp(sub);
        passed = !reg.test(input);
      } else if (lat.lookaroundKind === 'posBehind') {
        const reg = new RegExp(sub + '$');
        passed = reg.test(input);
      } else if (lat.lookaroundKind === 'negBehind') {
        const reg = new RegExp(sub + '$');
        passed = !reg.test(input);
      }
    } catch(e) {
      passed = false;
    }
    
    if (!passed) {
      steps.push({
        stepNumber: 1,
        tokenIndex: lat.start,
        tokenRaw: lat.raw,
        tokenDesc: lat.name,
        charIndex: 0,
        char: input[0] || 'EOF',
        status: 'failed',
        message: 'Lookaround assertion failed: missing ' + humanDesc,
        matchedSoFar: ''
      });
      return {
        isFullMatch: false,
        isPartialMatch: false,
        matchedCharsCount: 0,
        failedAtIndex: 0,
        failedChar: input[0] || 'EOF',
        failureReason: 'Lookahead assertion failed: string does not satisfy condition (' + humanDesc + ').',
        suggestedFix: 'Add ' + humanDesc + ' to satisfy the lookahead assertion.',
        steps: steps
      };
    }
  }
  
  // 2. Test for Full Match vs Partial Match
  let isFullMatch = false;
  let isPartialMatch = false;
  let primaryMatch = null;
  
  try {
    const regFull = new RegExp('^(?:' + pattern + ')$', cleanFlags);
    isFullMatch = regFull.test(input);
    const regPartial = new RegExp(pattern, cleanFlags);
    primaryMatch = regPartial.exec(input);
    isPartialMatch = primaryMatch !== null;
    
    if (!isFullMatch && isMultiline && input.includes('\\n')) {
      const firstLine = input.split('\\n')[0];
      if (regFull.test(firstLine)) {
        isFullMatch = true;
      }
    }
  } catch(e) {}
  
  // CASE A: Full Match
  if (isFullMatch) {
    let stepCount = 0;
    let charCursor = 0;
    let matchedSoFar = '';
    
    // Step for start anchor ^
    if (pattern.startsWith('^')) {
      steps.push({
        stepNumber: ++stepCount,
        tokenIndex: 0,
        tokenRaw: '^',
        tokenDesc: 'Start of String / Line',
        charIndex: 0,
        char: input[0] || '^',
        status: 'matched',
        message: 'Asserted Start of String/Line (0 chars consumed)',
        matchedSoFar: ''
      });
    }
    
    // Step for satisfied lookarounds
    for (let l = 0; l < lookaroundTokens.length; l++) {
      const lat = lookaroundTokens[l];
      const humanDesc = getHumanReadableLookaroundDescription(lat.subPattern);
      steps.push({
        stepNumber: ++stepCount,
        tokenIndex: lat.start,
        tokenRaw: lat.raw,
        tokenDesc: lat.name,
        charIndex: 0,
        char: input[0] || '',
        status: 'matched',
        message: 'Lookaround assertion satisfied: contains ' + humanDesc + ' (0 chars consumed)',
        matchedSoFar: ''
      });
    }
    
    // Step for capture groups or segments
    if (primaryMatch && primaryMatch.groups && Object.keys(primaryMatch.groups).length > 0) {
      const groupEntries = Object.entries(primaryMatch.groups).filter(function(entry) { return entry[1] !== undefined; });
      for (let g = 0; g < groupEntries.length; g++) {
        const groupName = groupEntries[g][0];
        const groupValue = groupEntries[g][1];
        if (!groupValue) continue;
        const groupStart = input.indexOf(groupValue, charCursor);
        const actualStart = groupStart !== -1 ? groupStart : charCursor;
        const actualEnd = actualStart + groupValue.length;
        
        if (actualStart > charCursor) {
          const literalBetween = input.slice(charCursor, actualStart);
          matchedSoFar += literalBetween;
          steps.push({
            stepNumber: ++stepCount,
            tokenIndex: stepCount,
            tokenRaw: literalBetween,
            tokenDesc: 'Literal "' + literalBetween + '"',
            charIndex: charCursor,
            char: literalBetween,
            status: 'matched',
            message: 'Matched literal delimiter "' + literalBetween + '"',
            matchedSoFar: matchedSoFar
          });
        }
        
        matchedSoFar += groupValue;
        steps.push({
          stepNumber: ++stepCount,
          tokenIndex: stepCount,
          tokenRaw: '(?<' + groupName + '>...)',
          tokenDesc: 'Named Group <' + groupName + '>',
          charIndex: actualStart,
          char: groupValue,
          status: 'matched',
          message: 'Captured group <' + groupName + '>: "' + groupValue + '" (indices ' + actualStart + '..' + actualEnd + ')',
          matchedSoFar: matchedSoFar
        });
        
        charCursor = actualEnd;
      }
      
      if (charCursor < input.length) {
        const trailing = input.slice(charCursor);
        matchedSoFar += trailing;
        steps.push({
          stepNumber: ++stepCount,
          tokenIndex: stepCount,
          tokenRaw: trailing,
          tokenDesc: 'Literal "' + trailing + '"',
          charIndex: charCursor,
          char: trailing,
          status: 'matched',
          message: 'Matched segment "' + trailing + '"',
          matchedSoFar: matchedSoFar
        });
        charCursor = input.length;
      }
    } else if (primaryMatch && primaryMatch.length > 1) {
      for (let g = 1; g < primaryMatch.length; g++) {
        const val = primaryMatch[g];
        if (val === undefined) continue;
        const gStart = input.indexOf(val, charCursor);
        const actualStart = gStart !== -1 ? gStart : charCursor;
        matchedSoFar += val;
        steps.push({
          stepNumber: ++stepCount,
          tokenIndex: stepCount,
          tokenRaw: '(...)',
          tokenDesc: 'Capture Group ' + g,
          charIndex: actualStart,
          char: val,
          status: 'matched',
          message: 'Captured group #' + g + ': "' + val + '"',
          matchedSoFar: matchedSoFar
        });
        charCursor = actualStart + val.length;
      }
    } else {
      const matchText = primaryMatch ? primaryMatch[0] : input;
      matchedSoFar = matchText;
      steps.push({
        stepNumber: ++stepCount,
        tokenIndex: 1,
        tokenRaw: pattern.replace(/^\\^|\\$$/g, ''),
        tokenDesc: 'Pattern Match',
        charIndex: 0,
        char: matchText,
        status: 'matched',
        message: 'Full match verified: "' + matchText + '"',
        matchedSoFar: matchedSoFar
      });
      charCursor = matchText.length;
    }
    
    // Step for end anchor $
    if (pattern.endsWith('$')) {
      steps.push({
        stepNumber: ++stepCount,
        tokenIndex: tokens.length > 0 ? tokens.length - 1 : 1,
        tokenRaw: '$',
        tokenDesc: 'End of String / Line',
        charIndex: input.length,
        char: 'EOF',
        status: 'complete',
        message: 'Asserted End of String/Line ($). Full contract verified!',
        matchedSoFar: matchedSoFar
      });
    }
    
    return {
      isFullMatch: true,
      isPartialMatch: false,
      matchedCharsCount: input.length,
      failedAtIndex: undefined,
      failedChar: undefined,
      failureReason: undefined,
      suggestedFix: undefined,
      steps: steps
    };
  }
  
  // CASE B: Failed / Partial Match
  let longestMatchLen = 0;
  try {
    for (let k = input.length - 1; k >= 1; k--) {
      const prefix = input.slice(0, k);
      const regPre = new RegExp('^(?:' + pattern + ')', cleanFlags);
      if (regPre.test(prefix)) {
        longestMatchLen = k;
        break;
      }
    }
  } catch(e) {
    longestMatchLen = 0;
  }
  
  const failedIdx = longestMatchLen;
  const failedChar = failedIdx < input.length ? input[failedIdx] : 'EOF';
  
  steps.push({
    stepNumber: 1,
    tokenIndex: 0,
    tokenRaw: pattern.slice(0, 15),
    tokenDesc: 'Pattern Evaluation',
    charIndex: failedIdx,
    char: failedChar,
    status: 'failed',
    message: failedChar === 'EOF'
      ? 'Incomplete input: string ended prematurely before pattern was fully satisfied.'
      : 'Mismatch at index ' + failedIdx + ' ("' + failedChar + '"): character does not satisfy the required pattern token.',
    matchedSoFar: input.slice(0, failedIdx)
  });
  
  const failureReason = failedChar === 'EOF'
    ? 'Incomplete input: string ended prematurely before pattern was fully satisfied.'
    : 'Mismatch at index ' + failedIdx + ' ("' + failedChar + '"). Expected valid characters matching pattern segment, but found "' + failedChar + '".';
  
  const suggestedFix = failedChar === 'EOF'
    ? 'Provide additional required characters to complete the expression.'
    : 'Replace "' + failedChar + '" at index ' + failedIdx + ' with valid matching characters.';
  
  return {
    isFullMatch: false,
    isPartialMatch: isPartialMatch,
    matchedCharsCount: longestMatchLen,
    failedAtIndex: failedIdx,
    failedChar: failedChar,
    failureReason: failureReason,
    suggestedFix: suggestedFix,
    steps: steps
  };
}

self.onmessage = function(e) {
  const { pattern, flags, input, id } = e.data;
  const startTime = performance.now();
  
  try {
    const cleanFlags = Array.from(new Set(flags.split(''))).join('');
    const regex = new RegExp(pattern, cleanFlags);
    const results = [];
    const MAX_MATCHES = 500;
    
    if (cleanFlags.includes('g')) {
      let match;
      let count = 0;
      while ((match = regex.exec(input)) !== null && count < MAX_MATCHES) {
        const fullMatch = match[0];
        const start = match.index;
        const end = start + fullMatch.length;
        const groups = [];
        
        if (match.length > 1) {
          for (let g = 1; g < match.length; g++) {
            const groupVal = match[g];
            if (groupVal !== undefined) {
              const gStart = fullMatch.indexOf(groupVal, 0) !== -1 ? start + fullMatch.indexOf(groupVal, 0) : start;
              groups.push({ index: g, value: groupVal, start: gStart, end: gStart + groupVal.length });
            }
          }
        }
        
        if (match.groups) {
          Object.entries(match.groups).forEach(function(entry) {
            const name = entry[0];
            const val = entry[1];
            if (val !== undefined) {
              const existing = groups.find(function(g) { return g.value === val; });
              if (existing) existing.name = name;
            }
          });
        }
        
        results.push({ matchIndex: count + 1, fullMatch, start, end, groups });
        count++;
        if (fullMatch.length === 0) regex.lastIndex++;
      }
    } else {
      const match = regex.exec(input);
      if (match) {
        const fullMatch = match[0];
        const start = match.index;
        const end = start + fullMatch.length;
        const groups = [];
        for (let g = 1; g < match.length; g++) {
          const groupVal = match[g];
          if (groupVal !== undefined) {
            const gStart = fullMatch.indexOf(groupVal, 0) !== -1 ? start + fullMatch.indexOf(groupVal, 0) : start;
            groups.push({ index: g, value: groupVal, start: gStart, end: gStart + groupVal.length });
          }
        }
        if (match.groups) {
          Object.entries(match.groups).forEach(function(entry) {
            const name = entry[0];
            const val = entry[1];
            if (val !== undefined) {
              const existing = groups.find(function(g) { return g.value === val; });
              if (existing) existing.name = name;
            }
          });
        }
        results.push({ matchIndex: 1, fullMatch, start, end, groups });
      }
    }
    
    const traceResult = traceRegex(pattern, flags, input);
    const executionTimeMs = performance.now() - startTime;
    self.postMessage({ id, results, traceResult, executionTimeMs, error: null, isTimedOut: false });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const executionTimeMs = performance.now() - startTime;
    self.postMessage({
      id,
      results: [],
      traceResult: { isFullMatch: false, isPartialMatch: false, matchedCharsCount: 0, steps: [] },
      executionTimeMs,
      error: errorMsg,
      isTimedOut: false
    });
  }
};
`;

let activeWorker: Worker | null = null;
let currentRequestId = 0;
let activeTimeoutId: ReturnType<typeof setTimeout> | null = null;

function getOrCreateWorker(): Worker {
  if (!activeWorker) {
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    activeWorker = new Worker(url);
  }
  return activeWorker;
}

export function terminateCurrentWorker() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  if (activeTimeoutId) {
    clearTimeout(activeTimeoutId);
    activeTimeoutId = null;
  }
}

/**
 * Execute Regex and Token Tracing safely in an isolated Web Worker with strict 200ms abort watchdog timeout.
 */
export function runRegexInWorker(
  pattern: string,
  flags: string,
  input: string,
  timeoutMs: number = 200
): Promise<RegexWorkerResponse> {
  return new Promise((resolve) => {
    if (!pattern) {
      resolve({
        results: [],
        traceResult: { isFullMatch: false, isPartialMatch: false, matchedCharsCount: 0, steps: [] },
        executionTimeMs: 0,
        error: null,
        isTimedOut: false,
      });
      return;
    }

    terminateCurrentWorker();

    const worker = getOrCreateWorker();
    const id = ++currentRequestId;
    let isResolved = false;

    activeTimeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        terminateCurrentWorker();
        resolve({
          results: [],
          traceResult: {
            isFullMatch: false,
            isPartialMatch: false,
            matchedCharsCount: 0,
            failedAtIndex: 0,
            failureReason: 'Execution Aborted: Pattern execution exceeded 200ms limit (Possible ReDoS attack)',
            steps: [],
          },
          executionTimeMs: timeoutMs,
          error: 'Execution Aborted: Pattern execution exceeded 200ms limit (Possible ReDoS attack)',
          isTimedOut: true,
        });
      }
    }, timeoutMs);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.id === id && !isResolved) {
        isResolved = true;
        if (activeTimeoutId) {
          clearTimeout(activeTimeoutId);
          activeTimeoutId = null;
        }
        resolve({
          results: e.data.results || [],
          traceResult: e.data.traceResult || { isFullMatch: false, isPartialMatch: false, matchedCharsCount: 0, steps: [] },
          executionTimeMs: e.data.executionTimeMs || 0,
          error: e.data.error,
          isTimedOut: false,
        });
      }
    };

    worker.onerror = (err) => {
      if (!isResolved) {
        isResolved = true;
        if (activeTimeoutId) {
          clearTimeout(activeTimeoutId);
          activeTimeoutId = null;
        }
        resolve({
          results: [],
          traceResult: { isFullMatch: false, isPartialMatch: false, matchedCharsCount: 0, steps: [] },
          executionTimeMs: 0,
          error: err.message || 'Worker execution error',
          isTimedOut: false,
        });
      }
    };

    worker.postMessage({ pattern, flags, input, id });
  });
}
