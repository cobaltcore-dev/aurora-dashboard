import * as sdk from "./index"

describe("aurora-sdk", () => {
  it("should export getAuroraProvider", () => {
    expect(sdk.getAuroraProvider).toBeDefined()
  })

  it("should export AuroraTRPCError", () => {
    expect(sdk.AuroraTRPCError).toBeDefined()
  })
})
