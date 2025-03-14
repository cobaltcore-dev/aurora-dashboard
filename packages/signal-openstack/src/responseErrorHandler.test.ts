import { parseErrorObject } from "./responseErrorHandler"

describe("responseErrorHandler", () => {
  it("should return null for undefined input", () => {
    expect(parseErrorObject(undefined)).toBeNull()
  })

  it("should return null for null input", () => {
    expect(parseErrorObject(null)).toBeNull()
  })

  it("should return a string when passed a string directly", () => {
    const errorMessage = "This is a string error message."
    expect(parseErrorObject(errorMessage)).toBe(errorMessage)
  })

  it("should parse a simple error object and return the message", () => {
    const errorObject = {
      message: "Unauthorized access",
    }
    expect(parseErrorObject(errorObject)).toBe("Unauthorized access")
  })

  it("should parse a complex error object and return the first available message", () => {
    const errorObject = {
      type: "authentication",
      message: "Unauthorized access",
      description: "You are not logged in",
    }
    expect(parseErrorObject(errorObject)).toBe("Unauthorized access")
  })

  it("should return the first found message from the complex structure", () => {
    const errorObject = {
      faultstring: "Some error",
      details: {
        message: "Actual message shows here",
      },
    }
    expect(parseErrorObject(errorObject)).toBe("Some error")
  })

  test("parseErrorObject", () => {
    const errorObject = { error: { code: 401, message: "TEST.", title: "Unauthorized" } }
    expect(parseErrorObject(errorObject)).toEqual("TEST.")
  })

  it("should parse and return the faultstring if no other messages are found", () => {
    const errorObject = {
      faultstring: "An unexpected error occurred",
    }
    expect(parseErrorObject(errorObject)).toBe("An unexpected error occurred")
  })

  it("should return concatenated messages from objects", () => {
    const errorObject = {
      error1: { message: "First error message" },
      error2: { message: "Second error message" },
      error3: { faultstring: "Third error message" },
    }
    expect(parseErrorObject(errorObject)).toBe("First error message, Second error message, Third error message")
  })
})
