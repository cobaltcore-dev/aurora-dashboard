import { ASTNode, ExpressionNode, OperatorNode } from "./parser"

export interface PolicyContext {
  // Core token properties
  roles: Array<{ id: string; name: string }>
  user?: {
    id: string
    name: string
    domain: { id: string; name: string }
  }
  project?: {
    id: string
    name: string
    domain: { id: string; name: string }
  }
  domain?: {
    id: string
    name: string
  }
  system?: {
    all?: boolean
  }

  // Flattened properties for easier access in policies
  user_id?: string
  user_name?: string
  domain_id?: string
  domain_name?: string
  project_id?: string
  project_domain_id?: string
  user_domain_id?: string
  is_admin?: boolean
  is_admin_project?: boolean

  // System scope handling
  system_scope?: "all"

  // For policies that reference token.* explicitly
  token?: {
    domain?: {
      id?: string
    }
    project?: {
      domain: {
        id?: string
      }
    }
    user?: {
      id: string
      name: string
      domain: { id: string; name: string }
    }
  }

  // Allow additional properties for backward compatibility and extensibility
  [key: string]: unknown
}

export interface PolicyCheckParams {
  [key: string]: unknown
}
export interface EvaluationContext {
  getRule?: (ruleName: string) => () => boolean
  context?: PolicyContext
  params?: PolicyCheckParams
}

export type EvaluationFunction = (context: EvaluationContext) => boolean

export function evaluate(node: ASTNode): EvaluationFunction {
  return (evaluationContext: EvaluationContext) => {
    return evaluateNode(node, evaluationContext)
  }
}

function evaluateNode(node: ASTNode, context: EvaluationContext): boolean {
  if ("type" in node && node.type === "expression") {
    return evaluateExpression(node, context)
  }

  if ("operator" in node) {
    return evaluateOperator(node, context)
  }

  throw new Error(`Unknown node type: ${JSON.stringify(node)}`)
}

function evaluateOperator(node: OperatorNode, context: EvaluationContext): boolean {
  switch (node.operator.toLowerCase()) {
    case "and":
      if (!node.left || !node.right) {
        throw new Error("AND operator requires both left and right operands")
      }
      return evaluateNode(node.left, context) && evaluateNode(node.right, context)

    case "or":
      if (!node.left || !node.right) {
        throw new Error("OR operator requires both left and right operands")
      }
      return evaluateNode(node.left, context) || evaluateNode(node.right, context)

    case "not":
    case "!":
      if (!node.right) {
        throw new Error(`${node.operator.toUpperCase()} operator requires a right operand`)
      }
      return !evaluateNode(node.right, context)

    default:
      throw new Error(`Unknown operator: ${node.operator}`)
  }
}

function evaluateExpression(node: ExpressionNode, context: EvaluationContext): boolean {
  const expression = node.value

  // Handle special cases
  if (expression === "@") {
    return true
  }

  if (expression === "true") {
    return true
  }

  if (expression === "false") {
    return false
  }

  // Parse key:value expressions
  const colonIndex = expression.indexOf(":")
  if (colonIndex === -1) {
    throw new Error(`Invalid expression format: ${expression}`)
  }

  const key = expression.substring(0, colonIndex)
  let value = expression.substring(colonIndex + 1)

  // Handle quoted string matching BEFORE parameter substitution
  if (key.startsWith("'") && key.endsWith("'")) {
    return evaluateQuotedStringMatch(key, value, context)
  }

  // Handle parameter substitution %(...)s
  value = substituteParameters(value, context.params || {})

  // Handle different expression types
  switch (key) {
    case "rule":
      return evaluateRule(value, context)

    case "role":
      return evaluateRole(value, context)

    case "is_admin_project":
      return evaluateIsAdminProject(value, context)

    case "is_admin":
      return evaluateIsAdmin(value, context)

    case "None":
      return evaluateNoneCheck(value, context)

    case "not null":
      return evaluateNotNullCheck(value, context)

    // Handle simple context keys (for backward compatibility)
    case "domain_id":
    case "domain_name":
    case "project_id":
    case "project_domain_id":
    case "user_id":
    case "user_domain_id":
    case "system_scope":
      return evaluateContextMatch(key, value, context)

    // Handle HTTP URL validation
    default:
      if (key.startsWith("http://") || key.startsWith("https://")) {
        return evaluateHttpEndpoint()
      }

      // Handle nested key paths (like token.domain.id, target.user.domain_id, etc.)
      return evaluateNestedKeyMatch(key, value, context)
  }
}

