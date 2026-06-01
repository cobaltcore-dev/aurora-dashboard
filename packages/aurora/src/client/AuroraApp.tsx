import type { FC } from "react"
import App from "./App"

export type AuroraAppProps = {
  theme?: "theme-dark" | "theme-light"
  bffEndpoint?: string
  onThemeChange?: (theme: "theme-dark" | "theme-light") => void
}

export const AuroraApp: FC<AuroraAppProps> = App
