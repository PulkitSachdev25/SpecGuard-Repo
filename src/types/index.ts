export type AppMode = 'regex' | 'json';

export interface RegexToken {
  id: string;
  type: 'anchor' | 'quantifier' | 'class' | 'group' | 'literal' | 'escape' | 'lookaround' | 'alternation' | 'special';
  raw: string;
  name: string;
  description: string;
  start: number;
  end: number;
  groupType?: 'capturing' | 'named' | 'non-capturing';
  groupName?: string;
  subPattern?: string;
  lookaroundKind?: 'posAhead' | 'negAhead' | 'posBehind' | 'negBehind';
  quantifierRange?: { min: number; max: number | null; lazy: boolean };
}


export interface RegexMatchGroup {
  index: number;
  name?: string;
  value: string;
  start: number;
  end: number;
}

export interface RegexMatchResult {
  matchIndex: number;
  fullMatch: string;
  start: number;
  end: number;
  groups: RegexMatchGroup[];
}

export interface ReDoSWarning {
  isVulnerable: boolean;
  level: 'safe' | 'low' | 'medium' | 'high';
  message: string;
  dangerousPatterns: string[];
}

export interface TraceStep {
  stepNumber: number;
  tokenIndex: number;
  tokenRaw: string;
  tokenDesc: string;
  charIndex: number;
  char: string;
  status: 'matched' | 'failed' | 'backtracked' | 'complete';
  message: string;
  matchedSoFar: string;
}

export interface TraceResult {
  isFullMatch: boolean;
  isPartialMatch: boolean;
  matchedCharsCount: number;
  failedAtIndex?: number;
  failedChar?: string;
  failureReason?: string;
  suggestedFix?: string;
  steps: TraceStep[];
}

export interface JsonValidationError {
  id: string;
  path: string;
  lineNumber?: number;
  column?: number;
  keyword: string;
  message: string;
  expected?: string;
  received?: string;
  severity: 'error' | 'warning';
  fixSuggestion?: string;
}

export interface JsonValidationResult {
  isValid: boolean;
  errors: JsonValidationError[];
  executionTimeMs: number;
  schemaValid: boolean;
  schemaError?: string;
  jsonSyntaxValid: boolean;
  jsonSyntaxError?: string;
}

export interface PresetItem {
  id: string;
  name: string;
  category: 'Regex' | 'JSON Contract';
  mode: AppMode;
  description: string;
  tags: string[];
  regexData?: {
    pattern: string;
    flags: string;
    testString: string;
  };
  jsonData?: {
    schema: string;
    sample: string;
  };
}
