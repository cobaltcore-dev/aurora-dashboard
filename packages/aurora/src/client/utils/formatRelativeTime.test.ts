import { describe, it, expect, vi, afterEach } from "vitest"
import { formatRelativeTime } from "./formatRelativeTime"

const NOW = new Date("2026-01-01T12:00:00Z").getTime()

describe("formatRelativeTime", () => {
  afterEach(() => vi.useRealTimers())

  const at = (secondsAgo: number) => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    return NOW - secondsAgo * 1000
  }

  it("formats sub-minute differences in seconds", () => {
    expect(formatRelativeTime(at(5), "en")).toBe("5 seconds ago")
  })

  it("formats sub-hour differences in minutes", () => {
    expect(formatRelativeTime(at(120), "en")).toBe("2 minutes ago")
  })

  it("formats longer differences in hours", () => {
    expect(formatRelativeTime(at(3 * 3600), "en")).toBe("3 hours ago")
  })

  it("uses 'now' wording for a zero difference (numeric: auto)", () => {
    expect(formatRelativeTime(at(0), "en")).toBe("now")
  })

  it("respects the given locale", () => {
    expect(formatRelativeTime(at(120), "de")).toBe("vor 2 Minuten")
  })
})