function substituteParameters(value: string, params: PolicyCheckParams): string {
  // Handle %(param.path)s substitution
  const paramPattern = /%\(([^)]+)\)s/g

  return value.replace(paramPattern, (match, paramPath) => {
    const paramValue = getNestedValue(params, paramPath)
    return paramValue !== undefined ? String(paramValue) : match
  })
}

function getNestedValue<T = unknown>(obj: Record<string, unknown>, path: string): T | undefined {
  if (!obj || typeof obj !== "object") {
    return undefined
  }

  return path.split(".").reduce((current, key) => {
    return current && typeof current === "object" && current !== null
      ? (current as Record<string, unknown>)[key]
      : undefined
  }, obj as unknown) as T | undefined
}

function evaluateRule(ruleName: string, context: EvaluationContext): boolean {
  if (!context.getRule) {
    throw new Error("getRule function is required for rule evaluation")
  }

  const ruleFunction = context.getRule(ruleName)
  if (typeof ruleFunction !== "function") {
    throw new Error(`Rule '${ruleName}' is not a function`)
  }

  return ruleFunction()
}

function evaluateRole(roleName: string, context: EvaluationContext): boolean {
  const roles = context.context?.roles
  if (!Array.isArray(roles)) {
    return false
  }

  return roles.some((role) => role.name === roleName)
}

function evaluateIsAdminProject(value: string, context: EvaluationContext): boolean {
  const contextValue = context.context?.is_admin_project

  if (value.toLowerCase() === "true") {
    return contextValue === true
  }

  if (value.toLowerCase() === "false") {
    return contextValue === false
  }

  // For other values, just check truthiness
  return Boolean(contextValue)
}

function evaluateIsAdmin(value: string, context: EvaluationContext): boolean {
  const contextValue = context.context?.is_admin

  // Handle specific value matching
  if (value === "1") {
    return contextValue === true
  }

  if (value.toLowerCase() === "true") {
    return contextValue === true
  }

  if (value.toLowerCase() === "false") {
    return contextValue === false
  }

  // For other values, convert both to strings and compare
  return String(contextValue) === value
}

function evaluateContextMatch(key: string, value: string, context: EvaluationContext): boolean {
  const contextValue = context.context?.[key]

  // Handle null values
  if (value === "null") {
    return contextValue === null || contextValue === undefined
  }

  // Handle 'all' specifically for system_scope
  if (key === "system_scope" && value === "all") {
    return contextValue === "all"
  }

  // Convert both to strings for comparison
  return String(contextValue) === value
}

function evaluateNestedKeyMatch(key: string, value: string, context: EvaluationContext): boolean {
  // This function handles nested key paths like:
  // - token.domain.id:%(target.domain.id)s
  // - target.user.domain_id:some_value
  // - project.domain.id:default

  // First, try to get the value from context (for token.* paths)
  let keyValue = getNestedValue(context.context || {}, key)

  // If not found in context, try to get from params (for target.* paths)
  if (keyValue === undefined) {
    keyValue = getNestedValue(context.params || {}, key)
  }

  // Handle null/undefined comparisons
  if (value === "null") {
    return keyValue === null || keyValue === undefined
  }

  if (keyValue === null || keyValue === undefined) {
    return false
  }

  // Convert both to strings for comparison
  return String(keyValue) === String(value)
}

function evaluateNoneCheck(value: string, context: EvaluationContext): boolean {
  // This handles "None:%(target.role.domain_id)s" patterns
  const actualValue = getNestedValue(context.params || {}, value.replace(/^%\(([^)]+)\)s$/, "$1"))
  return actualValue === null || actualValue === undefined
}

function evaluateNotNullCheck(value: string, context: EvaluationContext): boolean {
  // This handles "not null:%(target.project.parent_id)s" patterns
  const actualValue = getNestedValue(context.params || {}, value.replace(/^%\(([^)]+)\)s$/, "$1"))
  return actualValue !== null && actualValue !== undefined
}

function evaluateQuotedStringMatch(key: string, value: string, context: EvaluationContext): boolean {
  // Handle patterns like 'resource_service':%(target.role.name)s
  const quotedString = key.slice(1, -1) // Remove quotes

  // Substitute parameters in the value
  const substitutedValue = substituteParameters(value, context.params || {})

  return quotedString === substitutedValue
}

function evaluateHttpEndpoint(): boolean {
  // For HTTP endpoints, we'll return true for now as this would typically
  // require making an actual HTTP request which should be mocked in tests
  // In a real implementation, you'd make an HTTP call to validate
  return true
}
