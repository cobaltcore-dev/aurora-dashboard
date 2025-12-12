import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LanguageSelect } from "./LanguageSelect"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"

vi.mock("@/client/utils/useLocales", () => ({
  useLocale: vi.fn(() => "en"),
}))

vi.mock("@lingui/core", () => ({
  i18n: {
    activate: vi.fn(),
    locale: "en",
  },
}))

describe("LanguageSelect Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const localStorageMock: Storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    }
    global.localStorage = localStorageMock
  })

  it("user can change language", async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider i18n={i18n}>
        <LanguageSelect />
      </I18nProvider>
    )

    const select = screen.getByRole("combobox")
    await user.click(select)
    await user.click(screen.getByText("Deutsch"))

    await waitFor(() => {
      expect(i18n.activate).toHaveBeenCalledWith("de")
      expect(localStorage.setItem).toHaveBeenCalledWith("aurora-locale", "de")
    })
  })
})
