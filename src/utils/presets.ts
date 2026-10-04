import type { PresetItem } from '../types';

export const PRESETS: PresetItem[] = [
  // --- REGEX PRESETS ---
  {
    id: 'regex-semver',
    name: 'Strict Semantic Versioning (SemVer 2.0)',
    category: 'Regex',
    mode: 'regex',
    description: 'Enforces official SemVer specification (vMAJOR.MINOR.PATCH with optional pre-release tag and build metadata).',
    tags: ['Versioning', 'DevOps', 'Package Management'],
    regexData: {
      pattern: '^v?(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<prerelease>(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$',
      flags: 'gm',
      testString: `v1.0.0
v2.4.1-beta.3
3.14.159+20261004
v0.9.0-rc.1+build.482
v1.2 (invalid - missing patch)
2.0.0-alpha..1 (invalid consecutive dots)`
    }
  },
  {
    id: 'regex-iso-timestamp',
    name: 'ISO 8601 UTC Timestamps',
    category: 'Regex',
    mode: 'regex',
    description: 'Matches standard ISO 8601 UTC date-time stamps (YYYY-MM-DDTHH:mm:ss.sssZ or timezone offsets).',
    tags: ['Dates', 'API', 'Standard'],
    regexData: {
      pattern: '^(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])T(?<hour>[01]\\d|2[0-3]):(?<minute>[0-5]\\d):(?<second>[0-5]\\d)(?:\\.(?<millis>\\d{3}))?(?<tz>Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)$',
      flags: 'gm',
      testString: `2026-10-04T16:30:00.000Z
2026-12-31T23:59:59Z
2026-06-15T08:00:00+05:30
2026-02-28T12:00:00-08:00
2026/10/04 16:30:00 (invalid format)`
    }
  },
  {
    id: 'regex-api-key',
    name: 'Enterprise API Key Token Pattern',
    category: 'Regex',
    mode: 'regex',
    description: 'Validates service API tokens with environment prefix discriminator (e.g. key_live_ / key_test_).',
    tags: ['Security', 'Auth', 'API Tokens'],
    regexData: {
      pattern: '^key_(?<env>live|test)_(?<token>[0-9a-zA-Z_]{16,32})$',
      flags: 'gm',
      testString: `key_live_sample_test_key_0000000000
key_test_dummy_sample_token_12345
key_live_short
invalid_prefix_sample_key_99999`
    }
  },
  {
    id: 'regex-password-policy',
    name: 'Secure Enterprise Password Policy',
    category: 'Regex',
    mode: 'regex',
    description: 'Lookahead assertions ensuring min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.',
    tags: ['Security', 'Lookaheads', 'Auth'],
    regexData: {
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_\\-#])[A-Za-z\\d@$!%*?&_\\-#]{8,64}$',
      flags: 'gm',
      testString: `Secur3P@ssw0rd!2026
DevOps#2026_Key
simplepassword (invalid: no uppercase/digit/symbol)
P@ss1 (invalid: too short < 8 chars)
ALLCAPS123! (invalid: no lowercase)`
    }
  },
  {
    id: 'regex-phone-e164',
    name: 'International E.164 Phone Number',
    category: 'Regex',
    mode: 'regex',
    description: 'Standard international telecommunication numbering plan (leading plus, country code, 1-15 digits total).',
    tags: ['Telecom', 'E.164', 'Global'],
    regexData: {
      pattern: '^\\+(?<country>[1-9]\\d{0,2})(?<number>\\d{4,12})$',
      flags: 'gm',
      testString: `+14155552671
+442071838750
+919876543210
+81312345678
0014155552671 (missing plus sign)
+012345 (invalid 0 country code)`
    }
  },
  {
    id: 'regex-git-commit',
    name: 'Conventional Commits Specification',
    category: 'Regex',
    mode: 'regex',
    description: 'Validates conventional commit messages with type, optional scope, breaking indicator, and summary.',
    tags: ['Git', 'CI/CD', 'Standards'],
    regexData: {
      pattern: '^(?<type>feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\\((?<scope>[a-z0-9_-]+)\\))?(?<breaking>!)?: (?<subject>[^\\r\\n]+)$',
      flags: 'gm',
      testString: `feat(auth): add OAuth2 refresh token rotation
fix(validator): resolve catastrophic backtracking on nested quantifiers
chore!: drop support for Node 16
docs(readme): update visual token tracer guides
random commit message (invalid format)`
    }
  },

  // --- JSON CONTRACT PRESETS ---
  {
    id: 'json-user-registration',
    name: 'User Registration & Auth Contract',
    category: 'JSON Contract',
    mode: 'json',
    description: 'Validates user onboarding payload with strict UUID, RFC email, age bounds, role enum, and preferences.',
    tags: ['Auth', 'Users', 'Draft-07'],
    jsonData: {
      schema: JSON.stringify({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "UserRegistrationContract",
        "type": "object",
        "required": ["userId", "email", "username", "age", "role", "isVerified"],
        "additionalProperties": false,
        "properties": {
          "userId": {
            "type": "string",
            "format": "uuid",
            "description": "Unique UUID v4 identity"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "User primary email address"
          },
          "username": {
            "type": "string",
            "minLength": 3,
            "maxLength": 24,
            "pattern": "^[a-zA-Z0-9_-]+$"
          },
          "age": {
            "type": "integer",
            "minimum": 18,
            "maximum": 120
          },
          "role": {
            "type": "string",
            "enum": ["admin", "developer", "auditor", "viewer"]
          },
          "isVerified": {
            "type": "boolean"
          },
          "tags": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": { "type": "string" }
          }
        }
      }, null, 2),
      sample: JSON.stringify({
        "userId": "c3e98124-789a-4e2b-a190-8d5f3a7e4b9c",
        "email": "sarah.connor@specguard.io",
        "username": "s_connor26",
        "age": 29,
        "role": "developer",
        "isVerified": true,
        "tags": ["core-team", "beta-tester", "eu-region"]
      }, null, 2)
    }
  },
  {
    id: 'json-ecommerce-webhook',
    name: 'E-Commerce Stripe-Style Webhook Event',
    category: 'JSON Contract',
    mode: 'json',
    description: 'Contract for automated payment & order fulfillment webhooks with nested array items and totals.',
    tags: ['Payments', 'Webhooks', 'FinTech'],
    jsonData: {
      schema: JSON.stringify({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "OrderWebhookContract",
        "type": "object",
        "required": ["eventId", "eventType", "createdAt", "currency", "amountTotal", "customer", "lineItems"],
        "properties": {
          "eventId": {
            "type": "string",
            "pattern": "^evt_[0-9a-zA-Z]{16,24}$"
          },
          "eventType": {
            "type": "string",
            "enum": ["payment_intent.succeeded", "payment_intent.failed", "checkout.session.completed"]
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "currency": {
            "type": "string",
            "enum": ["usd", "eur", "gbp", "jpy", "cad"]
          },
          "amountTotal": {
            "type": "integer",
            "minimum": 100
          },
          "customer": {
            "type": "object",
            "required": ["customerId", "email"],
            "properties": {
              "customerId": { "type": "string" },
              "email": { "type": "string", "format": "email" }
            }
          },
          "lineItems": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["sku", "quantity", "unitPrice"],
              "properties": {
                "sku": { "type": "string" },
                "quantity": { "type": "integer", "minimum": 1 },
                "unitPrice": { "type": "integer", "minimum": 1 }
              }
            }
          }
        }
      }, null, 2),
      sample: JSON.stringify({
        "eventId": "evt_demo_order_100200300",
        "eventType": "payment_intent.succeeded",
        "createdAt": "2026-10-04T16:30:00Z",
        "currency": "usd",
        "amountTotal": 14900,
        "customer": {
          "customerId": "cus_demo_customer_456",
          "email": "billing@techcorp.com"
        },
        "lineItems": [
          {
            "sku": "PRO-ANNUAL-TIER",
            "quantity": 1,
            "unitPrice": 12000
          },
          {
            "sku": "ADDON-ADDITIONAL-SEAT",
            "quantity": 2,
            "unitPrice": 1450
          }
        ]
      }, null, 2)
    }
  },
  {
    id: 'json-infra-config',
    name: 'Cloud Infrastructure & Database Contract',
    category: 'JSON Contract',
    mode: 'json',
    description: 'Infrastructure-as-code schema for cluster database nodes, TLS security, and pool configuration.',
    tags: ['DevOps', 'Cloud', 'Config'],
    jsonData: {
      schema: JSON.stringify({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "DatabaseClusterConfig",
        "type": "object",
        "required": ["clusterName", "engine", "host", "port", "sslEnabled", "poolSize", "maxConnections"],
        "properties": {
          "clusterName": {
            "type": "string",
            "minLength": 4,
            "maxLength": 32
          },
          "engine": {
            "type": "string",
            "enum": ["postgresql", "mysql", "redis", "mongodb"]
          },
          "host": {
            "type": "string"
          },
          "port": {
            "type": "integer",
            "minimum": 1024,
            "maximum": 65535
          },
          "sslEnabled": {
            "type": "boolean"
          },
          "poolSize": {
            "type": "integer",
            "minimum": 5,
            "maximum": 100
          },
          "maxConnections": {
            "type": "integer",
            "minimum": 10,
            "maximum": 1000
          }
        }
      }, null, 2),
      sample: JSON.stringify({
        "clusterName": "prod-db-primary-us-east",
        "engine": "postgresql",
        "host": "db.us-east.internal.specguard.net",
        "port": 5432,
        "sslEnabled": true,
        "poolSize": 20,
        "maxConnections": 250
      }, null, 2)
    }
  }
];
