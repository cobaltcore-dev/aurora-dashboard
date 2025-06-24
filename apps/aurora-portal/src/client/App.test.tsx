import { render, act } from "@testing-library/react"
import { beforeAll, describe, test, expect } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import App from "./App"

beforeAll(() => {
  window.scrollTo = vi.fn()
})

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("App Translation Tests", () => {
  test("Content should be translated correctly in English", async () => {
    await act(async () => {
      i18n.activate("en")
    })

    const { findByText } = render(<App />, { wrapper: TestingProvider })

    const welcomeText = await findByText("Welcome to Aurora Dashboard")
    expect(welcomeText).toBeInTheDocument()
  })

  test("Content should be translated correctly in German", async () => {
    await act(async () => {
      i18n.activate("de")
    })

    const { findByText, getByTestId } = render(<App />, { wrapper: TestingProvider })

    expect(getByTestId("welcome-title")).toBeInTheDocument()

    const welcomeText = await findByText("Willkommen beim Aurora-Dashboard")
    expect(welcomeText).toBeInTheDocument()
  })
})
