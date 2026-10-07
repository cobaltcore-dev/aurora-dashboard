import { describe, it, expect, vi, beforeEach } from "vitest"
import { invalidateCredentialQueries } from "./invalidateCredentialQueries"
import { trpcReact } from "@/client/trpcClient"

const projectId = "project-1"

const credentialsFetch = vi.fn()
const credentialsCancel = vi.fn()
const containersList = vi.fn()
const containersStatus = vi.fn()

const utils = {
  storage: {
    ceph: {
      ec2Credentials: { list: { fetch: credentialsFetch, cancel: credentialsCancel } },
      containers: {
        list: { invalidate: containersList },
        status: { invalidate: containersStatus },
      },
    },
  },
} as unknown as ReturnType<typeof trpcReact.useUtils>

const withKeys = (count: number) =>
  credentialsFetch.mockResolvedValue(Array.from({ length: count }, (_, i) => ({ id: `k${i}` })))

/** The unconditional refresh - every bucket listing, metadata and all. */
const refreshedEveryListing = () => containersList.mock.calls.some((call) => call.length === 0)

/** The narrow one: only listings that are currently showing an error. */
const refreshedErroredListings = () =>
  containersList.mock.calls.filter((call) => typeof call[1]?.predicate === "function").map((call) => call[1].predicate)

describe("invalidateCredentialQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("cancels a key-table request already in flight before reading the list", async () => {
    const order: string[] = []
    credentialsCancel.mockImplementation(async () => {
      order.push("cancel")
    })
    credentialsFetch.mockImplementation(async () => {
      order.push("fetch")
      return [{ id: "k0" }]
    })

    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // `fetch` joins a request that is already running instead of starting one, and that request
    // may predate the mutation this call reports on - `staleTime: 0` refuses a cached answer, not
    // a shared one. The `invalidate` this replaced cancelled by default.
    expect(order).toEqual(["cancel", "fetch"])
    expect(credentialsCancel).toHaveBeenCalledWith({ project_id: projectId })
    credentialsCancel.mockReset()
    credentialsFetch.mockReset()
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

  it("does not re-scan the bucket listing for a second key", async () => {
    withKeys(2)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // The page reads this one with `includeMetadata: true` - a ListObjectsV2 per bucket. A second
    // key changes no bucket, no object and no size.
    expect(refreshedEveryListing()).toBe(false)
  })

  it("refreshes the bucket listing when the deleted key was the last", async () => {
    withKeys(0)
    await invalidateCredentialQueries(utils, { projectId, mutation: "delete" })

    expect(containersList).toHaveBeenCalledTimes(1)
  })

  it("does not re-scan the bucket listing when a key remains after the delete", async () => {
    withKeys(1)
    await invalidateCredentialQueries(utils, { projectId, mutation: "delete" })

    expect(refreshedEveryListing()).toBe(false)
  })

  it("still refreshes a bucket listing that is showing an error", async () => {
    withKeys(2)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // "S3 Authentication Failed" is reached with a key already in Keystone, so creating a
    // replacement is 1 -> 2 and deleting the broken one is 2 -> 1 - neither a transition by the
    // count rule. Without this the page would sit on its cached error over a working key.
    const predicates = refreshedErroredListings()
    expect(predicates).toHaveLength(1)
    expect(predicates[0]({ state: { status: "error" } })).toBe(true)
    expect(predicates[0]({ state: { status: "success" } })).toBe(false)
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
