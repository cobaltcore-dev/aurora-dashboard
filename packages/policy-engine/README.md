# Policy Engine

Ploicy Engine compiles a JSON file with rules and returns a policy, which in turn implements the check function. The syntax of the rules corresponds to the policy syntax used in Openstack Services. However, some features have been added to allow more flexibility.

## Architecture

JSON File -> Policy Engine -> Policy

Openstack Token -> Policy -> check function

Lexer -> Parser -> Evaluator

https://www.codeproject.com/Articles/345888/How-to-Write-a-Simple-Interpreter-in-JavaScript

## Usage

```js
const rules = {
  admin: "role:admin",
}
const { PolicyEngine } = require("policy-engine")

const currentUserToken = "..."
const engine = new PolicyEngine(rules)
const policy = engine.policy(currentUserToken, { debug: false })

policy.check("admin")
```

## Syntax

- rules (JSON file): `RULE_NAME (string): RULE_BODY (expression)`,
  example: `"admin": "false"`

- TRUE expression: `@`, example: `"can_read": "@"`
- FALSE expression: `!`, example: `"can_write": "!"`
- RULE expression: `rule:RULE_NAME`,
  example: `"superadmin": "rule:admin"`

- ROLE expression: `role:ROLE_NAME`, example: `"admin":"role:admin"`

- CONTEXT expression: `CONTEXT_VARIABLE:VALUE`, example: `"admin": "is_admin:1"`

  available context variables:

  - `is_admin_project`
  - `is_admin`
  - `domain_id`
  - `domain_name`
  - `project_id`
  - `project_domain_id`
  - `user_id`
  - `user_name`

- PARAMS expression: `CONTEXT_VARIABLE:%(PARAM_VALUE)s`, example: `"admin": "domain_id:%(domain.id)s"`

  should be used as follows:

  `policy.check("admin", { domain: { id: "ID" } } )`

- NULL Value expression: `CONTEXT_VARIABLE:null`, example: `"admin": "domain_id:null"`

- STATIC Value: `STATIC_VALUE:%(PARAM_VALUE)s`, example: `"admin": "cloud_admin:%(domain.name)s"`

  should be used as follows:

  `policy.check("admin", { domain: { name: "SOME_NAME" } } )`

- AND Operator: `EXPRESSION and EXPRESSION`, example: `"domain_admin": "rule:admin and project_id:null"`

- OR Operator: `EXPRESSION or EXPRESSION`, example: `"can_read": "role:admin or role:member"`

- NOT Operator: `not EXPRESSION`, example: `"project_admin": "role:admin and not project_id:null"`

- BRACKETS Operator: `(EXPRESSION)`, example: `"can_edit_project": "role:admin or ( role:member and project_id:%(project.id)s )"`

- DEFAULT rule: `_default:RULE_BODY`, example: `"_default": "!"`,
  is used if a rule was not found

## Example

```js
const rules = {
  _default: "rule:admin_required",
  project_parent: "not null:%(project.parent_id)s",
  admin_required: " role:admin or is_admin:1",

  domain_admin: "rule:admin_required and not domain_id:null",
  project_admin: "rule:admin_required and not project_id:null",

  service_role: "role:service",
  service_or_admin: "rule:admin_required or rule:service_role",
  owner: "user_id:%(user_id)s",
  admin_or_owner: "rule:admin_required or rule:owner",
}

const { PolicyEngine } = require("policy-engine")

const currentUserToken = "..."
const engine = new PolicyEngine(rules)
const policy = engine.policy(currentUserToken)

policy.check("project_parent", { project: SOME_PROJECT })
policy.check("admin_required")
policy.check("domain_admin")
policy.check("project_admin")
policy.check("service_role")
policy.check("service_or_admin")
policy.check("owner", { user_id: SOME_ID })
policy.check("admin_or_owner", { user_id: SOME_ID })
```

## Development

```bash
npm run test
```
