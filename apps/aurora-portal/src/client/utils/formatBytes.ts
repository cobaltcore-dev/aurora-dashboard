/**
 * Supported unit systems for byte formatting.
 *
 * - `"binary"` (IEC): uses powers of 1024 → B, KiB, MiB, GiB, TiB, PiB, EiB, ZiB, YiB
 * - `"decimal"` (SI):  uses powers of 1000 → B, KB, MB, GB, TB, PB, EB, ZB, YB
 *
 * Default is `"binary"`.
 */
export type ByteUnitSystem = "binary" | "decimal"

export interface FormatBytesOptions {
  /** Number of decimal places to display. Defaults to `2`. */
  decimals?: number
  /** Unit system to use. Defaults to `"binary"`. */
  unitSystem?: ByteUnitSystem
}

const BINARY_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"] as const
const DECIMAL_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] as const

/**
 * Formats a raw byte count into a human-readable string.
 *
 * @example
 * formatBytes(1536)                              // "1.50 KiB"  (binary, default)
 * formatBytes(1500, { unitSystem: "decimal" })   // "1.50 KB"
 * formatBytes(1073741824)                        // "1.00 GiB"
 * formatBytes(0)                                 // "0 B"
 * formatBytes(null)                              // "0 B"
 */
export function formatBytes(
  bytes: number | null | undefined,
  { decimals = 2, unitSystem = "binary" }: FormatBytesOptions = {}
): string {
  if (!bytes || bytes === 0) return "0 B"

  const k = unitSystem === "binary" ? 1024 : 1000
  const units = unitSystem === "binary" ? BINARY_UNITS : DECIMAL_UNITS
  const dm = Math.max(0, decimals)

  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${units[i]}`
}

/**
 * Convenience wrapper that always uses the decimal (SI) unit system.
 *
 * @example
 * formatBytesDecimal(1500000) // "1.50 MB"
 */
export const formatBytesDecimal = (bytes: number | null | undefined, decimals?: number): string =>
  formatBytes(bytes, { decimals, unitSystem: "decimal" })

/**
 * Convenience wrapper that always uses the binary (IEC) unit system.
 *
 * @example
 * formatBytesBinary(1048576) // "1.00 MiB"
 */
export const formatBytesBinary = (bytes: number | null | undefined, decimals?: number): string =>
  formatBytes(bytes, { decimals, unitSystem: "binary" })
