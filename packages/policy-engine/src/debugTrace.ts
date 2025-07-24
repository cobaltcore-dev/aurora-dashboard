interface MessageEntry {
  message: string
  level: number
}

export interface DebugTrace {
  add: (message: string, level?: number) => void
  trace: () => string
  log: () => void
}

export function createDebugTrace(initialMessage?: string): DebugTrace {
  const messages: MessageEntry[] = []

  // Add initial message if provided
  if (initialMessage) {
    messages.push({ message: initialMessage, level: 0 })
  }

  const add = (message: string, level: number = 0): void => {
    messages.push({ message, level })
  }

  const trace = (): string => {
    return messages
      .map(({ message, level }) => {
        const indent = "  ".repeat(level)
        // Using cyan color (\x1b[36m) and reset (\x1b[0m) as shown in the test
        return `${indent}\x1b[36m${message}\x1b[0m`
      })
      .join("\n")
  }

  const log = (): void => {
    console.log(trace())
  }

  return {
    add,
    trace,
    log,
  }
}
