import type { RegexToken, RegexMatchResult, RegexMatchGroup, ReDoSWarning, TraceResult, TraceStep } from '../types';

/**
 * Human-readable descriptor for lookaround sub-patterns
 */
export function getHumanReadableLookaroundDescription(subPattern?: string): string {
  if (!subPattern) return 'condition';
  if (/\[a-z\]/.test(subPattern)) return 'at least one lowercase letter';
  if (/\[A-Z\]/.test(subPattern)) return 'at least one uppercase letter';
  if (/\\d|\[0-9\]/.test(subPattern)) return 'at least one digit (0-9)';
  if (/\[@\$!%*?&_\-#\]/.test(subPattern) || /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(subPattern)) {
    return 'at least one special symbol';
  }
  if (/\\w/.test(subPattern)) return 'at least one alphanumeric character';
  return `sub-pattern condition "/${subPattern}/"`;
}

/**
 * Tokenize a Regular Expression pattern into semantic AST badges.
 */
export function tokenizeRegex(pattern: string): RegexToken[] {
  if (!pattern) return [];

  const tokens: RegexToken[] = [];
  let i = 0;
  let tokenId = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    // 1. Escaped characters: \d, \w, \s, \b, \B, etc.
    if (char === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      const raw = '\\' + next;
      const start = i;
      const end = i + 2;
      i += 2;

      let name = `Escape ${raw}`;
      let description = `Matches literal character '${next}'`;
      let type: RegexToken['type'] = 'escape';

      switch (next) {
        case 'd':
          name = 'Digit [0-9]';
          description = 'Matches any ASCII decimal digit (0-9)';
          type = 'class';
          break;
        case 'D':
          name = 'Non-Digit [^0-9]';
          description = 'Matches any character that is not a decimal digit';
          type = 'class';
          break;
        case 'w':
          name = 'Word Character [a-zA-Z0-9_]';
          description = 'Matches any alphanumeric character including underscore';
          type = 'class';
          break;
        case 'W':
          name = 'Non-Word Character';
          description = 'Matches any character that is not a word character';
          type = 'class';
          break;
        case 's':
          name = 'Whitespace';
          description = 'Matches spaces, tabs, line breaks, and form feeds';
          type = 'class';
          break;
        case 'S':
          name = 'Non-Whitespace';
          description = 'Matches any character that is not whitespace';
          type = 'class';
          break;
        case 'b':
          name = 'Word Boundary (\\b)';
          description = 'Zero-width assertion: matches at a word/non-word transition boundary';
          type = 'anchor';
          break;
        case 'B':
          name = 'Non-Word Boundary (\\B)';
          description = 'Zero-width assertion: matches at any position that is not a word boundary';
          type = 'anchor';
          break;
        case 'n':
          name = 'Newline (LF)';
          description = 'Matches a line feed character (ASCII 10)';
          break;
        case 'r':
          name = 'Carriage Return (CR)';
          description = 'Matches a carriage return character (ASCII 13)';
          break;
        case 't':
          name = 'Tab';
          description = 'Matches a horizontal tab character (ASCII 9)';
          break;
        default:
          name = `Escaped '${next}'`;
          description = `Matches the literal character '${next}'`;
      }

      tokens.push({
        id: `tok_${tokenId++}`,
        type,
        raw,
        name,
        description,
        start,
        end,
      });
      continue;
    }

    // 2. Character Classes: [...] and [^...]
    if (char === '[') {
      const start = i;
      let j = i + 1;
      let isNegated = false;
      if (pattern[j] === '^') {
        isNegated = true;
        j++;
      }
      let escaped = false;
      while (j < pattern.length) {
        if (!escaped && pattern[j] === ']') {
          break;
        }
        escaped = !escaped && pattern[j] === '\\';
        j++;
      }
      const end = j < pattern.length ? j + 1 : pattern.length;
      const raw = pattern.slice(start, end);
      i = end;

      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'class',
        raw,
        name: isNegated ? `Negated Class ${raw}` : `Char Class ${raw}`,
        description: isNegated
          ? `Matches any character NOT present in the set ${raw}`
          : `Matches any single character present in the set ${raw}`,
        start,
        end,
      });
      continue;
    }

    // 3. Anchors: ^ and $
    if (char === '^') {
      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'anchor',
        raw: '^',
        name: 'Start of String / Line',
        description: 'Zero-width assertion: asserts position at the beginning of the string or line (with m flag)',
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }
    if (char === '$') {
      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'anchor',
        raw: '$',
        name: 'End of String / Line',
        description: 'Zero-width assertion: asserts position at the end of the string or line (with m flag)',
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // 4. Dot Wildcard: .
    if (char === '.') {
      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'class',
        raw: '.',
        name: 'Wildcard Any Character',
        description: 'Matches any single character except line terminators (or all chars with s flag)',
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // 5. Alternation: |
    if (char === '|') {
      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'alternation',
        raw: '|',
        name: 'Alternation (OR)',
        description: 'Matches either the expression before or after the pipe operator',
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // 6. Lookaround Assertions: (?=...), (?!...), (?<=...), (?<!...)
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
        if (pattern[j] === '\\') {
          j += 2;
          continue;
        }
        if (pattern[j] === '(') depth++;
        else if (pattern[j] === ')') depth--;
        j++;
      }

      const fullRaw = pattern.slice(start, j);
      const subPattern = pattern.slice(start + prefixLen, j - 1);
      i = j;

      const kindName = isPosAhead
        ? 'Positive Lookahead'
        : isNegAhead
        ? 'Negative Lookahead'
        : isPosBehind
        ? 'Positive Lookbehind'
        : 'Negative Lookbehind';
      const kindType = isPosAhead ? 'posAhead' : isNegAhead ? 'negAhead' : isPosBehind ? 'posBehind' : 'negBehind';
      const humanDesc = getHumanReadableLookaroundDescription(subPattern);

      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'lookaround',
        raw: fullRaw,
        name: `${kindName} (${humanDesc})`,
        description: `Zero-width assertion: ensures ${humanDesc} ${
          isPosAhead || isPosBehind ? 'is present' : 'is absent'
        } without consuming characters`,
        subPattern,
        lookaroundKind: kindType,
        start,
        end: j,
      });
      continue;
    }

    // 7. Named & Non-Capturing Groups
    if (char === '(') {
      const start = i;
      let raw = '(';
      let name = 'Capturing Group';
      let description = 'Groups multiple tokens together and creates a numbered capture group';
      let groupType: RegexToken['groupType'] = 'capturing';
      let groupName: string | undefined = undefined;

      if (pattern.slice(i, i + 3) === '(?:') {
        raw = '(?:';
        name = 'Non-Capturing Group';
        description = 'Groups tokens for precedence or quantifier without creating a capture group';
        groupType = 'non-capturing';
        i += 3;
      } else if (pattern.slice(i, i + 3) === '(?<') {
        const closeNameIdx = pattern.indexOf('>', i + 3);
        if (closeNameIdx !== -1) {
          groupName = pattern.slice(i + 3, closeNameIdx);
          raw = `(?<${groupName}>`;
          name = `Named Group <${groupName}>`;
          description = `Creates a named capture group accessible via groups.${groupName}`;
          groupType = 'named';
          i = closeNameIdx + 1;
        } else {
          i += 3;
        }
      } else {
        i++;
      }

      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'group',
        raw,
        name,
        description,
        groupType,
        groupName,
        start,
        end: i,
      });
      continue;
    }

    if (char === ')') {
      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'group',
        raw: ')',
        name: 'End Group',
        description: 'Closes the current group boundary',
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // 8. Quantifiers: +, *, ?, {n}, {n,m}, {n,}
    if (char === '+' || char === '*' || char === '?') {
      let raw = char;
      const start = i;
      let isLazy = false;
      if (i + 1 < pattern.length && pattern[i + 1] === '?') {
        raw += '?';
        isLazy = true;
        i += 2;
      } else {
        i++;
      }

      let name = 'Quantifier';
      let description = '';
      if (raw.startsWith('+')) {
        name = isLazy ? 'Quantifier 1+ (Lazy)' : 'Quantifier 1 or more (+)';
        description = isLazy
          ? 'Matches 1 or more occurrences, matching as few as possible'
          : 'Matches 1 or more consecutive occurrences (greedy)';
      } else if (raw.startsWith('*')) {
        name = isLazy ? 'Quantifier 0+ (Lazy)' : 'Quantifier 0 or more (*)';
        description = isLazy
          ? 'Matches 0 or more occurrences, matching as few as possible'
          : 'Matches 0 or more occurrences (greedy)';
      } else if (raw.startsWith('?')) {
        name = isLazy ? 'Quantifier 0 or 1 (Lazy)' : 'Quantifier Optional (?)';
        description = isLazy
          ? 'Matches 0 or 1 occurrence, preferring 0'
          : 'Matches 0 or 1 occurrence (optional item)';
      }

      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'quantifier',
        raw,
        name,
        description,
        start,
        end: i,
      });
      continue;
    }

    if (char === '{') {
      const start = i;
      const closeIdx = pattern.indexOf('}', i);
      if (closeIdx !== -1) {
        let raw = pattern.slice(start, closeIdx + 1);
        let end = closeIdx + 1;
        let isLazy = false;
        if (end < pattern.length && pattern[end] === '?') {
          raw += '?';
          isLazy = true;
          end++;
        }
        i = end;
        tokens.push({
          id: `tok_${tokenId++}`,
          type: 'quantifier',
          raw,
          name: `Range Quantifier ${raw}`,
          description: `Matches the specified repetition count bounds ${raw}${isLazy ? ' (lazy)' : ' (greedy)'}`,
          start,
          end,
        });
        continue;
      }
    }

    // 9. Literals: accumulate plain text
    const start = i;
    let literalStr = '';
    const specialChars = new Set(['^', '$', '.', '[', ']', '(', ')', '{', '}', '+', '*', '?', '|', '\\']);
    while (i < pattern.length && !specialChars.has(pattern[i])) {
      literalStr += pattern[i];
      i++;
    }

    if (literalStr.length > 0) {
      tokens.push({
        id: `tok_${tokenId++}`,
        type: 'literal',
        raw: literalStr,
        name: `Literal "${literalStr}"`,
        description: `Matches the exact literal character sequence "${literalStr}"`,
        start,
        end: i,
      });
    }
  }

  return tokens;
}

