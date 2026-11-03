import { describe, it, expect, vi } from "vitest"
import { TRPCClientError } from "@trpc/client"
import { TrpcClient } from "@/client/trpcClient"
import { createImagesPromise } from "./apiHelpers"

const forbiddenError = (message: string) =>
  new TRPCClientError(message, {
    result: {
      error: {
        code: -32603,
        message,
        data: { code: "FORBIDDEN", httpStatus: 403 },
      },
    },
  } as never)

// Build a client stub where each list query resolves/rejects as configured.
const makeClient = (opts: {
  listImagesWithSearch?: () => Promise<unknown>
  listShared?: () => Promise<unknown>
}): TrpcClient =>
  ({
    compute: {
      listImagesWithSearch: { query: vi.fn(opts.listImagesWithSearch ?? (() => Promise.resolve({ images: [] }))) },
      listSharedImagesByMemberStatus: { query: vi.fn(opts.listShared ?? (() => Promise.resolve([]))) },
    },
  }) as unknown as TrpcClient

const call = (client: TrpcClient, filters = {}) => createImagesPromise(client, "p1", "name", "asc", "", filters)

describe("createImagesPromise", () => {
  it("flags FORBIDDEN from the main list as listForbidden", async () => {
    const client = makeClient({ listImagesWithSearch: () => Promise.reject(forbiddenError("Forbidden")) })

    const result = await call(client)

    expect(result.listForbidden).toBe(true)
    expect(result.images).toEqual([])
  })

  it("flags FORBIDDEN from the shared (member status) list as listForbidden", async () => {
    const client = makeClient({ listShared: () => Promise.reject(forbiddenError("Forbidden")) })

    const result = await call(client, { member_status: "accepted" })

    expect(result.listForbidden).toBe(true)
    expect(result.images).toEqual([])
  })

  it("does not flag a successful list as forbidden", async () => {
    const client = makeClient({ listImagesWithSearch: () => Promise.resolve({ images: [{ id: "i1" }] }) })

    const result = await call(client)

    expect(result.listForbidden).toBe(false)
    expect(result.listError).toBeUndefined()
    expect(result.images).toEqual([{ id: "i1" }])
  })

  it("rethrows non-FORBIDDEN errors", async () => {
    const boom = new Error("boom")
    const client = makeClient({ listImagesWithSearch: () => Promise.reject(boom) })

    await expect(call(client)).rejects.toBe(boom)
  })
})
