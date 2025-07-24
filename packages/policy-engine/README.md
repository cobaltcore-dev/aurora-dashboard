# OpenStack Policy Engine (TypeScript)

A TypeScript implementation of the OpenStack Policy Engine compatible with OSLO policy files. This library provides a comprehensive policy evaluation system for access control decisions in OpenStack-like environments.

## Overview

This policy engine implements the OpenStack Policy Engine specification, allowing you to define and evaluate complex access control rules using the same syntax and semantics as OpenStack's native policy system. It supports rule-based access control with context-aware evaluation, role-based permissions, and parameter substitution.

## Architecture

```js
┌───────────────────────────────────────────────────────────────────┐
│                    Policy Engine Architecture                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────┐                       │
│  │ Policy File     │    │ Policy Config   │                       │
│  │ (.json/.yaml)   │    │ Object          │                       │
│  └─────┬───────────┘    └─────┬───────────┘                       │
│        │                      │                                   │
│        │ policyFileLoader     │ createPolicyEngine()              │
│        │                      │                                   │
│        └──────────┬───────────┘                                   │
│                   │                                               │
│                   ▼                                               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                 PolicyEngine                                │  │
│  │                                                             │  │
│  │  Rules compilation during construction:                     │  │
│  │  ┌─────────────┐   ┌─────────────┐  ┌─────────────┐         │  │
│  │  │   Lexer     │─> │   Parser    │─>│ Compiled    │         │  │
│  │  │(tokenize)   │   │(parse AST)  │  │ Rules Map   │         │  │
│  │  └─────────────┘   └─────────────┘  └─────────────┘         │  │
│  └─────────────────────┬───────────────────────────────────────┘  │
│                        │                                          │
│                        │                                          │
│                        │ .policy(keystoneToken)                   │
│                        ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │               buildContext()                                │  │
│  │                                                             │  │
│  │  ┌─────────────────┐          ┌─────────────────┐           │  │
│  │  │ Keystone Token  │────────> │ Policy Context  │           │  │
│  │  │ • user          │          │ • user_id       │           │  │
│  │  │ • roles         │          │ • roles         │           │  │
│  │  │ • project       │          │ • project_id    │           │  │
│  │  │ • domain        │          │ • domain_id     │           │  │
│  │  └─────────────────┘          │ • is_admin      │           │  │
│  │                               │ • token.*       │           │  │
│  │                               └─────────────────┘           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                        │                                          │
│                        ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              UserPolicy Object                              │  │
│  │                  { check() }                                │  │
│  └─────────────────────┬───────────────────────────────────────┘  │
│                        │                                          │
│                        │                                          │
│                        │ .check(ruleName, params)                 │
│                        ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                checkRule()                                  │  │
│  │                                                             │  │
│  │  ┌─────────────────┐    ┌─────────────────┐                 │  │
│  │  │   Get Rule AST  │───>│   Evaluator     │                 │  │
│  │  │  (from cache)   │    │  evaluate()     │                 │  │
│  │  └─────────────────┘    └─────────┬───────┘                 │  │
│  │                                   │                         │  │
│  │  ┌────────────────────────────────┘                         │  │
│  │  │                                                          │  │
│  │  │  EvaluationContext:                                      │  │
│  │  │  • context (PolicyContext)                               │  │
│  │  │  • params (PolicyCheckParams)                            │  │
│  │  │  • getRule (for nested rules)                            │  │
│  │  │                                                          │  │
│  │  ▼                                                          │  │
│  │  ┌─────────────────┐                                        │  │
│  │  │ Boolean Result  │                                        │  │
│  │  │ (true / false)  │                                        │  │
│  │  └─────────────────┘                                        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Key Components

- **Policy Loader:** Parses JSON/YAML policy configuration files
- **Lexer:** Tokenizes policy rule expressions into structured tokens
- **Parser:** Builds Abstract Syntax Trees (AST) from tokens with operator precedence
- **Evaluator:** Executes policy rules against provided context and parameters
- **Context Builder:** Transforms Keystone tokens into evaluation context
- **Debug Tracer:** Provides detailed execution traces for debugging

## Installation

```bash
pnpm install
```

## Quick Start

### Basic Usage

```ts
import { createPolicyEngineFromFile } from "openstack-policy-engine"

// Load policy from file
const policyEngine = createPolicyEngineFromFile("./policy.json")

