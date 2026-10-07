import { trpcReact } from "@/client/trpcClient"

type CephUtils = ReturnType<typeof trpcReact.useUtils>

interface InvalidateCredentialQueriesOptions {
  /** The project whose credential list this mutation changed. */
  projectId: string
  /** Which way the count moved. */
  mutation: "create" | "delete"
}

/**
 * Refresh what an EC2 credential mutation actually changed.
 *
 * Third of these lists, after `invalidateBucketQueries` and `invalidateVersioningStatusQueries`,
 * and here for the same reason the first one gives: the set was spelled out literally in both
 * `ManageCredentialsModal` mutation handlers, so adding or removing a query meant remembering
 * both. It also hid the finding below, because "invalidate these three" reads the same at both
 * call sites whether or not the three are right.
 *
 * Async, and the order matters: the credential list is refreshed first and the decision about the
 * bucket listing is taken from the *refreshed* count. Reading the caller's copy instead would be
 * wrong in exactly the flow this screen is for — rotate a key by deleting the old one and
 * creating a new one — because the second mutation can settle before the first one's refetch has
 * landed, leaving the component holding a list that still shows the deleted key.
 *
 * Returns the combined promise for callers that need to await the refetch; the rest may ignore
 * it, as the tRPC invalidate calls it wraps already were.
 */
export async function invalidateCredentialQueries(
  utils: CephUtils,
  { projectId, mutation }: InvalidateCredentialQueriesOptions
) {
  // The key table itself. Always: every mutation here adds or removes a row.
  //
  // Refetched rather than invalidated, and the count below is read out of what came back instead
  // of out of the cache afterwards. The two are not the same thing when the refresh fails: the
  // cache then still holds the pre-mutation list, which reads as a perfectly good count and sends
  // the decision below the wrong way — a first key whose refresh failed looks like no key at all,
  // and the page behind the modal stays on "Setup Required" over a project that now has one.
  // `fetch` either answers with the new list or throws.
  //
  // Cancelled first, because `fetch` on its own would join a request that is already running and
  // answer with *its* result - which may have been sent before the mutation this call reports on.
  // `staleTime: 0` below does not cover that: it refuses a cached answer, not a shared one. The
  // `invalidate` that used to stand here got this for free, since `refetchQueries` defaults to
  // `cancelRefetch: true`; `fetch` has no such option, so the cancel is what keeps the switch to
  // it an improvement rather than a trade.
  await utils.storage.ceph.ec2Credentials.list.cancel({ project_id: projectId })

  // `staleTime: 0` because the client's default is 60s (App.tsx) and this list was almost
  // certainly read inside that window: without it, this would hand back the pre-mutation list
  // without asking the server at all. `retry: false` matches how `ManageCredentialsModal` reads
  // the same query, and keeps a failure from holding this up for three backoffs.
  let count: number | undefined
  try {
    const credentials = await utils.storage.ceph.ec2Credentials.list.fetch(
      { project_id: projectId },
      { staleTime: 0, retry: false }
    )
    count = credentials.length
  } catch {
    count = undefined
  }

  // After a create, exactly one key means it was the project's first. After a delete, none means
  // the one just removed was the last. Both are read from the post-refetch cache, so neither
  // depends on what the caller could see when it started.
  //
  // No count at all - the refresh above failed - refreshes the listing rather than skipping it: a
  // needless refetch costs time, a missed one leaves the page behind the modal showing "Setup
  // Required" over a project that now has a key, until a manual reload.
  const hasCredentialsChanged = count === undefined || (mutation === "create" ? count === 1 : count === 0)

  if (hasCredentialsChanged) {
    // The buckets page behind the modal. Conditional, unlike anything in the sibling helpers,
    // because this query is the expensive one on the whole screen: the page reads it with
    // `includeMetadata: true` (Buckets/index.tsx), the router's documented slow path, which issues
    // a `ListObjectsV2Command` per bucket in batches of five to compute per-bucket
    // count/bytes/last-modified.
    //
    // A second key changes nothing it reports. Buckets, objects and sizes are properties of the
    // project, not of which key signs for them, and all of a user's keys map to one RGW identity.
    // The only transition that matters is 0 <-> 1, when the procedure behind this query flips
    // between throwing `NO_CEPH_CREDENTIALS` and returning a listing.
    await utils.storage.ceph.containers.list.invalidate()
  } else {
    // The count above says the page behind the modal is unaffected. That holds for a page showing
    // a listing; it does not hold for one showing an error, and this screen has an entry point
    // that is reached from exactly that state: "S3 Authentication Failed" (Buckets/index.tsx),
    // shown when Keystone still has the key but RGW rejects it. Creating a replacement takes the
    // count 1 -> 2 and deleting the broken key takes it 2 -> 1, so neither is a transition by the
    // rule above - and the page would sit on its cached error until a manual reload.
    //
    // Only the errored ones, so the optimisation above survives intact: a page that is showing
    // buckets is not re-scanned, and one that is showing a failure has nothing worth keeping.
    await utils.storage.ceph.containers.list.invalidate(undefined, {
      predicate: (query) => query.state.status === "error",
    })
  }

  // Deliberately absent: `containers.status`. Its only reader is the modal that calls this
  // helper, and it reads only `endpoint` and `region` - deployment constants, which is why that
  // query is held at `staleTime: Infinity`. Invalidating it refetches active observers whatever
  // their staleTime, so the two calls that used to be here undid that on every mutation, and each
  // refetch cost a Keystone `GET /v3/credentials` of its own: `status` runs on `cephProcedure`,
  // whose middleware resolves a credential before the handler is reached.
  //
  // Its third field, `hasCredentials`, is the one thing here that a credential mutation does
  // change - and nothing on the client reads it. If something starts to, it belongs here, next to
  // the listing above and under the same condition.
}
