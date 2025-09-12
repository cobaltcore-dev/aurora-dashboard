import { createDebugTrace, DebugTrace } from "./debugTrace.js"

describe("createDebugTrace", () => {
  it("is a function", () => {
    expect(typeof createDebugTrace).toEqual("function")
  })
  describe("initialization", () => {
    it("creates a trace without initial message", () => {
      const debugTrace = createDebugTrace()
      expect(debugTrace.getMessages()).toEqual([])
      expect(debugTrace.trace()).toEqual("")
    })
    it("creates a trace with initial message", () => {
      const debugTrace = createDebugTrace("Initial trace")
      const messages = debugTrace.getMessages()
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({
        message: "Initial trace",
        level: 0,
        type: "start",
      })
      expect(messages[0].timestamp).toBeDefined()
      expect(debugTrace.trace()).toEqual("\x1b[33mInitial trace\x1b[0m")
    })
  })
  describe("interface methods", () => {
    let debugTrace: DebugTrace
    beforeEach(() => {
      debugTrace = createDebugTrace()
    })
    it("has all required methods", () => {
      expect(typeof debugTrace.add).toEqual("function")
      expect(typeof debugTrace.startRule).toEqual("function")
      expect(typeof debugTrace.endRule).toEqual("function")
      expect(typeof debugTrace.addExpression).toEqual("function")
      expect(typeof debugTrace.addContext).toEqual("function")
      expect(typeof debugTrace.addEvaluation).toEqual("function")
      expect(typeof debugTrace.merge).toEqual("function")
      expect(typeof debugTrace.trace).toEqual("function")
      expect(typeof debugTrace.log).toEqual("function")
      expect(typeof debugTrace.getMessages).toEqual("function")
    })
  })
  describe("add method", () => {
    let debugTrace: DebugTrace
    beforeEach(() => {
      debugTrace = createDebugTrace()
    })
    it("adds a basic message with defaults", () => {
      debugTrace.add("Test message")
      const messages = debugTrace.getMessages()
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({
        message: "Test message",
        level: 0,
        type: "info",
      })
      expect(messages[0].timestamp).toBeDefined()
    })
    it("adds a message with custom level and type", () => {
      debugTrace.add("Error message", 2, "error")
      const messages = debugTrace.getMessages()
      expect(messages[0]).toMatchObject({
        message: "Error message",
        level: 2,
        type: "error",
      })
    })
    it("adds multiple messages", () => {
      debugTrace.add("First message")
      debugTrace.add("Second message", 1)
      expect(debugTrace.getMessages()).toHaveLength(2)
    })
  })
  describe("startRule method", () => {
    let debugTrace: DebugTrace
    beforeEach(() => {
      debugTrace = createDebugTrace()
    })
    it("starts a rule without expression", () => {
      debugTrace.startRule("TestRule")
      const messages = debugTrace.getMessages()
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({
        message: "🎯 Starting rule: 'TestRule'",
        level: 0,
        type: "start",
      })
    })
    it("starts a rule with expression", () => {
      debugTrace.startRule("TestRule", 1, "user.role === 'admin'")
      const messages = debugTrace.getMessages()
      expect(messages).toHaveLength(2)
      expect(messages[0]).toMatchObject({
        message: "🎯 Starting rule: 'TestRule'",
        level: 1,
        type: "start",
      })
      expect(messages[1]).toMatchObject({
        message: "📄 Expression: user.role === 'admin'",
        level: 2,
        type: "expression",
      })
    })
    it("starts a rule with custom level", () => {
      debugTrace.startRule("TestRule", 3)
      const messages = debugTrace.getMessages()
      expect(messages[0].level).toBe(3)
    })
  })
  describe("endRule method", () => {
    let debugTrace: DebugTrace
    beforeEach(() => {
      debugTrace = createDebugTrace()
    })
    it("ends a rule with success result", () => {
      debugTrace.endRule("TestRule", true)
      const messages = debugTrace.getMessages()
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({
        message: "✅ Rule 'TestRule' → ALLOWED",
        level: 0,
        type: "end",
      })
    })
    it("ends a rule with failure result", () => {
      debugTrace.endRule("TestRule", false, 2)
      const messages = debugTrace.getMessages()
      expect(messages[0]).toMatchObject({
        message: "🚫 Rule 'TestRule' → DENIED",
        level: 2,
        type: "end",
      })
    })
  })
  describe("addExpression method", () => {
    let debugTrace: DebugTrace
    beforeEach(() => {
      debugTrace = createDebugTrace()
    })
    it("adds an expression", () => {
      debugTrace.addExpression("user.age > 18", 1)
      const messages = debugTrace.getMessages()
      expect(messages[0]).toMatchObject({
        message: "📄 Expression: user.age > 18",
        level: 1,
        type: "expression",
      })
    })
  })
  describe("addContext method", () => {
    let debugTrace: DebugTrace
    beforeEach(() => {
      debugTrace = createDebugTrace()
    })
    it("adds context with string value", () => {
      debugTrace.addContext("userId", "123", 1)
      const messages = debugTrace.getMessages()
      expect(messages[0]).toMatchObject({
        message: "🔍 Context.userId: 123",
        level: 1,
        type: "context",
      })
    })
    it("adds context with object value", () => {
      const userObject = { id: 123, name: "John" }
      debugTrace.addContext("user", userObject)
      const messages = debugTrace.getMessages()
      expect(messages[0].message).toContain("🔍 Context.user:")
      expect(messages[0].message).toContain('"id": 123')
      expect(messages[0].message).toContain('"name": "John"')
      expect(messages[0].type).toBe("context")
    })
    it("adds context with number value", () => {
      debugTrace.addContext("count", 42)
      const messages = debugTrace.getMessages()
      expect(messages[0]).toMatchObject({
        message: "🔍 Context.count: 42",
        type: "context",
      })
    })
  })
  describe("addEvaluation method", () => {
    let debugTrace: DebugTrace
    beforeEach(() => {
      debugTrace = createDebugTrace()
    })
    it("adds evaluation with true result", () => {
      debugTrace.addEvaluation("Check user permissions", true, 1)
      const messages = debugTrace.getMessages()
      expect(messages[0]).toMatchObject({
        message: "✅ Check user permissions → true",
        level: 1,
        type: "result",
      })
    })
    it("adds evaluation with false result", () => {
      debugTrace.addEvaluation("Validate token", false)
      const messages = debugTrace.getMessages()
      expect(messages[0]).toMatchObject({
        message: "🚫 Validate token → false",
        type: "result",
      })
    })
    it("adds evaluation with other result", () => {
      debugTrace.addEvaluation("Calculate score", 85)
      const messages = debugTrace.getMessages()
      expect(messages[0]).toMatchObject({
        message: "🔄 Calculate score → 85",
        type: "result",
      })
    })
  })
  describe("merge method", () => {
    it("merges messages from another trace", () => {
      const trace1 = createDebugTrace("First trace")
      const trace2 = createDebugTrace("Second trace")
      trace1.add("Message 1")
      trace2.add("Message 2")
      trace2.add("Message 3")
      trace1.merge(trace2)
      const messages = trace1.getMessages()
      expect(messages).toHaveLength(5)
      expect(messages[0].message).toBe("First trace")
      expect(messages[1].message).toBe("Message 1")
      expect(messages[2].message).toBe("Second trace")
      expect(messages[3].message).toBe("Message 2")
      expect(messages[4].message).toBe("Message 3")
    })
    it("preserves message properties when merging", () => {
      const trace1 = createDebugTrace()
      const trace2 = createDebugTrace()
      trace2.addEvaluation("Test step", true, 2)
      trace1.merge(trace2)
      const messages = trace1.getMessages()
      expect(messages[0]).toMatchObject({
        message: "✅ Test step → true",
        level: 2,
        type: "result",
      })
    })
  })
  describe("trace method (formatting)", () => {
    let debugTrace: DebugTrace
    beforeEach(() => {
      debugTrace = createDebugTrace()
    })
    it("formats messages with proper indentation", () => {
      debugTrace.add("Level 0", 0)
      debugTrace.add("Level 1", 1)
      debugTrace.add("Level 2", 2)
      const output = debugTrace.trace()
      const lines = output.split("\n")
      // eslint-disable-next-line no-control-regex
      expect(lines[0]).toMatch(/^[\u001b]\[36mLevel 0[\u001b]\[0m$/)
      // eslint-disable-next-line no-control-regex
      expect(lines[1]).toMatch(/^\s{2}[\u001b]\[36mLevel 1[\u001b]\[0m$/)
      // eslint-disable-next-line no-control-regex
      expect(lines[2]).toMatch(/^\s{4}[\u001b]\[36mLevel 2[\u001b]\[0m$/)
    })
    it("applies correct colors for different message types", () => {
      debugTrace.add("Start", 0, "start")
      debugTrace.add("End", 0, "end")
      debugTrace.add("Error", 0, "error")
      debugTrace.add("Info", 0, "info")
      debugTrace.add("Expression", 0, "expression")
      debugTrace.add("Context", 0, "context")
      debugTrace.add("Result", 0, "result")
      const output = debugTrace.trace()
      const lines = output.split("\n")
      expect(lines[0]).toContain("\x1b[33m") // yellow for start
      expect(lines[1]).toContain("\x1b[32m") // green for end
      expect(lines[2]).toContain("\x1b[31m") // red for error
      expect(lines[3]).toContain("\x1b[36m") // cyan for info
      expect(lines[4]).toContain("\x1b[35m") // magenta for expression
      expect(lines[5]).toContain("\x1b[34m") // blue for context
      expect(lines[6]).toContain("\x1b[32m") // green for result
    })
    it("returns empty string for empty trace", () => {
      expect(debugTrace.trace()).toBe("")
    })
  })
  describe("log method", () => {
    it("calls console.log with trace output", () => {
      const consoleSpy = vi.spyOn(console, "log")
      const debugTrace = createDebugTrace()
      debugTrace.add("Test message")
      debugTrace.log()
      expect(consoleSpy).toHaveBeenCalledWith(debugTrace.trace())
    })
  })
  describe("getMessages method", () => {
    it("returns a copy of messages array", () => {
      const debugTrace = createDebugTrace()
      debugTrace.add("Test")
      const messages1 = debugTrace.getMessages()
      const messages2 = debugTrace.getMessages()
      expect(messages1).toEqual(messages2)
      expect(messages1).not.toBe(messages2) // Different array instances
    })
    it("returned array modifications don't affect internal state", () => {
      const debugTrace = createDebugTrace()
      debugTrace.add("Test")
      const messages = debugTrace.getMessages()
      messages.push({
        message: "Hacked",
        level: 0,
        timestamp: Date.now(),
        type: "info",
      })
      expect(debugTrace.getMessages()).toHaveLength(1)
    })
  })
  describe("integration scenarios", () => {
    it("creates a complete rule evaluation trace", () => {
      const debugTrace = createDebugTrace("Authorization Check")
      debugTrace.addContext("user", { id: 123, role: "admin" })
      debugTrace.addContext("resource", "users")
      debugTrace.startRule("AdminRule", 1, "user.role === 'admin'")
      debugTrace.addEvaluation("Check user role", true, 2)
      debugTrace.endRule("AdminRule", true, 1)
      const messages = debugTrace.getMessages()
      expect(messages).toHaveLength(7)
      const trace = debugTrace.trace()
      expect(trace).toContain("Authorization Check")
      expect(trace).toContain("Context.user")
      expect(trace).toContain("Starting rule: 'AdminRule'")
      expect(trace).toContain("ALLOWED")
    })
    it("handles complex nested evaluation", () => {
      const debugTrace = createDebugTrace()
      debugTrace.startRule("ParentRule", 0)
      debugTrace.startRule("ChildRule", 1)
      debugTrace.addEvaluation("Deep check", false, 2)
      debugTrace.endRule("ChildRule", false, 1)
      debugTrace.endRule("ParentRule", false, 0)
      const trace = debugTrace.trace()
      const lines = trace.split("\n")
      // Check indentation levels
      // eslint-disable-next-line no-control-regex
      expect(lines[0]).toMatch(/^[\u001b]/) // Level 0
      // eslint-disable-next-line no-control-regex
      expect(lines[1]).toMatch(/^\s{2}[\u001b]/) // Level 1
      // eslint-disable-next-line no-control-regex
      expect(lines[2]).toMatch(/^\s{4}[\u001b]/) // Level 2
      // eslint-disable-next-line no-control-regex
      expect(lines[3]).toMatch(/^\s{2}[\u001b]/) // Level 1
      // eslint-disable-next-line no-control-regex
      expect(lines[4]).toMatch(/^[\u001b]/) // Level 0
    })
  })
})
