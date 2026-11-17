import { describe, it, expect, vi } from "vitest"
import { auroraRouter, createCallerFactory } from "../../trpc"
import type { AuroraPortalContext } from "../../context"
import { buildVolumeResourceRouter } from "./volumeRouter"
import { buildSnapshotResourceRouter } from "./snapshotRouter"
import { buildVolumeRouters } from "./index"
import { volumeSchema } from "../types/volume"
import { snapshotSchema } from "../types/snapshot"

const volumeId = "123e4567-e89b-12d3-a456-426614174000"
const snapshotId = "123e4567-e89b-12d3-a456-426614174001"
const endpoint = "https://cinder.example/v3/project-1"

function setup(allowed = true, admin = false) {
  const controller = new AbortController()
  const get = vi.fn()
  const service = { get, getEndpoint: () => endpoint }
  const session = {
    getToken: () => ({
      tokenData: {
        project: { id: "project-1" },
        catalog: [{ type: "volumev3", name: "cinderv3" }],
        roles: [{ id: "role-1", name: admin ? "admin" : "reader" }],
      },
    }),
    service: vi.fn(() => service),
  }
  const ctx = {
    validateSession: () => true,
    rescopeSession: vi.fn(async () => session),
    openstack: session,
    signal: controller.signal,
  } as unknown as AuroraPortalContext
  const check = vi.fn(() => allowed)
  const router = auroraRouter({
    volume: auroraRouter({ ...buildVolumeResourceRouter(check), ...buildSnapshotResourceRouter(check) }),
  })
  const caller = createCallerFactory(router)(ctx)
  const response = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
  return { get, session, ctx, caller, response, check, controller }
}

