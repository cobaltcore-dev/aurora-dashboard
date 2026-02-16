import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { wrapError, withErrorHandling } from "./errorHandling"

describe("wrapError", () => {
  it("passes through TRPCError as-is", () => {
    const originalError = new TRPCError({ code: "UNAUTHORIZED", message: "Not allowed" })
    const result = wrapError(originalError, "testOp")
    expect(result).toBe(originalError)
  })

  it("wraps Error with message", () => {
    const error = new Error("Network timeout")
    const result = wrapError(error, "fetchData")
    expect(result).toBeInstanceOf(TRPCError)
    expect(result.code).toBe("INTERNAL_SERVER_ERROR")
    expect(result.message).toBe("Error during fetchData: Network timeout")
    expect(result.cause).toBe(error)
  })

  it("wraps Error without message", () => {
    const error = new Error()
    const result = wrapError(error, "parseJSON")
    expect(result.code).toBe("INTERNAL_SERVER_ERROR")
    expect(result.message).toBe("Error during parseJSON")
    expect(result.cause).toBe(error)
  })

  it("wraps string error", () => {
    const error = "Something went wrong"
    const result = wrapError(error, "validateInput")
    expect(result.code).toBe("INTERNAL_SERVER_ERROR")
    expect(result.message).toBe("Error during validateInput: Something went wrong")
    expect(result.cause).toBe(error)
  })

  it("handles custom Error subclasses", () => {
    class CustomError extends Error {
      constructor() {
        super("Custom error message")
        this.name = "CustomError"
      }
    }
    const error = new CustomError()
    const result = wrapError(error, "customOp")
    expect(result.message).toBe("Error during customOp: Custom error message")
    expect(result.cause).toBe(error)
  })
})

describe("withErrorHandling", () => {
  it("returns successful operation result", async () => {
    const operation = async () => "success"
    const result = await withErrorHandling(operation, "testOp")
    expect(result).toBe("success")
  })

  it("wraps thrown Error as TRPCError", async () => {
    const operation = async () => {
      throw new Error("Database connection failed")
    }
    await expect(withErrorHandling(operation, "queryDB")).rejects.toThrow(TRPCError)
    try {
      await withErrorHandling(operation, "queryDB")
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError)
      expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR")
      expect((error as TRPCError).message).toBe("Error during queryDB: Database connection failed")
    }
  })

  it("rethrows TRPCError as-is", async () => {
    const trpcError = new TRPCError({ code: "FORBIDDEN", message: "Access denied" })
    const operation = async () => {
      throw trpcError
    }
    try {
      await withErrorHandling(operation, "checkPerms")
    } catch (error) {
      expect(error).toBe(trpcError)
      expect((error as TRPCError).code).toBe("FORBIDDEN")
    }
  })

  it("wraps thrown string as TRPCError", async () => {
    const operation = async () => {
      throw "Validation failed"
    }
    try {
      await withErrorHandling(operation, "validate")
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError)
      expect((error as TRPCError).message).toBe("Error during validate: Validation failed")
    }
  })

  it("preserves async operation type correctly", async () => {
    const operation = async (): Promise<{ id: number; name: string }> => ({
      id: 1,
      name: "test",
    })
    const result = await withErrorHandling(operation, "getUser")
    expect(result.id).toBe(1)
    expect(result.name).toBe("test")
  })
})
