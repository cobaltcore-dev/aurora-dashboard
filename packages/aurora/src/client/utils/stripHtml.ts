/**
 * Strips HTML tags from a string and normalizes whitespace
 */
export const stripHtml = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, " ") // Replace <br> tags with spaces
    .replace(/<[^>]*>/g, "") // Remove all other HTML tags
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .trim()
}
