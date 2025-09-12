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

    const { container } = render(<App />, { wrapper: TestingProvider })

    const welcomeTitle = container.querySelector("h1")
    expect(welcomeTitle).toBeInTheDocument()
    expect(welcomeTitle).toHaveTextContent("Manage OpenStack with Aurora")
  })

  test("Content should be translated correctly in German", async () => {
    await act(async () => {
      i18n.activate("de")
    })

    const { container } = render(<App />, { wrapper: TestingProvider })

    const welcomeTitle = container.querySelector("h1")
    expect(welcomeTitle).toBeInTheDocument()
    expect(welcomeTitle).toHaveTextContent("Verwalten Sie OpenStack mit Aurora")
  })
})
