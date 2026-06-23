import { describe, it, expect, vi } from "vitest"
import { buildAppRouter } from "./routers"
import { auroraRouter, publicProcedure } from "./trpc"
import type { PolicyEngine } from "@cobaltcore-dev/policy-engine"

vi.mock("./policies/policyEngineLoader", () => ({
  loadPolicyEngine: vi.fn(
    () =>
      ({
        policy: vi.fn(() => ({ check: vi.fn(() => true) })),
      }) as unknown as PolicyEngine
  ),
}))

describe("buildAppRouter", () => {
  it("returns a router with the built-in Aurora procedures", () => {
    const router = buildAppRouter("/tmp")
    const record = router._def.record
    expect(record).toHaveProperty("auth")
    expect(record).toHaveProperty("compute")
    expect(record).toHaveProperty("network")
    expect(record).toHaveProperty("storage")
    expect(record).toHaveProperty("project")
    expect(record).toHaveProperty("services")
  })

  it("merges custom router procedures alongside built-in ones", () => {
    const customRouter = auroraRouter({
      ping: publicProcedure.query(() => "pong"),
    })

    const router = buildAppRouter("/tmp", [customRouter])
    const record = router._def.record

    expect(record).toHaveProperty("ping")
    expect(record).toHaveProperty("auth")
    expect(record).toHaveProperty("compute")
  })
})
