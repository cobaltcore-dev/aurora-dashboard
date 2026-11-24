/**
 * Formats a timestamp as relative time (e.g., "5 minutes ago", "2 hours ago").
 * @param timestamp - The timestamp in milliseconds
 * @param locale - The locale for formatting
 * @param now - The current time in milliseconds (defaults to Date.now(), overridable for tests)
 * @returns A formatted relative time string
 */
export function formatRelativeTime(timestamp: number, locale: string, now: number = Date.now()): string {
  const diffInSeconds = Math.max(0, Math.floor((now - timestamp) / 1000))

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  if (diffInSeconds < 60) {
    return formatter.format(-diffInSeconds, "seconds")
  } else if (diffInSeconds < 3600) {
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    return formatter.format(-diffInMinutes, "minutes")
  } else if (diffInSeconds < 86400) {
    const diffInHours = Math.floor(diffInSeconds / 3600)
    return formatter.format(-diffInHours, "hours")
  } else {
    const diffInDays = Math.floor(diffInSeconds / 86400)
    return formatter.format(-diffInDays, "days")
  }
}
