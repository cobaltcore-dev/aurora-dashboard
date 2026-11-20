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
  const getEndpoint = vi.fn((opts?: { interfaceName?: string }): string | null => {
    return opts?.interfaceName === "public" ? url : null
  })
  const service = { get, getEndpoint }
  const session = {
    getToken: () => ({
      authToken: "tok-123",
      tokenData: {
        project: { id: "p-1" },
        catalog: [{ type: "kubernetes", name: "persephone-qa", id: "s1", endpoints }],
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

describe("kubernetes.getGardenKubeconfig", () => {
  it("returns a kubeconfig with server, namespace and token", async () => {
    const h = setup()
    const result = await h.caller.kubernetes.getGardenKubeconfig({ project_id: "p-1", landscape: "qa" })

    expect(result.kubeconfig).toContain(`server: "${url}"`)
    expect(result.kubeconfig).toContain('namespace: "garden-qa-de-1-p-1"')
    expect(result.kubeconfig).toContain('token: "qa-de-1:tok-123"')
    expect(result.kubeconfig).toContain('current-context: "garden"')
  })

  it("contains the token exactly once in the result", async () => {
    const h = setup()
    const result = await h.caller.kubernetes.getGardenKubeconfig({ project_id: "p-1", landscape: "qa" })

    const matches = result.kubeconfig.match(/tok-123/g)
    expect(matches).toHaveLength(1)
  })

  it("does not log the token", async () => {
    const h = setup()
    const logSpy = vi.spyOn(console, "log")
    const warnSpy = vi.spyOn(console, "warn")
    const errorSpy = vi.spyOn(console, "error")
    const debugSpy = vi.spyOn(console, "debug")

    await h.caller.kubernetes.getGardenKubeconfig({ project_id: "p-1", landscape: "qa" })

    const allCalls = [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls, ...debugSpy.mock.calls]

    for (const call of allCalls) {
      const serialized = JSON.stringify(call)
      expect(serialized).not.toContain("tok-123")
    }

    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    debugSpy.mockRestore()
  })

  it("returns NOT_FOUND for unavailable landscape", async () => {
    const h = setup()
    // Make the catalog lookup fail by removing the entry
    h.ctx.openstack!.getToken = () =>
      ({
        authToken: "tok-123",
        tokenData: {
          project: { id: "p-1", name: "test-project" },
          catalog: [],
          expires_at: "2026-12-31T23:59:59Z",
          issued_at: "2026-01-01T00:00:00Z",
          methods: ["password"],
          roles: [],
          user: { id: "u-1", name: "test-user", domain: { id: "default", name: "Default" }, password_expires_at: "" },
          system: { all: false },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock token data
      }) as any

    await expect(h.caller.kubernetes.getGardenKubeconfig({ project_id: "p-1", landscape: "qa" })).rejects.toMatchObject(
      {
        code: "NOT_FOUND",
        message: expect.stringContaining("not available"),
      }
    )
  })
})
