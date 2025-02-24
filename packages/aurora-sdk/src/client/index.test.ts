import * as sdk from "./index"
import { describe, it, expect } from "vitest"

describe("aurora-sdk", () => {
  it("should export createAuroraTRPCClient", () => {
    expect(sdk.createAuroraTRPCClient).toBeDefined()
  })
})
