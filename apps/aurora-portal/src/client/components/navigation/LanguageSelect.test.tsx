import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { LanguageSelect } from "./LanguageSelect"
import { saveLanguagePreference, getLanguagePreference } from "@/client/utils/languageDetection"
import { describe, it, expect, beforeEach, afterEach } from "vitest"

describe("LanguageSelect", () => {
  const mockStorage = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      clear: () => {
        store = {}
      },
    }
  })()

  beforeEach(() => {
    mockStorage.clear()
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    })
    i18n.loadAndActivate({ locale: "en", messages: {} })
  })

  afterEach(() => {
    mockStorage.clear()
  })

  const renderComponent = () => {
    return render(
      <I18nProvider i18n={i18n}>
        <LanguageSelect />
      </I18nProvider>
    )
  }

  describe("Rendering", () => {
    it("renders language selector button", () => {
      renderComponent()

      const button = screen.getByRole("button", { name: "Select language" })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent("EN")
    })

    it("shows current locale on button", () => {
      renderComponent()

      expect(screen.getByRole("button")).toHaveTextContent("EN")
    })

    it("reflects German locale when active", () => {
      i18n.loadAndActivate({ locale: "de", messages: {} })
      renderComponent()

      expect(screen.getByRole("button")).toHaveTextContent("DE")
    })

    it("has accessibility label", () => {
      renderComponent()

      expect(screen.getByLabelText("Select language")).toBeInTheDocument()
    })
  })

  describe("Language switching", () => {
    it("switches to German when button is clicked", async () => {
      renderComponent()

      const button = screen.getByRole("button", { name: "Select language" })

      // Button zeigt aktuell EN
      expect(button).toHaveTextContent("EN")

      // Click zum Wechsel
      fireEvent.click(button)

      await waitFor(() => {
        expect(i18n.locale).toBe("de")
        expect(getLanguagePreference()).toBe("de")
        expect(button).toHaveTextContent("DE")
      })
    })

    it("toggles back to English", async () => {
      i18n.loadAndActivate({ locale: "de", messages: {} })
      renderComponent()

      const button = screen.getByRole("button", { name: "Select language" })
      expect(button).toHaveTextContent("DE")

      fireEvent.click(button)

      await waitFor(() => {
        expect(i18n.locale).toBe("en")
        expect(getLanguagePreference()).toBe("en")
        expect(button).toHaveTextContent("EN")
      })
    })

    it("persists language preference on toggle", async () => {
      renderComponent()

      fireEvent.click(screen.getByRole("button"))

      await waitFor(() => {
        expect(getLanguagePreference()).toBe("de")
      })
    })
  })

  describe("Persistence integration", () => {
    it("restores previously selected language", () => {
      saveLanguagePreference("de")

      expect(getLanguagePreference()).toBe("de")
    })

    it("handles multiple toggles correctly", async () => {
      renderComponent()
      const button = screen.getByRole("button")

      // EN -> DE
      fireEvent.click(button)
      await waitFor(() => expect(getLanguagePreference()).toBe("de"))

      // DE -> EN
      fireEvent.click(button)
      await waitFor(() => expect(getLanguagePreference()).toBe("en"))

      expect(i18n.locale).toBe("en")
    })

    it("loads with saved preference", () => {
      saveLanguagePreference("de")
      i18n.loadAndActivate({ locale: "de", messages: {} })

      renderComponent()

      expect(screen.getByRole("button")).toHaveTextContent("DE")
    })
  })

  describe("Error handling", () => {
    it("language change works even when storage fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Storage unavailable")
      })

      renderComponent()
      const button = screen.getByRole("button")

      expect(button).toHaveTextContent("EN")
      fireEvent.click(button)

      await waitFor(() => {
        // UI funktioniert trotz Storage-Fehler
        expect(i18n.locale).toBe("de")
        expect(button).toHaveTextContent("DE")
      })

      consoleErrorSpy.mockRestore()
    })
  })
  describe("Styling", () => {
    it("applies custom CSS classes", () => {
      renderComponent()

      const button = screen.getByRole("button")
      expect(button.className).toContain("!bg-transparent")
      expect(button.className).toContain("hover:text-theme-accent")
    })
  })
})
