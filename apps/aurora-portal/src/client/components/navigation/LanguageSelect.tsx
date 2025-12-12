import { ToggleButton } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { useLocale } from "@/client/utils/useLocales"

const languages = ["EN", "DE"]

export function LanguageSelect() {
  const currentLocale = useLocale()
  const currentValue = currentLocale.toUpperCase()

  const handleLanguageChange = (value: string) => {
    const locale = value.toLowerCase()
    i18n.activate(locale)
    localStorage.setItem("aurora-locale", locale)
  }

  return (
    <ToggleButton
      value={currentValue}
      options={languages}
      onChange={handleLanguageChange}
      className="!bg-transparent hover:text-theme-accent"
    />
  )
}
