import { describe, it, expect, vi, beforeEach } from "vitest"
import { invalidateCredentialQueries } from "./invalidateCredentialQueries"
import { trpcReact } from "@/client/trpcClient"

const projectId = "project-1"

const credentialsFetch = vi.fn()
const containersList = vi.fn()
const containersStatus = vi.fn()

const utils = {
  storage: {
    ceph: {
      ec2Credentials: { list: { fetch: credentialsFetch } },
      containers: {
        list: { invalidate: containersList },
        status: { invalidate: containersStatus },
      },
    },
  },
} as unknown as ReturnType<typeof trpcReact.useUtils>

const withKeys = (count: number) =>
  credentialsFetch.mockResolvedValue(Array.from({ length: count }, (_, i) => ({ id: `k${i}` })))

describe("invalidateCredentialQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("refreshes the key table on any mutation", async () => {
    withKeys(2)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    expect(credentialsFetch).toHaveBeenCalledTimes(1)
  })

  it("decides from the refreshed list, not from the cache", async () => {
    const order: string[] = []
    credentialsFetch.mockImplementation(async () => {
      order.push("fetch")
      return [{ id: "k0" }]
    })
    containersList.mockImplementation(async () => {
      order.push("containers")
    })

    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // The whole point: deciding from the caller's copy is wrong during a rotate, when the second
    // mutation can settle before the first one's refetch lands.
    expect(order).toEqual(["fetch", "containers"])
    credentialsFetch.mockReset()
    containersList.mockReset()
  })

  it("asks the server rather than accepting a list that is merely fresh", async () => {
    withKeys(1)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // The client's default staleTime is 60s, and this list was read well inside it: without
    // `staleTime: 0` the refresh would answer out of the cache with the pre-mutation list.
    expect(credentialsFetch).toHaveBeenCalledWith({ project_id: projectId }, { staleTime: 0, retry: false })
  })

  it("refreshes the bucket listing when the created key is the project's first", async () => {
    withKeys(1)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // 0 -> 1 is when `containers.list` stops throwing NO_CEPH_CREDENTIALS behind the modal.
    expect(containersList).toHaveBeenCalledTimes(1)
  })

  it("leaves the bucket listing alone for a second key", async () => {
    withKeys(2)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // The page reads this one with `includeMetadata: true` - a ListObjectsV2 per bucket. A second
    // key changes no bucket, no object and no size.
    expect(containersList).not.toHaveBeenCalled()
  })

  it("refreshes the bucket listing when the deleted key was the last", async () => {
    withKeys(0)
    await invalidateCredentialQueries(utils, { projectId, mutation: "delete" })

    expect(containersList).toHaveBeenCalledTimes(1)
  })

  it("leaves the bucket listing alone when a key remains after the delete", async () => {
    withKeys(1)
    await invalidateCredentialQueries(utils, { projectId, mutation: "delete" })

    expect(containersList).not.toHaveBeenCalled()
  })

  it("refreshes the bucket listing when the key table could not be refreshed", async () => {
    credentialsFetch.mockRejectedValue(new Error("network"))
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // The case a cache read gets wrong: the old list is still there and still counts, so a first
    // key whose refresh failed would read as no key at all and strand the page on "Setup
    // Required". A needless refresh costs time; a missed one costs a manual reload.
    expect(containersList).toHaveBeenCalledTimes(1)
  })

  it("does not throw when the key table could not be refreshed", async () => {
    credentialsFetch.mockRejectedValue(new Error("network"))

    // Called from mutation callbacks that do not await it - an unhandled rejection here would
    // surface as a console error with no owner.
    await expect(invalidateCredentialQueries(utils, { projectId, mutation: "delete" })).resolves.toBeUndefined()
  })

  it("never refreshes containers.status", async () => {
    withKeys(1)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // Its only reader takes endpoint/region from it, holds them at `staleTime: Infinity`, and
    // never reads `hasCredentials`. Invalidating refetches regardless of staleTime, and the
    // refetch costs a Keystone credentials lookup in `cephProcedure`'s middleware.
    expect(containersStatus).not.toHaveBeenCalled()
  })
})