/**
 * Static ReDoS Vulnerability & Exponential Backtracking Detector
 */
export function checkReDoS(pattern: string): boolean {
  if (!pattern) return false;
  // Only flag true exponential nested quantifiers like (a+)+, (a*)*, ([a-z]+)+, (\w+)+, (a|aa)+, ((a+))+
  // Delimited repetitions like (?:\.[a-z0-9]+)* or (?:-[a-z]+)* are safe because prefix delimiters prevent exponential ambiguity.
  const directNestedQuantifier = /\((?:\?[:<][a-zA-Z0-9_-]+>)?(?:\[[^\]]+\]|\\[wWdDsS]|[a-zA-Z0-9])[+*]\)[+*{]/;
  const directParenNesting = /\(\([^()]+\)[+*]?\)[+*{]/;
  const overlappingAlternation = /\((?:[a-zA-Z0-9]+\|[a-zA-Z0-9]+)\)[+*{]/;

  return directNestedQuantifier.test(pattern) || directParenNesting.test(pattern) || overlappingAlternation.test(pattern);
}

export function analyzeReDoS(pattern: string): ReDoSWarning {
  if (!pattern) {
    return { isVulnerable: false, level: 'safe', message: 'Pattern is empty.', dangerousPatterns: [] };
  }

  const isVulnerable = checkReDoS(pattern);

  if (isVulnerable) {
    const dangerousMatches: string[] = [];
    const m1 = pattern.match(/\((?:\?[:<][a-zA-Z0-9_-]+>)?(?:\[[^\]]+\]|\\[wWdDsS]|[a-zA-Z0-9])[+*]\)[+*{]/g);
    const m2 = pattern.match(/\(\([^()]+\)[+*]?\)[+*{]/g);
    const m3 = pattern.match(/\((?:[a-zA-Z0-9]+\|[a-zA-Z0-9]+)\)[+*{]/g);
    if (m1) dangerousMatches.push(...m1);
    if (m2) dangerousMatches.push(...m2);
    if (m3) dangerousMatches.push(...m3);

    return {
      isVulnerable: true,
      level: 'high',
      message: '⚠️ ReDoS Hazard: Exponential Backtracking Detected',
      dangerousPatterns: dangerousMatches.length > 0 ? Array.from(new Set(dangerousMatches)) : ['Nested quantifier construct'],
    };
  }

  return {
    isVulnerable: false,
    level: 'safe',
    message: '✓ Pattern analyzed: ReDoS safe. No dangerous exponential backtracking constructs found.',
    dangerousPatterns: [],
  };
}

/**
 * Execute Regular Expression with timing and match extraction.
 */
export function executeRegex(
  pattern: string,
  flags: string,
  input: string
): { results: RegexMatchResult[]; executionTimeMs: number; error: string | null } {
  if (!pattern) {
    return { results: [], executionTimeMs: 0, error: null };
  }

  const startTime = performance.now();

  try {
    const cleanFlags = Array.from(new Set(flags.split(''))).join('');
    const regex = new RegExp(pattern, cleanFlags);
    const results: RegexMatchResult[] = [];

    if (cleanFlags.includes('g')) {
      let match: RegExpExecArray | null;
      let count = 0;
      const MAX_MATCHES = 1000;

      while ((match = regex.exec(input)) !== null && count < MAX_MATCHES) {
        const fullMatch = match[0];
        const start = match.index;
        const end = start + fullMatch.length;

        const groups: RegexMatchGroup[] = [];
        if (match.length > 1) {
          for (let g = 1; g < match.length; g++) {
            const groupVal = match[g];
            if (groupVal !== undefined) {
              const gStart = fullMatch.indexOf(groupVal, 0) !== -1 ? start + fullMatch.indexOf(groupVal, 0) : start;
              groups.push({
                index: g,
                value: groupVal,
                start: gStart,
                end: gStart + groupVal.length,
              });
            }
          }
        }

        if (match.groups) {
          Object.entries(match.groups).forEach(([name, val]) => {
            if (val !== undefined) {
              const existing = groups.find(g => g.value === val);
              if (existing) {
                existing.name = name;
              }
            }
          });
        }

        results.push({
          matchIndex: count + 1,
          fullMatch,
          start,
          end,
          groups,
        });

        count++;

        if (fullMatch.length === 0) {
          regex.lastIndex++;
        }
      }
    } else {
      const match = regex.exec(input);
      if (match) {
        const fullMatch = match[0];
        const start = match.index;
        const end = start + fullMatch.length;
        const groups: RegexMatchGroup[] = [];

        for (let g = 1; g < match.length; g++) {
          const groupVal = match[g];
          if (groupVal !== undefined) {
            const gStart = fullMatch.indexOf(groupVal, 0) !== -1 ? start + fullMatch.indexOf(groupVal, 0) : start;
            groups.push({
              index: g,
              value: groupVal,
              start: gStart,
              end: gStart + groupVal.length,
            });
          }
        }

        if (match.groups) {
          Object.entries(match.groups).forEach(([name, val]) => {
            if (val !== undefined) {
              const existing = groups.find(g => g.value === val);
              if (existing) {
                existing.name = name;
              }
            }
          });
        }

        results.push({
          matchIndex: 1,
          fullMatch,
          start,
          end,
          groups,
        });
      }
    }

    const executionTimeMs = performance.now() - startTime;
    return { results, executionTimeMs, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const executionTimeMs = performance.now() - startTime;
    return { results: [], executionTimeMs, error: errorMsg };
  }
}

/**
 * Step-by-Step Character-by-Character Tracer with full Zero-Width Assertion & Lookaround Support.
 */
export function traceRegexMatch(pattern: string, flags: string, input: string): TraceResult {
  const steps: TraceStep[] = [];
  if (!pattern || !input) {
    return {
      isFullMatch: false,
      isPartialMatch: false,
      matchedCharsCount: 0,
      steps: [],
    };
  }

  const cleanFlags = flags.replace(/g/g, '');
  const isMultiline = flags.includes('m');
  const tokens = tokenizeRegex(pattern);

  // 1. Evaluate lookaround assertions first
  const lookaroundTokens = tokens.filter(t => t.type === 'lookaround');
  for (const lat of lookaroundTokens) {
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
        const reg = new RegExp(`${sub}$`);
        passed = reg.test(input);
      } else if (lat.lookaroundKind === 'negBehind') {
        const reg = new RegExp(`${sub}$`);
        passed = !reg.test(input);
      }
    } catch {
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
        message: `Lookaround assertion failed: missing ${humanDesc}`,
        matchedSoFar: '',
      });
      return {
        isFullMatch: false,
        isPartialMatch: false,
        matchedCharsCount: 0,
        failedAtIndex: 0,
        failedChar: input[0] || 'EOF',
        failureReason: `Lookahead assertion failed: string does not satisfy condition (${humanDesc}).`,
        suggestedFix: `Add ${humanDesc} to satisfy the lookahead assertion.`,
        steps,
      };
    }
  }

  // 2. Test for Full Match vs Partial Match
  let isFullMatch = false;
  let isPartialMatch = false;
  let primaryMatch: RegExpExecArray | null = null;

  try {
    const regFull = new RegExp(`^(?:${pattern})$`, cleanFlags);
    isFullMatch = regFull.test(input);

    const regPartial = new RegExp(pattern, cleanFlags);
    primaryMatch = regPartial.exec(input);
    isPartialMatch = primaryMatch !== null;

    if (!isFullMatch && isMultiline && input.includes('\n')) {
      const firstLine = input.split('\n')[0];
      if (regFull.test(firstLine)) {
        isFullMatch = true;
      }
    }
  } catch {
    // ignore
  }

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
        matchedSoFar: '',
      });
    }

    // Step for satisfied lookarounds
    for (const lat of lookaroundTokens) {
      const humanDesc = getHumanReadableLookaroundDescription(lat.subPattern);
      steps.push({
        stepNumber: ++stepCount,
        tokenIndex: lat.start,
        tokenRaw: lat.raw,
        tokenDesc: lat.name,
        charIndex: 0,
        char: input[0] || '',
        status: 'matched',
        message: `Lookaround assertion satisfied: contains ${humanDesc} (0 chars consumed)`,
        matchedSoFar: '',
      });
    }

    // Step for capture groups or segments
    if (primaryMatch && primaryMatch.groups && Object.keys(primaryMatch.groups).length > 0) {
      const groupEntries = Object.entries(primaryMatch.groups).filter(([_, val]) => val !== undefined);
      for (const [groupName, groupValue] of groupEntries) {
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
            tokenDesc: `Literal "${literalBetween}"`,
            charIndex: charCursor,
            char: literalBetween,
            status: 'matched',
            message: `Matched literal delimiter "${literalBetween}"`,
            matchedSoFar,
          });
        }

        matchedSoFar += groupValue;
        steps.push({
          stepNumber: ++stepCount,
          tokenIndex: stepCount,
          tokenRaw: `(?<${groupName}>...)`,
          tokenDesc: `Named Group <${groupName}>`,
          charIndex: actualStart,
          char: groupValue,
          status: 'matched',
          message: `Captured group <${groupName}>: "${groupValue}" (indices ${actualStart}..${actualEnd})`,
          matchedSoFar,
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
          tokenDesc: `Literal "${trailing}"`,
          charIndex: charCursor,
          char: trailing,
          status: 'matched',
          message: `Matched segment "${trailing}"`,
          matchedSoFar,
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
          tokenRaw: `(...)`,
          tokenDesc: `Capture Group ${g}`,
          charIndex: actualStart,
          char: val,
          status: 'matched',
          message: `Captured group #${g}: "${val}"`,
          matchedSoFar,
        });
        charCursor = actualStart + val.length;
      }
    } else {
      const matchText = primaryMatch ? primaryMatch[0] : input;
      matchedSoFar = matchText;
      steps.push({
        stepNumber: ++stepCount,
        tokenIndex: 1,
        tokenRaw: pattern.replace(/^\^|\$$/g, ''),
        tokenDesc: 'Pattern Match',
        charIndex: 0,
        char: matchText,
        status: 'matched',
        message: `Full match verified: "${matchText}"`,
        matchedSoFar,
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
        matchedSoFar,
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
      steps,
    };
  }

  // CASE B: Failed / Partial Match
  let longestMatchLen = 0;
  try {
    for (let k = input.length - 1; k >= 1; k--) {
      const prefix = input.slice(0, k);
      const regPre = new RegExp(`^(?:${pattern})`, cleanFlags);
      if (regPre.test(prefix)) {
        longestMatchLen = k;
        break;
      }
    }
  } catch {
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
      : `Mismatch at index ${failedIdx} ('${failedChar}'): character does not satisfy the required pattern token.`,
    matchedSoFar: input.slice(0, failedIdx),
  });

  const failureReason = failedChar === 'EOF'
    ? 'Incomplete input: string ended prematurely before pattern was fully satisfied.'
    : `Mismatch at index ${failedIdx} ('${failedChar}'). Expected valid characters matching pattern segment, but found '${failedChar}'.`;

  const suggestedFix = failedChar === 'EOF'
    ? 'Provide additional required characters to complete the expression.'
    : `Replace '${failedChar}' at index ${failedIdx} with valid matching characters.`;

  return {
    isFullMatch: false,
    isPartialMatch,
    matchedCharsCount: longestMatchLen,
    failedAtIndex: failedIdx,
    failedChar,
    failureReason,
    suggestedFix,
    steps,
  };
}
