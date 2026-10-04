import { tokenizeRegex, analyzeReDoS, checkReDoS, executeRegex, traceRegexMatch } from '../src/utils/regexParser';
import { validateJsonContract } from '../src/utils/jsonValidator';
import { generateCodeSnippet } from '../src/utils/codeGenerators';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) console.error(`    Details: ${detail}`);
  }
}

console.log('\n============================================================');
console.log('  SPECGUARD COMPREHENSIVE DIAGNOSTIC TEST SUITE');
console.log('============================================================\n');

// -------------------------------------------------------------
// TEST SUITE A: Regex Tracer & Inspector
// -------------------------------------------------------------
console.log('Test Suite A: Regex Tracer, Inspector & Zero-Width Assertions');

// 1. Lookahead Password Validation
const passwordPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,20}$';
const passwordFlags = 'gm';
const passwordInput = `Secret123!
weakpass
NoSpecialChar99
S3cret!`;

const execResult = executeRegex(passwordPattern, passwordFlags, passwordInput);
assert(execResult.results.length === 1, 'Match Inspector captures exactly 1 valid match for multiline passwords', `Got ${execResult.results.length} matches`);
assert(execResult.results[0]?.fullMatch === 'Secret123!', 'Valid line "Secret123!" is accurately matched');

// Test Step Tracer on failing lines
const tracePass = traceRegexMatch(passwordPattern, passwordFlags, 'Secret123!');
assert(tracePass.isFullMatch === true, 'Step Tracer passes "Secret123!" with all lookaheads verified');

const traceFailWeak = traceRegexMatch(passwordPattern, passwordFlags, 'weakpass');
assert(traceFailWeak.isFullMatch === false, 'Step Tracer fails "weakpass"');
assert(
  !traceFailWeak.suggestedFix?.includes('(?='),
  'Suggestion copy for "weakpass" contains no raw "(?=" regex syntax',
  `Suggested fix: ${traceFailWeak.suggestedFix}`
);
assert(
  traceFailWeak.failureReason?.includes('uppercase') || traceFailWeak.failureReason?.includes('digit') || traceFailWeak.failureReason?.includes('special'),
  'Failure reason accurately explains missing character class for "weakpass"',
  `Failure reason: ${traceFailWeak.failureReason}`
);

const traceFailNoSpecial = traceRegexMatch(passwordPattern, passwordFlags, 'NoSpecialChar99');
assert(traceFailNoSpecial.isFullMatch === false, 'Step Tracer fails "NoSpecialChar99"');
assert(
  traceFailNoSpecial.failureReason?.includes('special') || traceFailNoSpecial.suggestedFix?.includes('special'),
  'Explains missing special symbol for "NoSpecialChar99"',
  `Reason: ${traceFailNoSpecial.failureReason}`
);

// 2. Named Groups, SemVer & Quantifier Step Tracing
const semverPresetPattern = '^v?(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<prerelease>(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$';
const traceSemVer1 = traceRegexMatch(semverPresetPattern, 'gm', '2.4.1');
assert(traceSemVer1.isFullMatch === true, 'Step Tracer correctly passes "2.4.1" (without optional leading v) as FULL_MATCH');
assert(!traceSemVer1.failureReason?.includes('Quantifier ?'), 'Step Tracer never emits bogus "expected Quantifier ?" errors');

const traceSemVer2 = traceRegexMatch(semverPresetPattern, 'gm', 'v2.4.1');
assert(traceSemVer2.isFullMatch === true, 'Step Tracer correctly passes "v2.4.1" as FULL_MATCH');

const unicodeEmailPattern = '(?<user>[a-zA-Z\\u00C0-\\u017F]+)@(?<domain>[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})';
const unicodeEmailFlags = 'gu';
const unicodeInput = 'renée@example.com';
const unicodeExec = executeRegex(unicodeEmailPattern, unicodeEmailFlags, unicodeInput);

assert(unicodeExec.results.length === 1, 'Unicode email matched');
const userGroup = unicodeExec.results[0]?.groups.find(g => g.name === 'user');
const domainGroup = unicodeExec.results[0]?.groups.find(g => g.name === 'domain');
assert(userGroup?.value === 'renée', 'Named group <user> captured as "renée"', `Got: ${userGroup?.value}`);
assert(domainGroup?.value === 'example.com', 'Named group <domain> captured as "example.com"', `Got: ${domainGroup?.value}`);

// 3. Zero-Length Match Loop Protection
const zeroLenPattern = '^|a*|$';
const zeroLenInput = 'abc';
const startTime = performance.now();
const zeroLenExec = executeRegex(zeroLenPattern, 'g', zeroLenInput);
const duration = performance.now() - startTime;
assert(duration < 100, 'Zero-length match pattern terminates rapidly without infinite loop', `Duration: ${duration}ms`);
assert(zeroLenExec.results.length > 0, 'Zero-length matches collected safely');

