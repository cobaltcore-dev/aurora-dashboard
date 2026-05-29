import type { FC } from "react"
import App from "./App"

export type AuroraAppProps = {
  theme?: "theme-dark" | "theme-light"
}

export const AuroraApp: FC<AuroraAppProps> = App
