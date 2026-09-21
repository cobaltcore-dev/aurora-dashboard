import { describe, it, expect, vi } from "vitest"
import { isNotFound } from "@tanstack/react-router"
import { TRPCClientError } from "@trpc/client"
import type { TrpcClient } from "@/client/trpcClient"
import { CONTAINER_NOT_FOUND, requireContainerExists } from "./containerExistence"

/**
 * Builds the error the vanilla tRPC client actually throws, rather than a hand-rolled
 * object: the probe decides what to do by reading `data.code` off it, so a stub that
 * merely looks similar would test nothing.
 */
const trpcError = (code: string) =>
  TRPCClientError.from({
    error: {
      message: `mock ${code}`,
      code: -32004,
      data: { code, httpStatus: 404, path: "storage.probe" },
    },
  })

const makeClient = (probe: () => Promise<unknown>) => {
  const swiftQuery = vi.fn(probe)
  const cephQuery = vi.fn(probe)
  const client = {
    storage: {
      swift: { getContainerMetadata: { query: swiftQuery } },
      ceph: { containers: { head: { query: cephQuery } } },
    },
  } as unknown as TrpcClient

  return { client, swiftQuery, cephQuery }
}

const swiftParams = { projectId: "proj-1", provider: "swift", containerName: "my-container" } as const
const cephParams = { projectId: "proj-1", provider: "ceph", containerName: "my-bucket" } as const

/** Asserts the promise rejects with a TanStack `notFound()` and returns it. */
async function expectNotFoundAsync(promise: Promise<unknown>): Promise<{ data?: { reason?: string } }> {
  try {
    await promise
  } catch (caught) {
    expect(isNotFound(caught)).toBe(true)
    return caught as { data?: { reason?: string } }
  }
  throw new Error("Expected requireContainerExists to throw a notFound()")
}

describe("requireContainerExists", () => {
  describe("the probe it sends", () => {
    it("asks Swift for the container metadata (one HEAD)", async () => {
      const { client, swiftQuery, cephQuery } = makeClient(async () => ({ objectCount: 0, bytesUsed: 0 }))

      await requireContainerExists(client, swiftParams)

      expect(swiftQuery).toHaveBeenCalledWith({ project_id: "proj-1", container: "my-container" })
      expect(cephQuery).not.toHaveBeenCalled()
    })

    it("asks Ceph for the bucket head (one HeadBucket, not a bucket listing)", async () => {
      const { client, swiftQuery, cephQuery } = makeClient(async () => ({ exists: true }))

      await requireContainerExists(client, cephParams)

      expect(cephQuery).toHaveBeenCalledWith({ project_id: "proj-1", bucketName: "my-bucket" })
      expect(swiftQuery).not.toHaveBeenCalled()
    })

    it("sends exactly one request per navigation", async () => {
      const { client, swiftQuery } = makeClient(async () => ({}))

      await requireContainerExists(client, swiftParams)

      expect(swiftQuery).toHaveBeenCalledTimes(1)
    })
  })

  describe("NOT_FOUND — the container isn't there", () => {
    it("throws notFound carrying the container reason for Swift", async () => {
      const { client } = makeClient(async () => {
        throw trpcError("NOT_FOUND")
      })

      const caught = await expectNotFoundAsync(requireContainerExists(client, swiftParams))
      expect(caught.data).toEqual({ reason: CONTAINER_NOT_FOUND })
    })

    it("throws notFound carrying the container reason for Ceph", async () => {
      const { client } = makeClient(async () => {
        throw trpcError("NOT_FOUND")
      })

      const caught = await expectNotFoundAsync(requireContainerExists(client, cephParams))
      expect(caught.data).toEqual({ reason: CONTAINER_NOT_FOUND })
    })
  })

  describe("everything that is not a NOT_FOUND answer", () => {
    // The point of these: a 404 page is a dead end. Told "no credentials", the user can act
    // on it — CredentialPrompt is rendered further down the page — but only if the page
    // gets to render at all.
    it("lets FORBIDDEN through (NO_CEPH_CREDENTIALS keeps the credential prompt reachable)", async () => {
      const { client } = makeClient(async () => {
        throw trpcError("FORBIDDEN")
      })

      await expect(requireContainerExists(client, cephParams)).resolves.toMatchObject({ containerInfo: undefined })
    })

    it("lets a server error through so the page reports it itself", async () => {
      const { client } = makeClient(async () => {
        throw trpcError("INTERNAL_SERVER_ERROR")
      })

      await expect(requireContainerExists(client, swiftParams)).resolves.toMatchObject({ containerInfo: undefined })
    })

    it("rethrows an error that never reached the server (a bug here must not read as a 404)", async () => {
      const { client } = makeClient(async () => {
        throw new TypeError("client.storage.swift.nope is undefined")
      })

      await expect(requireContainerExists(client, swiftParams)).rejects.toThrow(TypeError)
    })
  })

  // The Swift probe and ContainerHeader's summary query are the same HEAD, so the answer is
  // handed on as loader data instead of being thrown away and asked for again.
  describe("what it hands back", () => {
    it("returns Swift's container summary along with the moment it arrived", async () => {
      const summary = { objectCount: 3, bytesUsed: 1024 }
      const { client } = makeClient(async () => summary)
      const before = Date.now()

      const probe = await requireContainerExists(client, swiftParams)

      expect(probe.containerInfo).toEqual(summary)
      expect(probe.fetchedAt).toBeGreaterThanOrEqual(before)
    })

    it("returns nothing to reuse for Ceph — HeadBucket has no body", async () => {
      const { client } = makeClient(async () => ({ exists: true }))

      const probe = await requireContainerExists(client, cephParams)

      expect(probe.containerInfo).toBeUndefined()
    })
  })
})
