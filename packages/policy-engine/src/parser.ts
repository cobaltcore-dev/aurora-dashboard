export interface Token {
  type: "expression" | "operator"
  value: string
}

export interface ExpressionNode {
  type: "expression"
  value: string
  requiredParams?: string[]
}

export interface OperatorNode {
  operator: string
  left?: ExpressionNode | OperatorNode
  right?: ExpressionNode | OperatorNode
  requiredParams?: string[]
}

export type ASTNode = ExpressionNode | OperatorNode

export interface ParseResult {
  ast: ASTNode
  requiredParams: string[]
  usedRules: string[]
}

export function parse(tokens: Token[]): ParseResult {
  if (tokens.length === 0) {
    throw new Error("PARSE ERROR: empty token array")
  }

  // Validate tokens
  validateTokens(tokens)

  // Handle single expression
  if (tokens.length === 1) {
    if (tokens[0].type === "expression") {
      const node: ExpressionNode = {
        type: "expression",
        value: tokens[0].value,
      }
      const { requiredParams, usedRules } = extractFromExpression(tokens[0].value)
      node.requiredParams = requiredParams
      return {
        ast: node,
        requiredParams,
        usedRules,
      }
    }
    throw new Error("PARSE ERROR: single token must be an expression")
  }

  let index = 0
  const allRequiredParams = new Set<string>()
  const allUsedRules = new Set<string>()

  function parseExpression(): ASTNode {
    return parseOr()
  }

  function parseOr(): ASTNode {
    const left = parseAnd()

    if (index < tokens.length && tokens[index]?.value.toLowerCase() === "or") {
      index++ // consume 'or'
      const right = parseOr() // Recursive call for right-associativity
      const leftParams = left.requiredParams || []
      const rightParams = right.requiredParams || []
      const combinedParams = [...new Set([...leftParams, ...rightParams])]
      return {
        operator: "or",
        left,
        right,
        requiredParams: combinedParams,
      }
    }
    return left
  }

  function parseAnd(): ASTNode {
    const left = parseNot()

    if (index < tokens.length && tokens[index]?.value.toLowerCase() === "and") {
      index++ // consume 'and'
      const right = parseAnd() // Recursive call for right-associativity
      const leftParams = left.requiredParams || []
      const rightParams = right.requiredParams || []
      const combinedParams = [...new Set([...leftParams, ...rightParams])]
      return {
        operator: "and",
        left,
        right,
        requiredParams: combinedParams,
      }
    }
    return left
  }

  function parseNot(): ASTNode {
    if (index < tokens.length && tokens[index]?.value.toLowerCase() === "not") {
      index++ // consume 'not'
      const right = parseNot() // Handle multiple 'not' operators
      return {
        operator: "not",
        right,
        requiredParams: right.requiredParams || [],
      }
    }
    return parsePrimary()
  }

  function parsePrimary(): ASTNode {
    if (index >= tokens.length) {
      throw new Error("PARSE ERROR: unexpected end of tokens")
    }

    const token = tokens[index]

    if (token.type === "expression") {
      index++
      const { requiredParams, usedRules } = extractFromExpression(token.value)
      // Add to global sets
      requiredParams.forEach((param) => allRequiredParams.add(param))
      usedRules.forEach((rule) => allUsedRules.add(rule))

      return {
        type: "expression",
        value: token.value,
        requiredParams,
      }
    }

    if (token.value === "(") {
      index++ // consume '('
      const expr = parseExpression()
      if (index >= tokens.length || tokens[index].value !== ")") {
        throw new Error("PARSE ERROR: missing closing parenthesis")
      }
      index++ // consume ')'
      return expr
    }

    throw new Error(`PARSE ERROR: unexpected token ${token.value}`)
  }

  const ast = parseExpression()

  if (index < tokens.length) {
    throw new Error(`PARSE ERROR: unexpected token after parsing: ${tokens[index].value}`)
  }

  return {
    ast,
    requiredParams: Array.from(allRequiredParams).sort(),
    usedRules: Array.from(allUsedRules).sort(),
  }
}