describe("Cinder read-only BFF", () => {
  it("propagates disconnection cancellation alongside the request deadline", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.response({ volumes: [] }))
    await h.caller.volume.listVolumes({ project_id: "project-1" })
    const signal = h.get.mock.calls[0][1].signal as AbortSignal
    expect(signal.aborted).toBe(false)
    h.controller.abort()
    expect(signal.aborted).toBe(true)
  })

  it("rejects a legacy v2 catalog endpoint", async () => {
    const h = setup()
    h.session.service.mockReturnValueOnce({ get: h.get, getEndpoint: () => "https://cinder.example/v2/project-1" })
    await expect(h.caller.volume.listVolumes({ project_id: "project-1" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(h.get).not.toHaveBeenCalled()
  })

  it("fails the whole list if a later page fails rather than silently returning partial data", async () => {
    const h = setup()
    h.get.mockResolvedValueOnce(
      h.response({
        volumes: [{ id: volumeId }],
        volumes_links: [{ rel: "next", href: `${endpoint}/volumes/detail?marker=${volumeId}` }],
      })
    )
    h.get.mockResolvedValueOnce({ ok: false, status: 503 })
    await expect(h.caller.volume.listVolumes({ project_id: "project-1" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    })
  })

  it("permits verified same-project admin show requests", async () => {
    const h = setup(true, true)
    h.get.mockResolvedValueOnce(h.response({ volume: { id: volumeId, "os-vol-tenant-attr:tenant_id": "project-1" } }))
    h.get.mockResolvedValueOnce(
      h.response({ snapshot: { id: snapshotId, "os-extended-snapshot-attributes:project_id": "project-1" } })
    )
    expect(await h.caller.volume.getVolumeById({ project_id: "project-1", volumeId })).toMatchObject({ id: volumeId })
    expect(await h.caller.volume.getSnapshotById({ project_id: "project-1", snapshotId })).toMatchObject({
      id: snapshotId,
    })
  })

  it("reads a complete volume list with relative endpoint paths and no per-row lookup", async () => {
    const h = setup()
    h.get.mockResolvedValueOnce(
      h.response({
        volumes: [{ id: volumeId, name: "first", bootable: "false" }],
        volumes_links: [{ rel: "next", href: `${endpoint}/volumes/detail?marker=${volumeId}` }],
      })
    )
    h.get.mockResolvedValueOnce(h.response({ volumes: [{ id: "second" }] }))
    const result = await h.caller.volume.listVolumes({ project_id: "project-1" })
    expect(result.map((volume) => volume.id)).toEqual([volumeId, "second"])
    expect(result[0].bootable).toBe(false)
    expect(h.get).toHaveBeenCalledTimes(2)
    expect(h.get).toHaveBeenNthCalledWith(
      2,
      "volumes/detail",
      expect.objectContaining({
        queryParams: { marker: volumeId },
        headers: { "OpenStack-API-Version": "volume 3.0" },
        signal: expect.any(AbortSignal),
      })
    )
    expect(h.ctx.rescopeSession).toHaveBeenCalledWith({ projectId: "project-1" })
  })

  it("keeps the volume filter across snapshot pages and excludes unrelated results", async () => {
    const h = setup()
    h.get.mockResolvedValueOnce(
      h.response({
        snapshots: [{ id: snapshotId, volume_id: volumeId }],
        snapshots_links: [
          { rel: "next", href: `${endpoint}/snapshots/detail?volume_id=${volumeId}&marker=${snapshotId}` },
        ],
      })
    )
    h.get.mockResolvedValueOnce(
      h.response({
        snapshots: [
          { id: "other", volume_id: "other-volume" },
          { id: "last", volume_id: volumeId },
        ],
      })
    )
    const result = await h.caller.volume.listSnapshots({ project_id: "project-1", volumeId })
    expect(result.map((snapshot) => snapshot.id)).toEqual([snapshotId, "last"])
    expect(h.get).toHaveBeenNthCalledWith(
      2,
      "snapshots/detail",
      expect.objectContaining({ queryParams: { volume_id: volumeId, marker: snapshotId } })
    )
  })

  it.each([
    "https://attacker.example/volumes/detail?marker=next",
    `${endpoint}/snapshots/detail?marker=next`,
    `${endpoint}/volumes/detail?marker=next&all_tenants=1`,
    `${endpoint}/volumes/detail`,
  ])("rejects unsafe or non-advancing pagination: %s", async (href) => {
    const h = setup()
    h.get.mockResolvedValue(h.response({ volumes: [{ id: volumeId }], volumes_links: [{ rel: "next", href }] }))
    await expect(h.caller.volume.listVolumes({ project_id: "project-1" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    })
    expect(h.get).toHaveBeenCalledTimes(1)
  })

  it("rejects repeated markers instead of returning an incomplete list", async () => {
    const h = setup()
    h.get.mockResolvedValue(
      h.response({
        volumes: [{ id: volumeId }],
        volumes_links: [{ rel: "next", href: `${endpoint}/volumes/detail?marker=${volumeId}` }],
      })
    )
    await expect(h.caller.volume.listVolumes({ project_id: "project-1" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    })
    expect(h.get).toHaveBeenCalledTimes(2)
  })

  it("uses show endpoints for direct volume and snapshot links", async () => {
    const h = setup()
    h.get.mockResolvedValueOnce(h.response({ volume: { id: volumeId } }))
    h.get.mockResolvedValueOnce(h.response({ snapshot: { id: snapshotId } }))
    await h.caller.volume.getVolumeById({ project_id: "project-1", volumeId })
    await h.caller.volume.getSnapshotById({ project_id: "project-1", snapshotId })
    expect(h.get.mock.calls.map(([url]) => url)).toEqual([`volumes/${volumeId}`, `snapshots/${snapshotId}`])
  })

  it("denies before requesting Cinder when Aurora permissions deny", async () => {
    const h = setup(false)
    await expect(h.caller.volume.listVolumes({ project_id: "project-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(h.caller.volume.listSnapshots({ project_id: "project-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    expect(h.get).not.toHaveBeenCalled()
  })

  it.each([400, 401, 403, 404, 500])("maps HTTP %s without leaking backend bodies", async (status) => {
    const h = setup()
    h.get.mockResolvedValue({ ok: false, status, json: async () => ({ secret: "private" }) })
    const codes: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      500: "INTERNAL_SERVER_ERROR",
    }
    await expect(h.caller.volume.listVolumes({ project_id: "project-1" })).rejects.toMatchObject({
      code: codes[status],
      message: "Could not read block storage.",
    })
  })

  it("preserves unknown statuses, nullable fields, and actual attachment IDs", () => {
    const result = volumeSchema.parse({
      id: volumeId,
      name: null,
      status: "future-status",
      bootable: "false",
      encrypted: true,
      attachments: [{ id: volumeId, attachment_id: "attachment-1", server_id: null }],
      size: "invalid",
    })
    expect(result).toMatchObject({
      name: null,
      status: "future-status",
      bootable: false,
      encrypted: true,
      size: undefined,
      attachments: [{ attachment_id: "attachment-1", server_id: null }],
    })
    expect(result.attachments?.[0]).not.toHaveProperty("id")
    expect(snapshotSchema.parse({ id: snapshotId, metadata: null }).metadata).toBeNull()
  })

  it("does not turn unknown boolean values into false", () => {
    expect(volumeSchema.parse({ id: volumeId, bootable: "unknown" }).bootable).toBeUndefined()
  })

  it("rejects a malformed collection rather than claiming the project is empty", async () => {
    const h = setup()
    h.get.mockResolvedValue(h.response({ volumes: [{ name: "missing id" }] }))
    await expect(h.caller.volume.listVolumes({ project_id: "project-1" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    })
  })

  it("keeps admin detail reads within the active project", async () => {
    const h = setup(true, true)
    h.get.mockResolvedValueOnce(
      h.response({ volume: { id: volumeId, "os-vol-tenant-attr:tenant_id": "another-project" } })
    )
    h.get.mockResolvedValueOnce(h.response({ snapshot: { id: snapshotId } }))
    await expect(h.caller.volume.getVolumeById({ project_id: "project-1", volumeId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    await expect(h.caller.volume.getSnapshotById({ project_id: "project-1", snapshotId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("rejects unsafe resource IDs before calling Cinder", async () => {
    const h = setup()
    await expect(
      h.caller.volume.getVolumeById({ project_id: "project-1", volumeId: "../other" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    expect(h.get).not.toHaveBeenCalled()
  })

  it("allows startup without a Cinder policy file and fails closed on permission checks", async () => {
    const h = setup()
    const caller = createCallerFactory(auroraRouter(buildVolumeRouters("/nonexistent/aurora-policy-directory")))(h.ctx)
    expect(await caller.volume.canUser({ project_id: "project-1", permission: "volume:volumes:list" })).toEqual([false])
    await expect(caller.volume.listVolumes({ project_id: "project-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})
