/**
 * Format a past timestamp as a short, localized "time ago" string relative to now
 * (e.g. "2 minutes ago"), used for the "Last updated" info in DataGrid headers.
 *
 * Granularity is capped at hours: under a minute → seconds, under an hour → minutes,
 * otherwise hours. `locale` is passed to `Intl.RelativeTimeFormat`.
 */
export const formatRelativeTime = (timestamp: number, locale: string): string => {
  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (diffSeconds < 60) return rtf.format(-diffSeconds, "second")
  if (diffSeconds < 3600) return rtf.format(-Math.floor(diffSeconds / 60), "minute")
  return rtf.format(-Math.floor(diffSeconds / 3600), "hour")
}
