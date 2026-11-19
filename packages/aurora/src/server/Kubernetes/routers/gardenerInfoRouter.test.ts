import { describe, it, expect, vi } from "vitest"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { auroraRouter, createCallerFactory } from "../../trpc"
import type { AuroraPortalContext } from "../../context"
import { kubernetesRouters } from "./index"

const url = "https://persephone-qa.example/"

function setup() {
  const controller = new AbortController()
  const get = vi.fn()
  const endpoints = [{ id: "e1", interface: "public", region: "qa-de-1", region_id: "qa-de-1", url }]
  const service = { get, getEndpoint: (): string | null => url }
  const session = {
    getToken: () => ({
      authToken: "tok-123",
      tokenData: {
        project: { id: "p-1" },
        catalog: [{ type: "persephone-qa", name: "persephone", id: "s1", endpoints }],
      },
    }),
    service: vi.fn().mockReturnValue(service),
  }
  const validateSession = vi.fn(() => true)
  const ctx = {
    validateSession,
    rescopeSession: vi.fn(async () => session),
    openstack: session,
    signal: controller.signal,
  } as unknown as AuroraPortalContext
  const caller = createCallerFactory(auroraRouter(kubernetesRouters))(ctx)
  const json = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
  return { get, ctx, caller, json, validateSession }
}

describe("kubernetes.getGardenerInfo", () => {
  it("returns the landscape and version through the project-scoped procedure", async () => {
    const h = setup()
    h.get.mockResolvedValue(
      h.json({ data: { gardenerAPIServer: "version: v1.111.0\nworkloadIdentityIssuerURL: https://x\n" } })
    )
    const result = await h.caller.kubernetes.getGardenerInfo({ project_id: "p-1", landscape: "qa" })
    expect(result).toEqual({ landscape: "qa", version: "v1.111.0" })
    expect(h.ctx.rescopeSession).toHaveBeenCalledWith({ projectId: "p-1" })
    expect(JSON.stringify(result)).not.toContain("tok-123")
  })

  it("returns a null version when the ConfigMap has no gardenerAPIServer", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ data: {} }))
    expect(await h.caller.kubernetes.getGardenerInfo({ project_id: "p-1", landscape: "qa" })).toEqual({
      landscape: "qa",
      version: null,
    })
  })

  it("rejects an unknown landscape", async () => {
    const h = setup()
    await expect(
      h.caller.kubernetes.getGardenerInfo({ project_id: "p-1", landscape: "production" as "qa" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    expect(h.get).not.toHaveBeenCalled()
  })

  it("maps a Gardener 401 to BAD_GATEWAY while the session is valid", async () => {
    const h = setup()
    h.get.mockRejectedValue(new SignalOpenstackApiError("Unauthorized", 401))
    await expect(h.caller.kubernetes.getGardenerInfo({ project_id: "p-1", landscape: "qa" })).rejects.toMatchObject({
      code: "BAD_GATEWAY",
    })
  })

  it("maps a Gardener 401 to UNAUTHORIZED once the session is no longer valid", async () => {
    const h = setup()
    h.get.mockImplementation(async () => {
      h.validateSession.mockReturnValue(false)
      throw new SignalOpenstackApiError("Unauthorized", 401)
    })
    await expect(h.caller.kubernetes.getGardenerInfo({ project_id: "p-1", landscape: "qa" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })
  })
})
