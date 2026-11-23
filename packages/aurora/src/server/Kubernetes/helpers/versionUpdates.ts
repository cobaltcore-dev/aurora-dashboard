/**
 * Version update calculation, ported from elektra/plugins/kubernetes_ng/lib/kubernetes/version_helpers.rb
 */

export type SemVer = { major: number; minor: number; patch: number }

export function parseSemver(version: string): SemVer | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version)
  if (!match) return null
  return { major: parseInt(match[1], 10), minor: parseInt(match[2], 10), patch: parseInt(match[3], 10) }
}

export function semverGt(a: SemVer, b: SemVer): boolean {
  if (a.major !== b.major) return a.major > b.major
  if (a.minor !== b.minor) return a.minor > b.minor
  return a.patch > b.patch
}

export function semverDiff(a: SemVer, b: SemVer): "major" | "minor" | "patch" {
  if (a.major !== b.major) return "major"
  if (a.minor !== b.minor) return "minor"
  return "patch"
}

export function sortVersions(versions: string[]): string[] {
  const parsed = versions.map((v) => ({ v, semver: parseSemver(v) })).filter((x) => x.semver !== null)
  parsed.sort((a, b) => {
    if (semverGt(a.semver!, b.semver!)) return -1
    if (semverGt(b.semver!, a.semver!)) return 1
    return 0
  })
  return parsed.map((x) => x.v)
}

export function calculateAvailableUpdates(
  current: string | undefined,
  available: string[] | undefined
): { patch: string[]; minor: string[]; major: string[] } | null {
  if (!current || !available || available.length === 0) return null
  const currentSemver = parseSemver(current)
  if (!currentSemver) return null

  const updates: { patch: string[]; minor: string[]; major: string[] } = { patch: [], minor: [], major: [] }

  for (const version of available) {
    const versionSemver = parseSemver(version)
    if (!versionSemver) continue
    if (!semverGt(versionSemver, currentSemver)) continue
    const diff = semverDiff(versionSemver, currentSemver)
    updates[diff].push(version)
  }

  // Sort each group descending
  updates.patch = sortVersions(updates.patch)
  updates.minor = sortVersions(updates.minor)
  updates.major = sortVersions(updates.major)

  return updates
}
