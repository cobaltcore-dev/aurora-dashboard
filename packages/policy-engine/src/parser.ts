export interface Token {
  type: "expression" | "operator"
  value: string
}

export interface ExpressionNode {
  type: "expression"
  value: string
}

export interface OperatorNode {
  operator: string
  left?: ExpressionNode | OperatorNode
  right?: ExpressionNode | OperatorNode
}

export type ASTNode = ExpressionNode | OperatorNode

export function parse(tokens: Token[]): ASTNode {
  if (tokens.length === 0) {
    throw new Error("PARSE ERROR: empty token array")
  }

  // Validate tokens
  validateTokens(tokens)

  // Handle single expression
  if (tokens.length === 1) {
    if (tokens[0].type === "expression") {
      return {
        type: "expression",
        value: tokens[0].value,
      }
    }
    throw new Error("PARSE ERROR: single token must be an expression")
  }

  let index = 0

  function parseExpression(): ASTNode {
    return parseOr()
  }

  function parseOr(): ASTNode {
    const left = parseAnd()

    if (index < tokens.length && tokens[index]?.value.toLowerCase() === "or") {
      index++ // consume 'or'
      const right = parseOr() // Recursive call for right-associativity

      return {
        operator: "or",
        left,
        right,
      }
    }

    return left
  }

  function parseAnd(): ASTNode {
    const left = parseNot()

    if (index < tokens.length && tokens[index]?.value.toLowerCase() === "and") {
      index++ // consume 'and'
      const right = parseAnd() // Recursive call for right-associativity

      return {
        operator: "and",
        left,
        right,
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
      return {
        type: "expression",
        value: token.value,
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

  const result = parseExpression()

  if (index < tokens.length) {
    throw new Error(`PARSE ERROR: unexpected token after parsing: ${tokens[index].value}`)
  }

  return result
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
