import { useState } from "react"
import { AuroraApp, type TrackEventPayload } from "@cobaltcore-dev/aurora/client"

const THEME_KEY = "dashboard-theme"

export function App() {
  const [theme, setTheme] = useState<"theme-dark" | "theme-light">(
    () => (localStorage.getItem(THEME_KEY) as "theme-dark" | "theme-light") || "theme-light"
  )

  const handleThemeChange = (newTheme: "theme-dark" | "theme-light") => {
    setTheme(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
  }

  const handleTrackEvent = (payload: TrackEventPayload) => {
    console.log("📊 Analytics:", payload)
  }

  return (
    <AuroraApp
      bffEndpoint={import.meta.env.VITE_BFF_ENDPOINT}
      theme={theme}
      onThemeChange={handleThemeChange}
      onTrackEvent={handleTrackEvent}
    />
  )
}
