import { i18n } from "@lingui/core"
import { useEffect, useState } from "react"

export function useLocale() {
  const [locale, setLocale] = useState(i18n.locale)

  useEffect(() => {
    const unsubscribe = i18n.on("change", () => {
      setLocale(i18n.locale)
    })
    return unsubscribe
  }, [])

  return locale
}
