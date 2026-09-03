import { describe, test, expect } from "vitest"
import { parseSwiftDate, formatSwiftDate } from "./formatSwiftDate"

describe("parseSwiftDate", () => {
  test("treats a zone-less Swift timestamp as UTC (the #1236 fix)", () => {
    // "2024-03-01T08:00:00.000000" is UTC per Swift, but has no "Z". Without the
    // fix, new Date() would read it as local time. We assert the parsed instant
    // is 08:00 UTC — timezone-independent, so the test is deterministic.
    const date = parseSwiftDate("2024-03-01T08:00:00.000000")
    expect(date?.toISOString()).toBe("2024-03-01T08:00:00.000Z")
  })

  test("handles microsecond precision", () => {
    const date = parseSwiftDate("2024-03-01T08:00:00.435654031")
    // Engines keep millisecond precision; the instant is still 08:00:00.435 UTC.
    expect(date?.toISOString()).toBe("2024-03-01T08:00:00.435Z")
  })

  test("leaves a timestamp that already has a Z untouched (e.g. Ceph)", () => {
    const date = parseSwiftDate("2024-03-01T08:00:00Z")
    expect(date?.toISOString()).toBe("2024-03-01T08:00:00.000Z")
  })

  test("respects an explicit offset instead of forcing UTC", () => {
    const date = parseSwiftDate("2024-03-01T08:00:00+02:00")
    // 08:00 at +02:00 is 06:00 UTC.
    expect(date?.toISOString()).toBe("2024-03-01T06:00:00.000Z")
  })

  test("parses a date-only string as UTC without breaking it", () => {
    const date = parseSwiftDate("2024-03-01")
    expect(date?.toISOString()).toBe("2024-03-01T00:00:00.000Z")
  })

  test("returns null for empty, undefined, or invalid input", () => {
    expect(parseSwiftDate(undefined)).toBeNull()
    expect(parseSwiftDate(null)).toBeNull()
    expect(parseSwiftDate("")).toBeNull()
    expect(parseSwiftDate("   ")).toBeNull()
    expect(parseSwiftDate("not a date")).toBeNull()
  })
})

describe("formatSwiftDate", () => {
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false }

  test("renders the zone-less UTC timestamp converted to the target timezone", () => {
    // Same instant (08:00 UTC), shown in two zones — proves the UTC→local
    // conversion actually happens.
    expect(formatSwiftDate("2024-03-01T08:00:00.000000", "en-US", { ...timeOpts, timeZone: "UTC" })).toBe("08:00")
    // New York on 2024-03-01 is EST (UTC-5; DST starts Mar 10), so 08:00 UTC → 03:00.
    expect(formatSwiftDate("2024-03-01T08:00:00.000000", "en-US", { ...timeOpts, timeZone: "America/New_York" })).toBe(
      "03:00"
    )
  })

  test("returns null for missing/invalid input so callers can supply a fallback", () => {
    expect(formatSwiftDate(undefined)).toBeNull()
    expect(formatSwiftDate("")).toBeNull()
    expect(formatSwiftDate("nope")).toBeNull()
  })
})
