import { createDebugTrace, DebugTrace } from "./debugTrace.js"

describe("createDebugTrace", () => {
  it("is a function", () => {
    expect(typeof createDebugTrace).toEqual("function")
  })

  describe("trace", () => {
    let debugTrace: DebugTrace
    beforeEach(() => {
      debugTrace = createDebugTrace()
    })

    it("responds to add", () => {
      expect(typeof debugTrace.add).toEqual("function")
    })

    it("responds to trace", () => {
      expect(typeof debugTrace.trace).toEqual("function")
    })

    it("responds to log", () => {
      expect(typeof debugTrace.log).toEqual("function")
    })

    it("creates a trace with initial message", () => {
      const trace = createDebugTrace("hello")
      expect(trace.trace()).toEqual("\x1b[36mhello\x1b[0m")
    })
  })
})
