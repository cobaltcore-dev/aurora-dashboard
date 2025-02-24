import { AuroraSignalError, AuroraSignalApiError } from "./error"

describe("AuroraSignalError", () => {
  it("should be defined", async () => {
    expect(AuroraSignalError).toBeDefined()
  })

  it("should return an instance of AuroraSignalError", async () => {
    expect(new AuroraSignalError("Test")).toBeInstanceOf(AuroraSignalError)
  })

  it("should return an instance of AuroraSignalError with a message", async () => {
    expect(new AuroraSignalError("test")).toBeInstanceOf(AuroraSignalError)
  })

  it("should contain a message starting with AuroraSignal AuroraSignalError: ", async () => {
    expect(new AuroraSignalError("test").message).toContain("AuroraSignalError: ")
  })
})

describe("AuroraSignalApiError", () => {
  it("should be defined", async () => {
    expect(AuroraSignalApiError).toBeDefined()
  })

  it("should return an instance of AuroraSignalApiError", async () => {
    expect(new AuroraSignalApiError("Test")).toBeInstanceOf(AuroraSignalApiError)
  })

  it("should return an instance of AuroraSignalApiError with a message", async () => {
    expect(new AuroraSignalApiError("test")).toBeInstanceOf(AuroraSignalApiError)
  })

  it("should contain a message starting with AuroraSignal AuroraSignalApiError: ", async () => {
    expect(new AuroraSignalApiError("test").message).toContain("AuroraSignalApiError: ")
  })

  it("should respond to statusCode", async () => {
    expect(new AuroraSignalApiError("test").statusCode).toBeUndefined()
  })

  it("should respond to statusCode with a value", async () => {
    expect(new AuroraSignalApiError("test", 500).statusCode).toBe(500)
  })
})
