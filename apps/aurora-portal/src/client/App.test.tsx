import { getByText, render, act } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"

import App from "./App"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

test("Content should be translated correctly in English", () => {
  act(() => {
    i18n.activate("en")
  })
  const { getByTestId, container } = render(<App />, { wrapper: TestingProvider })
  expect(getByTestId("welcome-title")).toBeInTheDocument()
  expect(getByText(container, "Welcome to Aurora Dashboard")).toBeDefined()
})

test("Content should be translated correctly in German", () => {
  act(() => {
    i18n.activate("de")
  })
  const { getByTestId, container } = render(<App />, { wrapper: TestingProvider })
  expect(getByTestId("welcome-title")).toBeInTheDocument()
  expect(getByText(container, "Willkommen beim Aurora-Dashboard")).toBeDefined()
})
