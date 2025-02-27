import { SignalOpenstackError, SignalOpenstackApiError } from "./error"

describe("SignalOpenstackError", () => {
  it("should be defined", async () => {
    expect(SignalOpenstackError).toBeDefined()
  })

  it("should return an instance of SignalOpenstackError", async () => {
    expect(new SignalOpenstackError("Test")).toBeInstanceOf(SignalOpenstackError)
  })

  it("should return an instance of SignalOpenstackError with a message", async () => {
    expect(new SignalOpenstackError("test")).toBeInstanceOf(SignalOpenstackError)
  })

  it("should contain a message starting with SignalOpenstack SignalOpenstackError: ", async () => {
    expect(new SignalOpenstackError("test").message).toContain("SignalOpenstackError: ")
  })
})

describe("SignalOpenstackApiError", () => {
  it("should be defined", async () => {
    expect(SignalOpenstackApiError).toBeDefined()
  })

  it("should return an instance of SignalOpenstackApiError", async () => {
    expect(new SignalOpenstackApiError("Test")).toBeInstanceOf(SignalOpenstackApiError)
  })

  it("should return an instance of SignalOpenstackApiError with a message", async () => {
    expect(new SignalOpenstackApiError("test")).toBeInstanceOf(SignalOpenstackApiError)
  })

  it("should contain a message starting with SignalOpenstack SignalOpenstackApiError: ", async () => {
    expect(new SignalOpenstackApiError("test").message).toContain("SignalOpenstackApiError: ")
  })

  it("should respond to statusCode", async () => {
    expect(new SignalOpenstackApiError("test").statusCode).toBeUndefined()
  })

  it("should respond to statusCode with a value", async () => {
    expect(new SignalOpenstackApiError("test", 500).statusCode).toBe(500)
  })
})
