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
    expect(new SignalOpenstackError("test").message).toContain("test")
  })
})

describe("SignalOpenstackApiError", () => {
  it("should be defined", async () => {
    expect(SignalOpenstackApiError).toBeDefined()
  })

  it("should return an instance of SignalOpenstackApiError", async () => {
    expect(new SignalOpenstackApiError({ message: "Test" })).toBeInstanceOf(SignalOpenstackApiError)
  })

  it("should return an instance of SignalOpenstackApiError with a message", async () => {
    expect(new SignalOpenstackApiError({ message: "test" })).toBeInstanceOf(SignalOpenstackApiError)
  })

  it("should contain a message starting with SignalOpenstack SignalOpenstackApiError: ", async () => {
    expect(new SignalOpenstackApiError({ message: "test" }).message).toContain("test")
  })

  it("should respond to statusCode", async () => {
    expect(new SignalOpenstackApiError({ message: "test" }).statusCode).toBeUndefined()
  })

  it("should respond to statusCode with a value", async () => {
    expect(new SignalOpenstackApiError({ message: "test", statusCode: 500 }).statusCode).toBe(500)
  })

  describe("errorObject", () => {
    it("should return null if no object is provided", async () => {
      expect(new SignalOpenstackApiError({ message: "test" }).message).toBe("test")
    })

    it("should return null if object is an empty object", async () => {
      expect(new SignalOpenstackApiError({ message: "test", errorObject: {} }).message).toBe("test")
    })

    it("should return error from errorObject by message", async () => {
      expect(
        new SignalOpenstackApiError({
          message: "test",
          errorObject: { error: { code: 401, message: "TEST.", title: "Unauthorized" } },
        }).message
      ).toBe("TEST.")
    })

    it("should return error from errorObject by description", async () => {
      expect(
        new SignalOpenstackApiError({
          message: "test",
          errorObject: { error: { code: 401, description: "TEST.", title: "Unauthorized" } },
        }).message
      ).toBe("TEST.")
    })

    it("should return error from errorObject by type", async () => {
      expect(
        new SignalOpenstackApiError({
          message: "test",
          errorObject: { error: { code: 401, type: "TEST.", title: "Unauthorized" } },
        }).message
      ).toBe("TEST.")
    })

    it("should return error from errorObject by faultstring", async () => {
      expect(
        new SignalOpenstackApiError({
          message: "test",
          errorObject: { error: { faultstring: "TEST." } },
        }).message
      ).toBe("TEST.")
    })
  })
})
