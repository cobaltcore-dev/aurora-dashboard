/**
 * Maximum number of keys returned per S3 ListObjects request.
 *
 * This is the AWS S3 maximum. We use this value as a performance trade-off:
 * - Fast response times for list operations
 * - Bucket metadata (count, size) are estimates for buckets > 1000 objects
 *
 * See: https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
 */
export const S3_MAX_KEYS_PER_REQUEST = 1000

/**
 * S3 SigV4 pre-signed URLs are valid for at most 7 days (604800 seconds); the
 * signer rejects anything larger. Caps `expiresIn` in the presigned-URL input
 * schema and rejects over-range custom durations in the UI before they reach
 * the BFF.
 */
export const S3_PRESIGN_MAX_EXPIRY_SECONDS = 604800

/**
 * Hard ceiling on pages for the version-scan loops in
 * `versioningRouter.checkDeletedContent` and `containerRouter.getState`.
 * 20 × `S3_MAX_KEYS_PER_REQUEST` = 20 000 versions per request. Reaching it is
 * reported as `isPartialScan`, never as a guessed value.
 */
export const S3_MAX_SCAN_PAGES = 20

/**
 * Connect timeout for the shared Ceph S3 client. Applies to every Ceph request; see
 * `clients/s3Client.ts` for what it does and does not bound, and for why `requestTimeout`
 * and `maxAttempts` are deliberately left at their SDK defaults.
 */
export const S3_CONNECTION_TIMEOUT_MS = 5000

/**
 * Ceiling on how many version records `objects.deleteNonCurrentVersions` carries over from one
 * page to the next for a single key — not a ceiling on how many it ever holds at once.
 *
 * The mutation must see a whole key group before deciding anything, because `IsLatest` is
 * computed per listing request - so a key that spans pages is buffered until it ends. A key
 * rewritten hundreds of thousands of times (a CI artifact, a rolling log) would otherwise
 * accumulate one entry per version in the BFF's heap, in a shared process, on behalf of one
 * tenant. The check that enforces this limit runs only on the *carry* (the group merged from
 * previous pages, before the current page's records are added to it) — a group that finishes
 * within a page is processed regardless of its size, because by the time any check could run,
 * the whole page is already parsed and on the heap; discarding a fully-read group wouldn't lower
 * the peak, it would just turn a large-but-finite key into a key that can never be cleaned up
 * (every re-run would re-hit the same limit and return `TooManyVersions` forever) — exactly the
 * worst outcome for the CI-artifact/rolling-log profile this constant exists to protect. So the
 * real, reachable peak for one key is this limit plus one page's worth of records
 * (`S3_MAX_BUFFERED_VERSIONS_PER_KEY + S3_MAX_KEYS_PER_REQUEST` = 21 000), and that peak is a
 * constant — it does not grow with the bucket's size or with how many pages the scan takes.
 *
 * Spelled out rather than derived from `S3_MAX_SCAN_PAGES * S3_MAX_KEYS_PER_REQUEST`, which it
 * happens to equal: that ceiling belongs to the bounded scans in `containers.getState` and
 * `versioning.checkDeletedContent`, and `deleteNonCurrentVersions` has no page ceiling at all —
 * it pages to the end of the bucket. Deriving one from the other coupled this heap bound to an
 * unrelated policy: lowering the scan ceiling to make those two queries cheaper would silently
 * shrink this buffer along with it and start abandoning keys that fit today.
 */
export const S3_MAX_BUFFERED_VERSIONS_PER_KEY = 20_000

/**
 * How many individual per-key failures a bulk delete reports back. The count stays exact; only
 * the itemised list is capped, since the UI renders a sample and no caller can act on 10 000
 * individual error rows.
 */
export const MAX_REPORTED_DELETE_ERRORS = 100
