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
  // The key table itself. Always: every mutation here adds or removes a row. Awaited, because
  // the count below is read out of what it puts in the cache.
  await utils.storage.ceph.ec2Credentials.list.invalidate()

  const count = utils.storage.ceph.ec2Credentials.list.getData({ project_id: projectId })?.length

  // After a create, exactly one key means it was the project's first. After a delete, none means
  // the one just removed was the last. Both are read from the post-refetch cache, so neither
  // depends on what the caller could see when it started.
  //
  // No count at all - the refetch failed and nothing was cached before it - refreshes the listing
  // rather than skipping it: a needless refetch costs time, a missed one leaves the page behind
  // the modal showing "Setup Required" over a project that now has a key, until a manual reload.
  const hasCredentialsChanged = count === undefined || (mutation === "create" ? count === 1 : count === 0)

  if (!hasCredentialsChanged) return

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
