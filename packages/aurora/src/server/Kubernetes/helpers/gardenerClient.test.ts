import { describe, it, expect, vi } from "vitest"
import { z } from "zod"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import type { AuroraPortalContext } from "../../context"
import { gardenerGet } from "./gardenerClient"

const url = "https://persephone-qa.example/"
const schema = z.object({ ok: z.boolean() })

type Endpoint = { id: string; interface: string; region: string; region_id?: string; url: string }

function setup(
  endpoints: Endpoint[] = [{ id: "e1", interface: "public", region: "qa-de-1", region_id: "qa-de-1", url }]
) {
  const controller = new AbortController()
  const get = vi.fn()
  const getEndpoint = vi.fn((opts?: { interfaceName?: string }): string | null => {
    const wanted = opts?.interfaceName ?? "internal"
    return endpoints.find((e) => e.interface === wanted)?.url ?? null
  })
  const service = { get, getEndpoint }
  const catalog = [{ type: "persephone-qa", name: "persephone", id: "s1", endpoints }]
  const session = {
    getToken: () => ({ authToken: "tok-123", tokenData: { catalog } }),
    service: vi.fn().mockReturnValue(service),
  }
  const ctx = {
    validateSession: () => true,
    openstack: session,
    signal: controller.signal,
  } as unknown as AuroraPortalContext
  const json = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
  return { ctx, get, getEndpoint, session, controller, json }
}

describe("gardenerGet", () => {
  it("calls the landscape service with the region and Bearer header", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ ok: true }))
    expect(await gardenerGet(h.ctx, "qa", "api/v1/x", schema)).toEqual({ ok: true })
    const [name, options] = h.session.service.mock.calls.at(-1)!
    expect(name).toBe("persephone-qa")
    expect(options.region).toBe("qa-de-1")
    expect(options.headers.Authorization).toBe("Bearer qa-de-1:tok-123")
    expect(options.headers.Accept).toBe("application/json")
    expect(h.get.mock.calls[0][0]).toBe("api/v1/x")
  })

  it("uses region as the prefix when region_id is absent", async () => {
    const h = setup([{ id: "e1", interface: "public", region: "qa-de-2", url }])
    h.get.mockResolvedValue(h.json({ ok: true }))
    await gardenerGet(h.ctx, "qa", "p", schema)
    expect(h.session.service.mock.calls.at(-1)![1].headers.Authorization).toBe("Bearer qa-de-2:tok-123")
  })

  it("falls back to the public interface when the default has no endpoint", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ ok: true }))
    await gardenerGet(h.ctx, "qa", "p", schema)
    expect(h.getEndpoint).toHaveBeenCalledWith({ interfaceName: "public" })
    expect(h.session.service.mock.calls.at(-1)![1].interfaceName).toBe("public")
  })

  it("throws NOT_FOUND without a request when the landscape is not in the catalog", async () => {
    const h = setup()
    await expect(gardenerGet(h.ctx, "prod", "p", schema)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(h.get).not.toHaveBeenCalled()
  })

  it("throws UNAUTHORIZED without a session", async () => {
    const h = setup()
    h.ctx.openstack = undefined
    await expect(gardenerGet(h.ctx, "qa", "p", schema)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("maps a rejected 403 to FORBIDDEN", async () => {
    const h = setup()
    h.get.mockRejectedValue(new SignalOpenstackApiError("forbidden", 403))
    await expect(gardenerGet(h.ctx, "qa", "p", schema)).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("maps a 200 Status Failure by its code", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ kind: "Status", status: "Failure", code: 403, message: "no" }))
    await expect(gardenerGet(h.ctx, "qa", "p", schema)).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("maps a 200 Elektra error envelope by its code", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ error: "API Error", code: 404, message: "x" }))
    await expect(gardenerGet(h.ctx, "qa", "p", schema)).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws INTERNAL_SERVER_ERROR on a schema mismatch", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ ok: "yes" }))
    await expect(gardenerGet(h.ctx, "qa", "p", schema)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid Kubernetes service response.",
    })
  })

  it("aborts the request signal when ctx.signal aborts", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ ok: true }))
    await gardenerGet(h.ctx, "qa", "p", schema)
    const signal: AbortSignal = h.get.mock.calls[0][1].signal
    expect(signal.aborted).toBe(false)
    h.controller.abort()
    expect(signal.aborted).toBe(true)
  })
})
