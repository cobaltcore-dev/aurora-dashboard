interface MessageEntry {
  message: string
  level: number
  timestamp?: number
  type?: "start" | "end" | "info" | "error" | "expression" | "context" | "result"
  ruleName?: string
  result?: boolean
}

export interface DebugTrace {
  add: (
    message: string,
    level?: number,
    type?: "start" | "end" | "info" | "error" | "expression" | "context" | "result"
  ) => void
  startRule: (ruleName: string, level?: number, expression?: string) => void
  endRule: (ruleName: string, result: boolean, level?: number) => void
  addExpression: (expression: string, level?: number) => void
  addContext: (key: string, value: unknown, level?: number) => void
  addEvaluation: (step: string, result: unknown, level?: number) => void
  merge: (otherTrace: DebugTrace) => void
  trace: () => string
  log: () => void
  getMessages: () => MessageEntry[]
}

export function createDebugTrace(initialMessage?: string): DebugTrace {
  const messages: MessageEntry[] = []

  // Add initial message if provided
  if (initialMessage) {
    messages.push({
      message: initialMessage,
      level: 0,
      timestamp: Date.now(),
      type: "start",
    })
  }

  const add = (
    message: string,
    level: number = 0,
    type: "start" | "end" | "info" | "error" | "expression" | "context" | "result" = "info"
  ): void => {
    messages.push({
      message,
      level,
      timestamp: Date.now(),
      type,
    })
  }

  const startRule = (ruleName: string, level: number = 0, expression?: string): void => {
    add(`🎯 Starting rule: '${ruleName}'`, level, "start")
    if (expression) {
      add(`📄 Expression: ${expression}`, level + 1, "expression")
    }
  }

  const endRule = (ruleName: string, result: boolean, level: number = 0): void => {
    const icon = result ? "✅" : "🚫"
    const resultText = result ? "ALLOWED" : "DENIED"
    add(`${icon} Rule '${ruleName}' → ${resultText}`, level, "end")
  }

  const addExpression = (expression: string, level: number = 0): void => {
    add(`📄 Expression: ${expression}`, level, "expression")
  }

  const addContext = (key: string, value: unknown, level: number = 0): void => {
    const displayValue = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)
    add(`🔍 Context.${key}: ${displayValue}`, level, "context")
  }

  const addEvaluation = (step: string, result: unknown, level: number = 0): void => {
    const icon = result === true ? "✅" : result === false ? "🚫" : "🔄"
    add(`${icon} ${step} → ${result}`, level, "result")
  }

  const merge = (otherTrace: DebugTrace): void => {
    const otherMessages = otherTrace.getMessages()
    otherMessages.forEach((msg) => {
      messages.push({ ...msg })
    })
  }

  const getMessages = (): MessageEntry[] => {
    return [...messages]
  }

  const trace = (): string => {
    return messages
      .map(({ message, level, type }) => {
        const indent = "  ".repeat(level)

        // Different colors for different types
        let color = "\x1b[36m" // cyan (default)
        switch (type) {
          case "start":
            color = "\x1b[33m" // yellow
            break
          case "end":
            color = "\x1b[32m"
            break
          case "error":
            color = "\x1b[31m" // red
            break
          case "info":
            color = "\x1b[36m" // cyan
            break
          case "expression":
            color = "\x1b[35m" // magenta
            break
          case "context":
            color = "\x1b[34m" // blue
            break
          case "result":
            color = "\x1b[32m" // green
            break
        }

        return `${indent}${color}${message}\x1b[0m`
      })
      .join("\n")
  }

  const log = (): void => {
    console.log(trace())
  }

  return {
    add,
    startRule,
    endRule,
    addExpression,
    addContext,
    addEvaluation,
    merge,
    trace,
    log,
    getMessages,
  }
}
