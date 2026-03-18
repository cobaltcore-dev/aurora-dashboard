import { describe, it, expect } from "vitest"
import { NetworkErrorHandlers } from "./networkHelpers"
import { DEFAULT_ERROR_NAME } from "./index"

describe("NetworkErrorHandlers.list", () => {
  it("is wired to shared error handler", () => {
    const error = NetworkErrorHandlers.list({ status: 500, statusText: "Internal Server Error" })
    expect(error.code).toBe(DEFAULT_ERROR_NAME)
    expect(error.message).toBe("Failed to fetch list: Network: Internal Server Error")
  })
})
