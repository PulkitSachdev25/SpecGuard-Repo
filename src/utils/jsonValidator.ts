import type { JsonValidationError, JsonValidationResult } from '../types';

/**
 * Maps a JSON path (e.g. "root.user.age" or "root.items[0].price") to the approximate line number in the JSON raw string.
 */
export function findLineNumberForPath(jsonString: string, path: string): { line: number; column: number } {
  const lines = jsonString.split('\n');
  if (path === 'root' || !path) return { line: 1, column: 1 };

  // Get last segment of path
  const segments = path.replace(/^root\.?/, '').split(/\.|\[(\d+)\]/).filter(Boolean);
  const targetKey = segments[segments.length - 1];

  if (!targetKey) return { line: 1, column: 1 };

  // Look for targetKey quoted in lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyMatch = line.indexOf(`"${targetKey}"`);
    if (keyMatch !== -1) {
      return { line: i + 1, column: keyMatch + 1 };
    }
  }

  return { line: 1, column: 1 };
}

/**
 * Validate standard formats: email, uuid, uri, ipv4, ipv6, date-time, hostname
 */
function validateFormat(format: string, value: string): boolean {
  switch (format) {
    case 'email':
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    case 'uuid':
      return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
    case 'uri':
    case 'url':
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    case 'ipv4':
      return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value);
    case 'ipv6':
      return /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(value);
    case 'date-time':
      return !isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
    case 'hostname':
      return /^(?=.{1,253}$)(?:(?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}$/.test(value);
    default:
      return true;
  }
}

/**
 * Get accurate type of a JavaScript value in JSON Schema terminology.
 */
function getJsonType(val: unknown): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? 'integer' : 'number';
  }
  return typeof val;
}

