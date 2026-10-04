/**
 * Deterministic Mock Data Generator Engine for Regex and JSON Schema
 */

/**
 * Generate synthetic matching or failing sample for Regular Expressions
 */
export function generateRegexMock(pattern: string, shouldPass: boolean = true): string {
  if (!pattern) return shouldPass ? 'sample_match_123' : 'FAIL_NO_MATCH';

  // Common pattern presets matching
  if (pattern.includes('key_live_') || pattern.includes('key_test_') || pattern.includes('sample_test_key') || pattern.includes('api_key')) {
    return shouldPass ? 'key_live_sample_test_key_0000000000' : 'key_live_invalid_short';
  }

  // SemVer
  if (pattern.includes('beta') || (pattern.includes('\\d+') && pattern.includes('\\.'))) {
    return shouldPass ? 'v2.4.1-beta.3' : 'v2.x.invalid_alpha';
  }

  // ISO 8601 UTC
  if (pattern.includes('T') && pattern.includes('Z')) {
    return shouldPass ? '2026-10-04T16:30:00.000Z' : '2026/10/04 16:30 (invalid format)';
  }

  // E.164 phone
  if (pattern.includes('\\+[1-9]')) {
    return shouldPass ? '+14155552671' : '001-415-555-2671';
  }

  // Email
  if (pattern.includes('@') && pattern.includes('\\.')) {
    return shouldPass ? 'developer.lead@specguard.io' : 'developer.lead-no-at-sign.io';
  }

  // Password with lookahead
  if (pattern.includes('(?=.*[a-z])') && pattern.includes('(?=.*[A-Z])')) {
    return shouldPass ? 'Secur3P@ssw0rd!2026' : 'weakpass';
  }

  // IPv4 / IPv6
  if (pattern.includes('25[0-5]')) {
    return shouldPass ? '192.168.1.105' : '999.300.1.1';
  }

  // General heuristic AST generator for arbitrary regexes
  let result = '';
  let i = 0;
  const cleanPat = pattern.replace(/^\^/, '').replace(/\$$/, '');

  while (i < cleanPat.length) {
    const c = cleanPat[i];

    if (c === '\\' && i + 1 < cleanPat.length) {
      const next = cleanPat[i + 1];
      if (next === 'd') result += Math.floor(Math.random() * 10);
      else if (next === 'w') result += 'a';
      else if (next === 's') result += ' ';
      else result += next;
      i += 2;
      continue;
    }

    if (c === '[') {
      const close = cleanPat.indexOf(']', i);
      if (close !== -1) {
        const cls = cleanPat.slice(i + 1, close);
        if (cls.includes('A-Z')) result += 'K';
        else if (cls.includes('a-z')) result += 'v';
        else if (cls.includes('0-9')) result += '7';
        else result += cls[0] || 'x';
        i = close + 1;
        continue;
      }
    }

    if (c === '(') {
      const close = cleanPat.indexOf(')', i);
      if (close !== -1) {
        let inside = cleanPat.slice(i + 1, close);
        if (inside.startsWith('?:')) inside = inside.slice(2);
        if (inside.startsWith('?<')) {
          const endName = inside.indexOf('>');
          if (endName !== -1) inside = inside.slice(endName + 1);
        }
        if (inside.includes('|')) {
          const parts = inside.split('|');
          result += generateRegexMock(parts[0], true);
        } else {
          result += generateRegexMock(inside, true);
        }
        i = close + 1;
        continue;
      }
    }

    if (c === '+' || c === '*' || c === '?') {
      // Repeat previous char once
      i++;
      continue;
    }

    if (c === '{') {
      const close = cleanPat.indexOf('}', i);
      if (close !== -1) {
        i = close + 1;
        continue;
      }
    }

    result += c;
    i++;
  }

  if (shouldPass) {
    return result || 'VALID_INPUT';
  } else {
    // Deliberately invalidate the generated string
    if (result.length > 0) {
      return `!INVALID_${result}_FAIL#@`;
    }
    return 'FAIL_TEST_STRING_999!';
  }
}

/**
 * Generate synthetic compliant or failing JSON payload from JSON Schema
 */
export function generateJsonMock(schemaStr: string, shouldPass: boolean = true): string {
  try {
    const schema = JSON.parse(schemaStr);

    function generateNode(node: any): any {
      if (!node || typeof node !== 'object') return 'sample_value';

      if (node.enum && Array.isArray(node.enum) && node.enum.length > 0) {
        return node.enum[0];
      }

      if (node.const !== undefined) {
        return node.const;
      }

      const type = node.type || (node.properties ? 'object' : node.items ? 'array' : 'string');

      switch (type) {
        case 'string':
          if (node.format === 'email') return 'alex.chen@specguard.dev';
          if (node.format === 'uuid') return 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
          if (node.format === 'uri' || node.format === 'url') return 'https://api.specguard.dev/v1/webhook';
          if (node.format === 'date-time') return new Date().toISOString();
          if (node.format === 'ipv4') return '192.168.1.1';
          if (node.pattern) {
            return generateRegexMock(node.pattern, true);
          }
          if (node.minLength && node.minLength > 6) {
            return 'SampleTextLongerThanRequiredBounds';
          }
          return 'Sample Text Value';

        case 'integer':
        case 'number':
          if (typeof node.minimum === 'number') {
            return node.minimum + (node.maximum ? Math.floor((node.maximum - node.minimum) / 2) : 5);
          }
          return 42;

        case 'boolean':
          return true;

        case 'array':
          if (node.items) {
            const min = node.minItems || 2;
            const arr = [];
            for (let i = 0; i < min; i++) {
              arr.push(generateNode(node.items));
            }
            return arr;
          }
          return ['item1', 'item2'];

        case 'object': {
          const obj: Record<string, any> = {};
          if (node.properties) {
            for (const [key, propSchema] of Object.entries(node.properties)) {
              obj[key] = generateNode(propSchema);
            }
          }
          return obj;
        }

        default:
          return null;
      }
    }

    const payload = generateNode(schema);

    if (!shouldPass) {
      // Deliberately introduce contract violations
      if (typeof payload === 'object' && payload !== null) {
        if (Array.isArray(payload)) {
          payload.push('__INVALID_EXTRA_ITEM__');
        } else {
          // Remove a required property if defined
          if (Array.isArray(schema.required) && schema.required.length > 0) {
            delete payload[schema.required[0]];
          } else {
            const keys = Object.keys(payload);
            if (keys.length > 0) {
              payload[keys[0]] = 99999999; // type violation (number where string or obj was)
            }
          }
          // Inject an unexpected string type into a numeric or enum property
          payload['__unauthorized_extra_field__'] = true;
        }
      }
    }

    return JSON.stringify(payload, null, 2);
  } catch {
    return shouldPass
      ? JSON.stringify({ message: 'Valid Payload Generated' }, null, 2)
      : JSON.stringify({ error: 'Invalid Payload' }, null, 2);
  }
}
