import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { z } from "zod"
import { SignalOpenstackApiError, SignalOpenstackError } from "@cobaltcore-dev/signal-openstack"
import type { AuroraPortalContext } from "../../context"
import { gardenerGet, gardenerRequest, gardenNamespace } from "./gardenerClient"

const url = "https://persephone-qa.example/"
const schema = z.object({ ok: z.boolean() })

type Endpoint = { id: string; interface: string; region: string; region_id?: string; url: string }

function setup(
  endpoints: Endpoint[] = [{ id: "e1", interface: "public", region: "qa-de-1", region_id: "qa-de-1", url }]
) {
  const controller = new AbortController()
  const get = vi.fn()
  const post = vi.fn()
  const put = vi.fn()
  const patch = vi.fn()
  const del = vi.fn()
  const getEndpoint = vi.fn((opts?: { interfaceName?: string }): string | null => {
    const wanted = opts?.interfaceName ?? "internal"
    return endpoints.find((e) => e.interface === wanted)?.url ?? null
  })
  const service = { get, post, put, patch, del, getEndpoint }
  const catalog = [{ type: "persephone-qa", name: "persephone", id: "s1", endpoints }]
  const session = {
    getToken: () => ({ authToken: "tok-123", tokenData: { catalog, project: { id: "p-1" } } }),
    service: vi.fn().mockReturnValue(service),
  }
  const ctx = {
    validateSession: () => true,
    openstack: session,
    signal: controller.signal,
  } as unknown as AuroraPortalContext
  const json = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
  return { ctx, get, post, put, patch, del, getEndpoint, session, controller, json }
}

describe("gardenNamespace", () => {
  it("builds the namespace from region and project ID", () => {
    const h = setup()
    expect(gardenNamespace(h.ctx, "qa-de-1")).toBe("garden-qa-de-1-p-1")
  })

  it("throws INTERNAL_SERVER_ERROR for an unsafe namespace", () => {
    const h = setup()
    h.session.getToken = () => ({
      authToken: "tok-123",
      tokenData: { catalog: [], project: { id: "Invalid_ID" } },
    })
    expect(() => gardenNamespace(h.ctx, "qa-de-1")).toThrow("Kubernetes namespace could not be determined.")
  })
})

describe("gardenerRequest", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock spy type
  let consoleErrorSpy: any

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it("sets Authorization and Content-Type for PATCH", async () => {
    const h = setup()
    h.patch.mockResolvedValue(h.json({ ok: true }))
    await gardenerRequest(h.ctx, "qa", {
      method: "PATCH",
      path: "apis/core.gardener.cloud/v1beta1/namespaces/test/shoots/my-cluster",
      body: { metadata: { annotations: { "gardener.cloud/operation": "reconcile" } } },
      contentType: "application/merge-patch+json",
      schema,
      operation: "reconcile",
    })
    const [, options] = h.session.service.mock.calls.at(-1)!
    expect(options.headers.Authorization).toBe("Bearer qa-de-1:tok-123")
    expect(options.headers["Content-Type"]).toBe("application/merge-patch+json")
    expect(h.patch).toHaveBeenCalled()
  })

  it("sets Content-Type for PUT", async () => {
    const h = setup()
    h.put.mockResolvedValue(h.json({ ok: true }))
    await gardenerRequest(h.ctx, "qa", {
      method: "PUT",
      path: "apis/core.gardener.cloud/v1beta1/namespaces/test/shoots/my-cluster",
      body: { apiVersion: "core.gardener.cloud/v1beta1", kind: "Shoot" },
      contentType: "application/json",
      schema,
      operation: "replace",
    })
    const [, options] = h.session.service.mock.calls.at(-1)!
    expect(options.headers["Content-Type"]).toBe("application/json")
    expect(h.put).toHaveBeenCalled()
  })

  it("throws INTERNAL_SERVER_ERROR for invalid JSON response", async () => {
    const h = setup()
    h.get.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Unexpected token")
      },
    })
    await expect(
      gardenerRequest(h.ctx, "qa", { method: "GET", path: "test", schema, operation: "test" })
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid Kubernetes service response.",
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith("[kubernetes] test: invalid JSON response")
  })

  it("throws NOT_FOUND when service lookup fails", async () => {
    const h = setup()
    h.session.service.mockImplementation(() => {
      throw new SignalOpenstackError("Service not found")
    })
    await expect(
      gardenerRequest(h.ctx, "qa", { method: "GET", path: "test", schema, operation: "test" })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Kubernetes landscape qa is not available for this project.",
    })
  })

  it("returns null for 404 when allowNotFound is true", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ kind: "Status", status: "Failure", code: 404, message: "not found" }))
    const result = await gardenerRequest(h.ctx, "qa", {
      method: "GET",
      path: "api/v1/namespaces/test/configmaps/missing",
      schema,
      operation: "getGettingStarted",
      allowNotFound: true,
    })
    expect(result).toBeNull()
  })

  it("throws NOT_FOUND for 404 when allowNotFound is false", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ kind: "Status", status: "Failure", code: 404, message: "not found" }))
    await expect(
      gardenerRequest(h.ctx, "qa", {
        method: "GET",
        path: "test",
        schema,
        operation: "test",
        allowNotFound: false,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("never includes token in error messages", async () => {
    const h = setup()
    h.get.mockRejectedValue(new SignalOpenstackApiError("Contains tok-123", 400))
    try {
      await gardenerRequest(h.ctx, "qa", { method: "GET", path: "test", schema, operation: "test" })
      expect.fail("Should have thrown")
    } catch (error) {
      expect((error as Error).message).not.toContain("tok-123")
    }
  })
})

describe("gardenerGet", () => {
  it("calls the landscape service with the region and Bearer header", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.json({ ok: true }))
    expect(await gardenerGet(h.ctx, "qa", "api/v1/x", schema)).toEqual({ ok: true })
    const [serviceName, options] = h.session.service.mock.calls.at(-1)!
    expect(serviceName).toBe("persephone-qa")
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
