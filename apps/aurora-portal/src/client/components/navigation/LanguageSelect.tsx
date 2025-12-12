import { ToggleButton } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { useLingui } from "@lingui/react"
import { SUPPORTED_LOCALES, saveLanguagePreference, type SupportedLocale } from "@/client/utils/languageDetection"

const isSupportedLocale = (locale: string): locale is SupportedLocale => {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

export function LanguageSelect() {
  const { i18n: linguiInstance } = useLingui()
  const currentValue = linguiInstance.locale.toUpperCase()
  const displayLanguages = SUPPORTED_LOCALES.map((l) => l.toUpperCase())

  const handleLanguageChange = (value: string) => {
    const locale = value.toLowerCase()

    if (!isSupportedLocale(locale)) return

    try {
      i18n.activate(locale)
      saveLanguagePreference(locale)
    } catch (error) {
      console.error("Language change failed:", error)
    }
  }

  return (
    <ToggleButton
      value={currentValue}
      options={displayLanguages}
      onChange={handleLanguageChange}
      aria-label="Select language"
      className="!bg-transparent hover:text-theme-accent"
    />
  )
}
