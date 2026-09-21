/**
 * Single source of truth for the storage provider ↔ storage-type noun mapping
 * (`swift` → `containers`, `ceph` → `buckets`). Every route/component that needs
 * to build or validate a `/storage/$provider/$storageType` URL should go through
 * this module instead of re-hardcoding the pairing.
 */

/**
 * The object-storage providers. The same spelling serves as the `$provider` URL
 * segment and as the OpenStack catalog service *name* the backend resolves by
 * (see `serviceCatalog.ts`), so one constant covers both uses.
 */
export const STORAGE_PROVIDER = {
  SWIFT: "swift",
  CEPH: "ceph",
} as const

/**
 * The `$storageType` URL segment noun each provider uses.
 *
 * Deliberately NOT the same vocabulary as the nav / `enabledServices` service keys
 * (`"containers"` / `"ceph-containers"`), which only happen to share the word
 * "containers" — Ceph's nav key is `"ceph-containers"`, never `"buckets"`. Don't
 * substitute one for the other.
 */
export const STORAGE_TYPE = {
  CONTAINERS: "containers",
  BUCKETS: "buckets",
} as const

export const STORAGE_TYPE_BY_PROVIDER = {
  [STORAGE_PROVIDER.SWIFT]: STORAGE_TYPE.CONTAINERS,
  [STORAGE_PROVIDER.CEPH]: STORAGE_TYPE.BUCKETS,
} as const

export type StorageProvider = keyof typeof STORAGE_TYPE_BY_PROVIDER
export type StorageType = (typeof STORAGE_TYPE_BY_PROVIDER)[StorageProvider]

/**
 * Narrows an unknown value (typically a raw `$provider` URL segment) to a known
 * `StorageProvider`. Uses `Object.hasOwn` rather than `in` — `"__proto__" in obj`
 * evaluates to `true` for any object, which would let `/storage/__proto__/...`
 * pass validation.
 */
export const isStorageProvider = (value: unknown): value is StorageProvider =>
  typeof value === "string" && Object.hasOwn(STORAGE_TYPE_BY_PROVIDER, value)

/** Returns `value` narrowed to a `StorageProvider`, or `fallback` if it isn't one. */
export const asStorageProvider = (value: unknown, fallback: StorageProvider): StorageProvider =>
  isStorageProvider(value) ? value : fallback

/** The canonical storage-type noun for a given provider. */
export const storageTypeFor = (provider: StorageProvider): StorageType => STORAGE_TYPE_BY_PROVIDER[provider]