// 4. Static ReDoS Detection
const emailPattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
const redosPattern = '(a+)+$';

assert(checkReDoS(semverPresetPattern) === false, 'checkReDoS correctly identifies SemVer preset as safe (false)');
const semverAnalysis = analyzeReDoS(semverPresetPattern);
assert(semverAnalysis.isVulnerable === false, 'SemVer preset returns isVulnerable: false ("ReDoS Safe")');
assert(semverAnalysis.level === 'safe', 'SemVer preset level is "safe"');

assert(checkReDoS(emailPattern) === false, 'checkReDoS correctly identifies Email preset as safe (false)');
const emailAnalysis = analyzeReDoS(emailPattern);
assert(emailAnalysis.isVulnerable === false, 'Email preset returns isVulnerable: false ("ReDoS Safe")');

assert(checkReDoS(redosPattern) === true, 'checkReDoS detects exponential nested quantifier in (a+)+$ (true)');
const redosAnalysis = analyzeReDoS(redosPattern);
assert(redosAnalysis.isVulnerable === true, 'Static analyzer detects exponential ReDoS on (a+)+$');
assert(redosAnalysis.message.includes('ReDoS Hazard'), 'Returns "ReDoS Hazard" status message');

// -------------------------------------------------------------
// TEST SUITE B: JSON Contract Diagnostics
// -------------------------------------------------------------
console.log('\nTest Suite B: JSON Contract Diagnostics & Recovery');

// 1. Strict Validation & Multiple Error Detection
const schemaB1 = JSON.stringify({
  type: 'object',
  required: ['id', 'coordinates', 'active'],
  additionalProperties: false,
  properties: {
    id: { type: 'integer' },
    coordinates: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: { type: 'number' }
    },
    active: { type: 'boolean' }
  }
}, null, 2);

const payloadB1 = JSON.stringify({
  id: '100',
  coordinates: [28.6139],
  active: 'true',
  extra_field: 123
}, null, 2);

const validationB1 = validateJsonContract(schemaB1, payloadB1);
assert(validationB1.isValid === false, 'Detects contract violation on invalid payload');
assert(validationB1.errors.length === 4, `Reports all 4 distinct errors (id, coordinates minItems, active, extra_field)`, `Found ${validationB1.errors.length} errors: ${validationB1.errors.map(e => e.keyword).join(', ')}`);

const idErr = validationB1.errors.find(e => e.path.includes('id'));
const coordsErr = validationB1.errors.find(e => e.path.includes('coordinates'));
const activeErr = validationB1.errors.find(e => e.path.includes('active'));
const extraErr = validationB1.errors.find(e => e.path.includes('extra_field') || e.keyword === 'additionalProperties');

assert(!!idErr && idErr.expected?.includes('integer'), 'id error identifies expected integer vs received string');
assert(!!coordsErr && coordsErr.keyword === 'minItems', 'coordinates error identifies minItems constraint');
assert(!!activeErr && activeErr.expected?.includes('boolean'), 'active error identifies expected boolean vs received string');
assert(!!extraErr && extraErr.keyword === 'additionalProperties', 'extra_field error identifies unexpected additional property');

// 2. Malformed JSON Graceful Recovery
const malformedJson = '{"name": "Pulkit", "skills": ["Python", "FastAPI",]}';
const malformedResult = validateJsonContract(schemaB1, malformedJson);
assert(malformedResult.isValid === false, 'Gracefully handles malformed JSON with trailing comma');
assert(malformedResult.jsonSyntaxValid === false, 'Flags jsonSyntaxValid: false without thrown exception');
assert(malformedResult.errors.length > 0 && malformedResult.errors[0].keyword === 'syntax', 'Provides clear JSON syntax error diagnostic');

// -------------------------------------------------------------
// TEST SUITE C: Code Export Generation
// -------------------------------------------------------------
console.log('\nTest Suite C: Multi-Language Code Snippet Generator');

const tsSnippet = generateCodeSnippet('regex', 'typescript', passwordPattern, passwordFlags, schemaB1, passwordInput);
assert(tsSnippet.includes('RegExp') && tsSnippet.includes('validateInput'), 'Generates valid TypeScript regex snippet');

const pySnippet = generateCodeSnippet('regex', 'python', passwordPattern, passwordFlags, schemaB1, passwordInput);
assert(pySnippet.includes('re.compile') && pySnippet.includes('validate_text'), 'Generates valid Python re snippet');

const zodSnippet = generateCodeSnippet('regex', 'zod', passwordPattern, passwordFlags, schemaB1, passwordInput);
assert(zodSnippet.includes('z.string().regex'), 'Generates valid Zod schema snippet');

const jsonTsSnippet = generateCodeSnippet('json', 'typescript', '', '', schemaB1, payloadB1);
assert(jsonTsSnippet.includes('Ajv') && jsonTsSnippet.includes('validateContract'), 'Generates valid TypeScript AJV contract snippet');

console.log('\n============================================================');
console.log(`  TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('============================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