// Function to extract parameters and rules from expression strings
function extractFromExpression(expression: string): { requiredParams: string[]; usedRules: string[] } {
  const requiredParams = new Set<string>()
  const usedRules = new Set<string>()

  const parameterPattern = /%\(([a-zA-Z0-9_]+)\)s/g // %(param_name)s (Python string formatting style)
  const matches = expression.matchAll(parameterPattern)

  for (const m of matches) {
    if (m[1]) {
      requiredParams.add(m[1])
    }
  }

  // Rule reference patterns - adjust based on your syntax
  const rulePatterns = [
    /rule:(\w+)/g, // rule:rule_name
    /rules\.(\w+)/g, // rules.rule_name
    /\brule\((['"]?)(\w+)\1\)/g, // rule("rule_name") or rule('rule_name') or rule(rule_name)
  ]

  // Extract rule references
  rulePatterns.forEach((pattern) => {
    let match
    while ((match = pattern.exec(expression)) !== null) {
      // Handle the case where there might be quotes around the rule name
      const ruleName = match[2] || match[1]
      if (ruleName) {
        usedRules.add(ruleName)
      }
    }
  })

  // Special case: if the expression doesn't contain operators and looks like a rule name
  // (no colons, no parentheses, no special characters), it might be a rule reference
  if (!/[:()[\]{}$%@]/.test(expression) && /^[a-zA-Z_][\w_]*$/.test(expression.trim())) {
    usedRules.add(expression.trim())
  }

  return {
    requiredParams: Array.from(requiredParams).sort(),
    usedRules: Array.from(usedRules).sort(),
  }
}

function validateTokens(tokens: Token[]): void {
  if (tokens.length === 0) {
    return
  }

  // Check if tokens begin with 'and' or 'or'
  const firstToken = tokens[0]
  if (
    firstToken.type === "operator" &&
    (firstToken.value.toLowerCase() === "and" || firstToken.value.toLowerCase() === "or")
  ) {
    throw new Error("PARSE ERROR: tokens must not begin with 'and' or 'or'")
  }

  // Check if tokens end with 'and', 'or', or 'not'
  const lastToken = tokens[tokens.length - 1]
  if (
    lastToken.type === "operator" &&
    (lastToken.value.toLowerCase() === "and" ||
      lastToken.value.toLowerCase() === "or" ||
      lastToken.value.toLowerCase() === "not")
  ) {
    throw new Error("PARSE ERROR: tokens must not end with 'and' or 'or' or 'not'")
  }

  // Check for consecutive operators of type 'and' or 'or'
  for (let i = 0; i < tokens.length - 1; i++) {
    const current = tokens[i]
    const next = tokens[i + 1]

    if (current.type === "operator" && next.type === "operator") {
      const currentIsAndOr = current.value.toLowerCase() === "and" || current.value.toLowerCase() === "or"
      const nextIsAndOr = next.value.toLowerCase() === "and" || next.value.toLowerCase() === "or"

      if (currentIsAndOr && nextIsAndOr) {
        throw new Error("PARSE ERROR: tokens must not contain two operators of the type 'and' or 'or' in a row")
      }
    }

    // Check for consecutive expressions
    if (current.type === "expression" && next.type === "expression") {
      throw new Error("PARSE ERROR: tokens must not contain two expressions in a row")
    }
  }

  // Validate parentheses matching
  let parenCount = 0
  for (const token of tokens) {
    if (token.value === "(") {
      parenCount++
    } else if (token.value === ")") {
      parenCount--
      if (parenCount < 0) {
        throw new Error("PARSE ERROR: mismatched parentheses")
      }
    }
  }

  if (parenCount !== 0) {
    throw new Error("PARSE ERROR: mismatched parentheses")
  }
}
