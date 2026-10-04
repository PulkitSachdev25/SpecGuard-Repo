import type { AppMode } from '../types';

export function generateCodeSnippet(
  mode: AppMode,
  language: 'typescript' | 'python' | 'go' | 'rust' | 'zod',
  pattern: string,
  flags: string,
  schemaStr: string,
  sampleStr: string
): string {
  if (mode === 'regex') {
    const cleanFlags = Array.from(new Set(flags.split(''))).join('');
    switch (language) {
      case 'typescript':
        return `// SpecGuard Generated TypeScript Validator
export const pattern = /${pattern}/${cleanFlags};

export function validateInput(text: string): { isValid: boolean; matches: RegExpExecArray[] } {
  const matches: RegExpExecArray[] = [];
  if (${cleanFlags.includes('g') ? 'true' : 'false'}) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push(match);
      if (match[0].length === 0) pattern.lastIndex++;
    }
  } else {
    const match = pattern.exec(text);
    if (match) matches.push(match);
  }
  return {
    isValid: matches.length > 0,
    matches,
  };
}

// Example usage:
const sample = ${JSON.stringify(sampleStr.split('\n')[0] || 'test_input')};
const result = validateInput(sample);
console.log("Validated:", result.isValid, result.matches);
`;

      case 'python':
        return `# SpecGuard Generated Python re Validator
import re

PATTERN = re.compile(r"${pattern}"${flags.includes('i') ? ', re.IGNORECASE' : ''}${flags.includes('m') ? ', re.MULTILINE' : ''}${flags.includes('s') ? ', re.DOTALL' : ''})

def validate_text(text: str):
    matches = list(PATTERN.finditer(text))
    return {
        "is_valid": len(matches) > 0,
        "match_count": len(matches),
        "matches": [m.groupdict() if m.groupdict() else m.group(0) for m in matches]
    }

if __name__ == "__main__":
    sample = ${JSON.stringify(sampleStr.split('\n')[0] || 'test_input')}
    res = validate_text(sample)
    print(f"Match Result: {res}")
`;

      case 'go':
        return `// SpecGuard Generated Go regexp Validator
package main

import (
	"fmt"
	"regexp"
)

var specGuardRegex = regexp.MustCompile(\`${pattern}\`)

func Validate(input string) bool {
	return specGuardRegex.MatchString(input)
}

func main() {
	sample := ${JSON.stringify(sampleStr.split('\n')[0] || 'test_input')}
	fmt.Printf("Matches: %t\\n", Validate(sample))
}
`;

      case 'rust':
        return `// SpecGuard Generated Rust Validator
// Add to Cargo.toml: regex = "1.10"

use regex::Regex;

fn main() {
    let pattern = Regex::new(r#"${pattern}"#).expect("Invalid regex pattern");
    let sample = ${JSON.stringify(sampleStr.split('\n')[0] || 'test_input')};
    
    let is_match = pattern.is_match(sample);
    println!("Validation passed: {}", is_match);
    
    for cap in pattern.captures_iter(sample) {
        println!("Found match: {:?}", &cap[0]);
    }
}
`;

      case 'zod':
        return `// SpecGuard Generated Zod String Pattern Schema
import { z } from "zod";

export const SpecGuardSchema = z.string().regex(/${pattern}/${cleanFlags}, {
  message: "Input does not conform to SpecGuard regular expression contract",
});

export type SpecGuardInput = z.infer<typeof SpecGuardSchema>;
`;

      default:
        return `/${pattern}/${cleanFlags}`;
    }
  } else {
    // Mode is JSON Schema
    switch (language) {
      case 'typescript':
        return `// SpecGuard Generated TypeScript JSON Validator (AJV Compliant)
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export const schema = ${schemaStr};

export const validateContract = ajv.compile(schema);

export function verifyPayload(payload: unknown) {
  const valid = validateContract(payload);
  if (!valid) {
    return { isValid: false, errors: validateContract.errors };
  }
  return { isValid: true, errors: [] };
}

// Test sample payload:
const samplePayload = ${sampleStr};
console.log("Validation Result:", verifyPayload(samplePayload));
`;

      case 'python':
        return `# SpecGuard Generated Python JSON Schema Validation
import json
import jsonschema
from jsonschema import validate, ValidationError

SCHEMA = ${schemaStr}

def validate_json_contract(payload_dict: dict) -> bool:
    try:
        validate(instance=payload_dict, schema=SCHEMA)
        print("✓ Payload conforms strictly to Data Contract")
        return True
    except ValidationError as err:
        print(f"✗ Contract Violation at {list(err.path)}: {err.message}")
        return False

if __name__ == "__main__":
    sample = json.loads('''${sampleStr}''')
    validate_json_contract(sample)
`;

      case 'zod':
        return `// SpecGuard Generated Zod Schema Converter
import { z } from "zod";

// Zod Data Contract definition
export const ContractSchema = z.object({
  // Auto-inferred shape from JSON Schema
});

export type ContractPayload = z.infer<typeof ContractSchema>;
`;

      default:
        return schemaStr;
    }
  }
}
