export interface Token {
  type: "expression" | "operator"
  value: string
}

export function tokenize(input: unknown): Token[] {
  // Handle invalid input types
  if (input === null || input === undefined) {
    return []
  }

  if (typeof input !== "string") {
    return []
  }

  const rule = input.trim()

  // Handle empty or whitespace-only strings
  if (!rule) {
    return []
  }

  const tokens: Token[] = []
  let i = 0

  while (i < rule.length) {
    // Skip whitespace
    while (i < rule.length && /\s/.test(rule[i])) {
      i++
    }

    if (i >= rule.length) break

    // Check for parentheses first
    if (rule[i] === "(" || rule[i] === ")") {
      tokens.push({
        type: "operator",
        value: rule[i],
      })
      i++
      continue
    }

    // Find the start of the next token
    const tokenStart = i

    // Look ahead to find potential operators
    const remainingRule = rule.substring(i)

    // Check for operators at the beginning of remaining rule
    const operatorMatch = remainingRule.match(/^(and|or|not)(?=\s|$|\(|\))/i)

    if (operatorMatch) {
      const operatorValue = operatorMatch[1]
      tokens.push({
        type: "operator",
        value: operatorValue,
      })
      i += operatorValue.length
      continue
    }

    // If not an operator, parse as expression
    let tokenEnd = i
    let inSingleQuotes = false
    let inDoubleQuotes = false
    let parenDepth = 0

    while (tokenEnd < rule.length) {
      const char = rule[tokenEnd]

      // Handle quotes
      if (char === "'" && !inDoubleQuotes) {
        inSingleQuotes = !inSingleQuotes
      } else if (char === '"' && !inSingleQuotes) {
        inDoubleQuotes = !inDoubleQuotes
      }
      // Handle parentheses (for placeholders like %(user_id)s)
      else if (char === "(" && !inSingleQuotes && !inDoubleQuotes) {
        parenDepth++
      } else if (char === ")" && !inSingleQuotes && !inDoubleQuotes) {
        if (parenDepth > 0) {
          parenDepth--
        } else {
          // This is a closing paren for grouping, not part of expression
          break
        }
      }
      // Check for expression boundaries
      else if (!inSingleQuotes && !inDoubleQuotes && parenDepth === 0) {
        if (/\s/.test(char)) {
          // Check if the next non-whitespace token is an operator
          const nextTokenMatch = rule.substring(tokenEnd).match(/^\s*(and|or|not|\(|\))/i)
          if (nextTokenMatch) {
            break
          }
        } else if (char === "(" || char === ")") {
          break
        }
      }

      tokenEnd++
    }

    // Extract the token
    const tokenValue = rule.substring(tokenStart, tokenEnd).trim()

    if (tokenValue) {
      tokens.push({
        type: "expression",
        value: tokenValue,
      })
    }

    i = tokenEnd
  }

  return tokens
}
