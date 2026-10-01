import { useState } from "react"
import { AuroraApp } from "@cobaltcore-dev/aurora/client"
import { registerClient as keyManagerRegisterClient } from "@cobaltcore-dev/aurora-key-manager/client"

const THEME_KEY = "dashboard-theme"

const { App: KeyManagerApp } = keyManagerRegisterClient()

export function App() {
  const [theme, setTheme] = useState<"theme-dark" | "theme-light">(
    () => (localStorage.getItem(THEME_KEY) as "theme-dark" | "theme-light") || "theme-light"
  )

  const handleThemeChange = (newTheme: "theme-dark" | "theme-light") => {
    setTheme(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
  }

  return (
    <AuroraApp
      bffEndpoint={import.meta.env.VITE_BFF_ENDPOINT}
      theme={theme}
      onThemeChange={handleThemeChange}
      serviceExtensions={[
        {
          serviceType: "key-manager",
          serviceName: "barbican",
          label: "Key Manager",
          navSection: "authorization",
          component: KeyManagerApp,
        },
      ]}
    />
  )
}
