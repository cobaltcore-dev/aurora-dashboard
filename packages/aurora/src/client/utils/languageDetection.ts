export const SUPPORTED_LOCALES = ["en", "de"] as const
const DEFAULT_LOCALE = "en"
const STORAGE_KEY = "aurora-locale"

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Detects the user's preferred language with fallback chain:
 * 1. Saved preference (localStorage)
 * 2. Browser language settings
 * 3. Default locale
 */
export function detectLanguage(): SupportedLocale {
  // 1. Check saved preference
  const saved = getLanguagePreference()
  if (saved) return saved

  // 2. Check browser languages
  const browserLanguages = navigator.languages || [navigator.language]

  for (const browserLang of browserLanguages) {
    const langCode = extractLanguageCode(browserLang)
    if (isSupportedLocale(langCode)) {
      return langCode
    }
  }

  // 3. Return default
  return DEFAULT_LOCALE
}

/**
 * Extracts language code from locale string
 * @example "en-US" -> "en", "de-DE" -> "de"
 */
function extractLanguageCode(locale: string): string {
  return locale.split("-")[0].toLowerCase()
}

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

export function saveLanguagePreference(locale: SupportedLocale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch (error) {
    console.error("Failed to save language preference:", error)
  }
}

export function getLanguagePreference(): SupportedLocale | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && isSupportedLocale(saved) ? saved : null
  } catch (error) {
    console.warn("Failed to read language preference:", error)
    return null
  }
}
