import { describe, it, expect } from "vitest"
import { createAuroraTRPCClient } from "./aurora-trpc"

describe("aurora-trpc", () => {
  it("should export createAuroraTRPCClient", () => {
    expect(createAuroraTRPCClient).toBeDefined()
  })

  it("should return a trpc client", () => {
    const client = createAuroraTRPCClient("http://localhost:3000")
    expect(client).toBeDefined()
  })
})
