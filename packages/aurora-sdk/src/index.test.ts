import * as sdk from "./index"
import { describe, it, expect } from "vitest"

describe("aurora-sdk", () => {
  it("should export getAuroraProvider", () => {
    expect(sdk.getAuroraProvider).toBeDefined()
  })

  it("should export AuroraTRPCError", () => {
    expect(sdk.AuroraSDKTRPCError).toBeDefined()
  })
})
