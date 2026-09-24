/**
 * Pure helpers for attributing S3 object-version keys to their parent folder
 * during a single delimiter-less scan of a prefix, and for reasoning about
 * which folders that scan actually covered before hitting a page ceiling.
 *
 * No S3 client, no tRPC — these are plain functions so the attribution logic
 * and the lexicographic-coverage guarantee can be tested without mocks.
 */

/**
 * Returns the direct-child folder prefix that `key` belongs to under `prefix`,
 * or undefined for loose objects at the current level.
 *
 * "p/foo/"      -> "p/foo/"   (the folder marker itself)
 * "p/foo/a/b"   -> "p/foo/"
 * "p/foobar"    -> undefined
 */
export function folderPrefixOf(key: string, prefix: string): string | undefined {
  if (!key.startsWith(prefix)) return undefined
  const rest = key.slice(prefix.length)
  const i = rest.indexOf("/")
  return i === -1 ? undefined : prefix + rest.slice(0, i + 1)
}

/**
 * With S3's lexicographic key order, a folder is fully scanned iff the scan
 * finished (`stoppedAtKey === undefined`), or it ended at a key strictly
 * after the folder's whole range (`folderPrefix + "￿..."`), i.e. a key
 * that neither falls inside the folder nor sorts before it.
 */
export function isFolderCovered(folderPrefix: string, stoppedAtKey: string | undefined): boolean {
  return stoppedAtKey === undefined ? true : folderPrefix < stoppedAtKey && !stoppedAtKey.startsWith(folderPrefix)
}

/**
 * Fallback scan prefix for callers that pass `folders` without an explicit
 * `prefix`. Finds the longest common leading substring across all folders,
 * then truncates it to the last "/" (inclusive) so the result is itself a
 * valid prefix. Folders that don't share a parent collapse to "" (scan the
 * whole bucket) — callers should always pass `prefix` explicitly to avoid this.
 *
 * The result must be a *strict ancestor* of every folder, not merely a common
 * prefix. When the shallowest folder is itself the common prefix — always true
 * for a single folder, and for sets like ["a/b/", "a/b/c/"] — this function has
 * to climb one level, because `folderPrefixOf(key, prefix)` attributes a key to
 * a direct child of `prefix` and can therefore never attribute `prefix` itself.
 * Returning the folder unchanged made the whole scan report it as "no deleted
 * content, fully scanned": confidently wrong rather than merely unknown.
 */
export function longestCommonPrefix(folders: string[]): string {
  if (folders.length === 0) return ""

  let common = folders[0]
  for (let i = 1; i < folders.length && common.length > 0; i++) {
    const folder = folders[i]
    let j = 0
    while (j < common.length && j < folder.length && common[j] === folder[j]) j++
    common = common.slice(0, j)
  }

  // Drop the trailing "/" only when a folder *is* the common prefix, so the
  // `lastIndexOf` below lands one level up instead of on the folder's own
  // slash. Without the guard, ["p/foo/", "p/bar/"] would climb needlessly.
  if (common.endsWith("/") && folders.some((folder) => folder === common)) {
    common = common.slice(0, -1)
  }

  const lastSlash = common.lastIndexOf("/")
  return lastSlash === -1 ? "" : common.slice(0, lastSlash + 1)
}