// Create a policy checker with Keystone token
const policy = policyEngine.policy({
  user: { id: "user123", name: "john", domain: { id: "default", name: "Default" } },
  roles: [{ id: "role1", name: "admin" }],
  project: { id: "proj123", name: "myproject", domain: { id: "default", name: "Default" } },
})

// Check if user can perform action
const canDelete = policy.check("compute:delete", {
  target: { user: { id: "user123" } },
})
```

### Policy Configuration Example

**policy.json:**

```json
{
  "admin_required": "role:admin",
  "owner": "user_id:%(target.user.id)s",
  "admin_or_owner": "rule:admin_required or rule:owner",
  "compute:delete": "rule:admin_or_owner",
  "compute:list": "@",
  "_default": "!"
}
```

**policy.yaml:**

```yaml
admin_required: "role:admin"
owner: "user_id:%(target.user.id)s"
admin_or_owner: "rule:admin_required or rule:owner"
compute:delete: "rule:admin_or_owner"
compute:list: "@"
_default: "!"
```

## API Reference

### Factory Functions

#### createPolicyEngine(config: Record<string, string>): PolicyEngine

Creates a policy engine from a configuration object.

#### createPolicyEngineFromFile(filePath: string): PolicyEngine

Creates a policy engine from a JSON/YAML policy file.

### PolicyEngine Methods

#### policy(tokenPayload: KeystoneTokenPayload, options?: PolicyOptions): UserPolicy

Creates a policy checker for a specific user context.

**Parameters:**

- **tokenPayload:** Keystone token containing user, roles, project information
- **options:** `debug` (boolean) to enable detailed execution traces

**Returns:** UserPolicy object with `check()` method

#### check(ruleName: string, params?: PolicyCheckParams): boolean

Evaluates a specific policy rule.

**Parameters:**

- **ruleName:** Name of the rule to evaluate
- **params:** Optional parameters for rule evaluation (target objects, etc.)

**Returns:** Boolean indicating if the rule allows access

### Policy Rule Syntax

#### Basic Expressions

- `@` - Always allow (unconditional access)
- `!` - Always deny (unconditional denial)
- `true` - Always allow
- `false` - Always deny

#### Role-based Rules

- **role:admin** - User must have 'admin' role
- **role:member** - User must have 'member' role

#### Context Matching

- **user_id:%(target.user.id)s** - User ID must match target user
- **project_id:%(target.project.id)s** - Project ID must match target project
- **domain_id:default** - Domain must be 'default'

#### Rule References

- **rule:admin_required** - Reference another rule
- **rule:owner** - Reference owner rule

#### Logical Operators

- `rule:admin or rule:owner` - OR operation
- `role:admin and project_id:%(target.project.id)s` - AND operation
- `not rule:admin` - NOT operation
- `(rule:admin or rule:owner) and role:member` - Grouping with parentheses

#### Special Checks

- `is_admin:true` - Check if user is admin
- `is_admin_project:true` - Check if project is admin project
- `system_scope:all` - Check for system-scoped token

### Advanced Features

#### Parameter Substitution

The engine supports parameter substitution using the %(param.path)s syntax:

```ts
// Policy rule: "user_id:%(target.user.id)s"
policy.check("compute:delete", {
  target: { user: { id: "user123" } },
})
```

#### Debug Mode

Enable debug mode to get detailed execution traces:

```ts
const policy = policyEngine.policy(tokenPayload, { debug: true })
policy.check("compute:delete") // Will log detailed trace to console
```

#### Nested Rule Evaluation

Rules can reference other rules, enabling complex policy composition:

```ts
{
  "admin_required": "role:admin",
  "owner": "user_id:%(target.user.id)s",
  "admin_or_owner": "rule:admin_required or rule:owner",
  "compute:delete": "rule:admin_or_owner"
}
```

### Error Handling

The engine provides comprehensive error handling:

- Parse Errors: Invalid rule syntax
- Validation Errors: Invalid token payload structure
- Evaluation Errors: Missing rules or invalid context
- File Errors: Missing or invalid policy files

```ts
try {
  const result = policy.check("invalid:rule")
} catch (error) {
  console.error("Policy evaluation failed:", error.message)
}
```

## License

Licensed under the Apache-2.0 License. See LICENSE file for details.

## Contributing

This project follows OpenStack policy engine specifications. Contributions should maintain compatibility with the OSLO policy format and syntax.
