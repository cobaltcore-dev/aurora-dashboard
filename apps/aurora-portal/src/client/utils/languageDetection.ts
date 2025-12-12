const SUPPORTED_LOCALES = ["en", "de"] as const
const DEFAULT_LOCALE = "en"
const STORAGE_KEY = "aurora-locale"

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Detects the user's preferred language
 */
export function detectLanguage(): SupportedLocale {
  // 1. Check localStorage for saved preference
  const savedLocale = localStorage.getItem(STORAGE_KEY)
  if (savedLocale && isSupportedLocale(savedLocale)) {
    return savedLocale
  }

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
 * Examples: "en-US" -> "en", "de-DE" -> "de"
 */
function extractLanguageCode(locale: string): string {
  return locale.split("-")[0].toLowerCase()
}

/**
 * Type guard for supported locales
 */
function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

/**
 * Saves language preference
 */
export function saveLanguagePreference(locale: SupportedLocale): void {
  localStorage.setItem(STORAGE_KEY, locale)
}

/**
 * Gets current language preference
 */
export function getLanguagePreference(): SupportedLocale | null {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved && isSupportedLocale(saved) ? saved : null
}
