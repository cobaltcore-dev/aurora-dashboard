import { describe, it, expect } from "vitest"
import { formatRelativeTime } from "./formatRelativeTime"

describe("formatRelativeTime", () => {
  const now = new Date("2024-01-15T12:00:00Z").getTime()
  const locale = "en"

  it("formats seconds", () => {
    const timestamp = now - 30 * 1000 // 30 seconds ago
    expect(formatRelativeTime(timestamp, locale, now)).toBe("30 seconds ago")
  })

  it("formats minutes", () => {
    const timestamp = now - 5 * 60 * 1000 // 5 minutes ago
    expect(formatRelativeTime(timestamp, locale, now)).toBe("5 minutes ago")
  })

  it("formats hours", () => {
    const timestamp = now - 3 * 60 * 60 * 1000 // 3 hours ago
    expect(formatRelativeTime(timestamp, locale, now)).toBe("3 hours ago")
  })

  it("formats days", () => {
    const timestamp = now - 2 * 24 * 60 * 60 * 1000 // 2 days ago
    expect(formatRelativeTime(timestamp, locale, now)).toBe("2 days ago")
  })

  it("handles negative differences by clamping to 0", () => {
    const timestamp = now + 1000 // 1 second in the future
    // With numeric: "auto", 0 seconds is formatted as "now"
    expect(formatRelativeTime(timestamp, locale, now)).toBe("now")
  })

  it("uses just now for 0 seconds", () => {
    expect(formatRelativeTime(now, locale, now)).toBe("now")
  })
})