/**
 * Comprehensive client-side JSON Schema validator.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateJsonContract(schemaStr: string, payloadStr: string): JsonValidationResult {
  const startTime = performance.now();
  const errors: JsonValidationError[] = [];
  let errIdCounter = 0;

  // 1. Parse JSON Schema
  let schema: any;
  try {
    if (!schemaStr.trim()) {
      return {
        isValid: false,
        errors: [{
          id: `err_${errIdCounter++}`,
          path: 'schema',
          keyword: 'syntax',
          message: 'JSON Schema is empty. Please provide a contract schema definition.',
          severity: 'error',
          lineNumber: 1,
        }],
        executionTimeMs: performance.now() - startTime,
        schemaValid: false,
        schemaError: 'Schema is empty',
        jsonSyntaxValid: false,
      };
    }
    schema = JSON.parse(schemaStr);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      errors: [{
        id: `err_${errIdCounter++}`,
        path: 'schema',
        keyword: 'syntax',
        message: `Invalid JSON Schema syntax: ${msg}`,
        severity: 'error',
        lineNumber: 1,
        fixSuggestion: 'Check for missing commas, trailing commas, or unclosed brackets in the schema definition.',
      }],
      executionTimeMs: performance.now() - startTime,
      schemaValid: false,
      schemaError: msg,
      jsonSyntaxValid: true,
    };
  }

  // 2. Parse JSON Payload
  let payload: any;
  try {
    if (!payloadStr.trim()) {
      return {
        isValid: false,
        errors: [{
          id: `err_${errIdCounter++}`,
          path: 'root',
          keyword: 'empty',
          message: 'JSON payload is empty. Enter data or click "Generate Passing Sample".',
          severity: 'warning',
          lineNumber: 1,
        }],
        executionTimeMs: performance.now() - startTime,
        schemaValid: true,
        jsonSyntaxValid: false,
        jsonSyntaxError: 'Payload is empty',
      };
    }
    payload = JSON.parse(payloadStr);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const lineMatch = msg.match(/position (\d+)/i);
    let line = 1;
    if (lineMatch) {
      const pos = parseInt(lineMatch[1], 10);
      line = payloadStr.slice(0, pos).split('\n').length;
    }
    return {
      isValid: false,
      errors: [{
        id: `err_${errIdCounter++}`,
        path: 'root',
        keyword: 'syntax',
        message: `JSON Syntax Error: ${msg}`,
        severity: 'error',
        lineNumber: line,
        fixSuggestion: 'Ensure valid JSON format: strings must be in double quotes, remove trailing commas.',
      }],
      executionTimeMs: performance.now() - startTime,
      schemaValid: true,
      jsonSyntaxValid: false,
      jsonSyntaxError: msg,
    };
  }

  // 3. Recursive Schema Verification Engine
  function validateNode(subSchema: any, data: any, path: string) {
    if (!subSchema || typeof subSchema !== 'object') return;

    const currentType = getJsonType(data);
    const loc = findLineNumberForPath(payloadStr, path);

    // Type check
    if (subSchema.type) {
      const expectedTypes = Array.isArray(subSchema.type) ? subSchema.type : [subSchema.type];
      const match = expectedTypes.some((t: string) => {
        if (t === 'number') return currentType === 'number' || currentType === 'integer';
        return t === currentType;
      });

      if (!match) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'type',
          message: `Expected type "${expectedTypes.join(' | ')}", received "${currentType}"`,
          expected: expectedTypes.join(' | '),
          received: currentType,
          severity: 'error',
          fixSuggestion: `Change value at "${path}" to a valid ${expectedTypes[0]}.`,
        });
        return; // skip further deep checks if base type mismatched
      }
    }

    // Enum check
    if (Array.isArray(subSchema.enum)) {
      const enumMatch = subSchema.enum.some((e: any) => JSON.stringify(e) === JSON.stringify(data));
      if (!enumMatch) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'enum',
          message: `Value ${JSON.stringify(data)} is not one of allowed enum values: [${subSchema.enum.map((e: any) => JSON.stringify(e)).join(', ')}]`,
          expected: subSchema.enum.map((e: any) => JSON.stringify(e)).join(' | '),
          received: JSON.stringify(data),
          severity: 'error',
          fixSuggestion: `Set value to one of: ${subSchema.enum.join(', ')}`,
        });
      }
    }

    // Const check
    if (subSchema.const !== undefined) {
      if (JSON.stringify(subSchema.const) !== JSON.stringify(data)) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'const',
          message: `Expected constant value ${JSON.stringify(subSchema.const)}, received ${JSON.stringify(data)}`,
          expected: JSON.stringify(subSchema.const),
          received: JSON.stringify(data),
          severity: 'error',
        });
      }
    }

    // String constraints
    if (typeof data === 'string') {
      if (typeof subSchema.minLength === 'number' && data.length < subSchema.minLength) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'minLength',
          message: `String is too short: length is ${data.length}, minimum required is ${subSchema.minLength}`,
          expected: `>= ${subSchema.minLength} chars`,
          received: `${data.length} chars`,
          severity: 'error',
        });
      }
      if (typeof subSchema.maxLength === 'number' && data.length > subSchema.maxLength) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'maxLength',
          message: `String is too long: length is ${data.length}, maximum allowed is ${subSchema.maxLength}`,
          expected: `<= ${subSchema.maxLength} chars`,
          received: `${data.length} chars`,
          severity: 'error',
        });
      }
      if (subSchema.pattern) {
        try {
          const reg = new RegExp(subSchema.pattern);
          if (!reg.test(data)) {
            errors.push({
              id: `err_${errIdCounter++}`,
              path,
              lineNumber: loc.line,
              column: loc.column,
              keyword: 'pattern',
              message: `String "${data}" does not match required regex pattern: /${subSchema.pattern}/`,
              expected: `Pattern /${subSchema.pattern}/`,
              received: `"${data}"`,
              severity: 'error',
              fixSuggestion: `Update "${path}" to conform to pattern /${subSchema.pattern}/`,
            });
          }
        } catch {
          // invalid pattern in schema
        }
      }
      if (subSchema.format && typeof subSchema.format === 'string') {
        if (!validateFormat(subSchema.format, data)) {
          errors.push({
            id: `err_${errIdCounter++}`,
            path,
            lineNumber: loc.line,
            column: loc.column,
            keyword: 'format',
            message: `String "${data}" is not a valid "${subSchema.format}" format`,
            expected: `Format: ${subSchema.format}`,
            received: `"${data}"`,
            severity: 'error',
            fixSuggestion: `Ensure value is formatted as a valid ${subSchema.format}.`,
          });
        }
      }
    }

    // Number / Integer constraints
    if (typeof data === 'number') {
      if (subSchema.type === 'integer' && !Number.isInteger(data)) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'type',
          message: `Expected integer value, received floating-point number ${data}`,
          expected: 'integer',
          received: 'float',
          severity: 'error',
        });
      }
      if (typeof subSchema.minimum === 'number' && data < subSchema.minimum) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'minimum',
          message: `Value ${data} is less than minimum allowable ${subSchema.minimum}`,
          expected: `>= ${subSchema.minimum}`,
          received: String(data),
          severity: 'error',
        });
      }
      if (typeof subSchema.maximum === 'number' && data > subSchema.maximum) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'maximum',
          message: `Value ${data} exceeds maximum allowable ${subSchema.maximum}`,
          expected: `<= ${subSchema.maximum}`,
          received: String(data),
          severity: 'error',
        });
      }
      if (typeof subSchema.exclusiveMinimum === 'number' && data <= subSchema.exclusiveMinimum) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'exclusiveMinimum',
          message: `Value ${data} must be strictly greater than ${subSchema.exclusiveMinimum}`,
          expected: `> ${subSchema.exclusiveMinimum}`,
          received: String(data),
          severity: 'error',
        });
      }
      if (typeof subSchema.exclusiveMaximum === 'number' && data >= subSchema.exclusiveMaximum) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'exclusiveMaximum',
          message: `Value ${data} must be strictly less than ${subSchema.exclusiveMaximum}`,
          expected: `< ${subSchema.exclusiveMaximum}`,
          received: String(data),
          severity: 'error',
        });
      }
    }

    // Object constraints
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      // Required properties
      if (Array.isArray(subSchema.required)) {
        for (const reqKey of subSchema.required) {
          if (data[reqKey] === undefined) {
            errors.push({
              id: `err_${errIdCounter++}`,
              path: path === 'root' ? `root.${reqKey}` : `${path}.${reqKey}`,
              lineNumber: loc.line,
              column: loc.column,
              keyword: 'required',
              message: `Missing required property "${reqKey}"`,
              expected: `Required key "${reqKey}"`,
              received: 'undefined (missing)',
              severity: 'error',
              fixSuggestion: `Add property "${reqKey}" to the object.`,
            });
          }
        }
      }

      // Check properties
      if (subSchema.properties && typeof subSchema.properties === 'object') {
        for (const [propKey, propSchema] of Object.entries(subSchema.properties)) {
          if (data[propKey] !== undefined) {
            const nextPath = path === 'root' ? `root.${propKey}` : `${path}.${propKey}`;
            validateNode(propSchema, data[propKey], nextPath);
          }
        }
      }

      // Additional properties check
      if (subSchema.additionalProperties === false) {
        const allowedKeys = new Set(Object.keys(subSchema.properties || {}));
        for (const actualKey of Object.keys(data)) {
          if (!allowedKeys.has(actualKey)) {
            const extraLoc = findLineNumberForPath(payloadStr, actualKey);
            errors.push({
              id: `err_${errIdCounter++}`,
              path: path === 'root' ? `root.${actualKey}` : `${path}.${actualKey}`,
              lineNumber: extraLoc.line,
              column: extraLoc.column,
              keyword: 'additionalProperties',
              message: `Unexpected additional property "${actualKey}" not allowed by schema`,
              expected: 'No extra properties',
              received: `"${actualKey}"`,
              severity: 'warning',
              fixSuggestion: `Remove property "${actualKey}" from object.`,
            });
          }
        }
      }
    }

    // Array constraints
    if (Array.isArray(data)) {
      if (typeof subSchema.minItems === 'number' && data.length < subSchema.minItems) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'minItems',
          message: `Array has ${data.length} items, but minimum required is ${subSchema.minItems}`,
          expected: `>= ${subSchema.minItems} items`,
          received: `${data.length} items`,
          severity: 'error',
        });
      }
      if (typeof subSchema.maxItems === 'number' && data.length > subSchema.maxItems) {
        errors.push({
          id: `err_${errIdCounter++}`,
          path,
          lineNumber: loc.line,
          column: loc.column,
          keyword: 'maxItems',
          message: `Array has ${data.length} items, exceeding maximum allowed of ${subSchema.maxItems}`,
          expected: `<= ${subSchema.maxItems} items`,
          received: `${data.length} items`,
          severity: 'error',
        });
      }
      if (subSchema.uniqueItems === true) {
        const seen = new Set();
        let hasDuplicate = false;
        for (const item of data) {
          const itemStr = JSON.stringify(item);
          if (seen.has(itemStr)) {
            hasDuplicate = true;
            break;
          }
          seen.add(itemStr);
        }
        if (hasDuplicate) {
          errors.push({
            id: `err_${errIdCounter++}`,
            path,
            lineNumber: loc.line,
            column: loc.column,
            keyword: 'uniqueItems',
            message: `Array contains duplicate items, but uniqueItems is required`,
            expected: 'Unique items only',
            received: 'Duplicate items detected',
            severity: 'error',
          });
        }
      }

      // Array items schema
      if (subSchema.items) {
        data.forEach((item: any, idx: number) => {
          const itemPath = `${path}[${idx}]`;
          validateNode(subSchema.items, item, itemPath);
        });
      }
    }
  }

  // Start validation at root
  validateNode(schema, payload, 'root');

  const executionTimeMs = performance.now() - startTime;
  return {
    isValid: errors.length === 0,
    errors,
    executionTimeMs,
    schemaValid: true,
    jsonSyntaxValid: true,
  };
}
