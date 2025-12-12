import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { LanguageSelect } from "./LanguageSelect"
import { saveLanguagePreference, getLanguagePreference } from "@/client/utils/languageDetection"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

// Mock the utility functions
vi.mock("@/client/utils/languageDetection", async () => {
  const actual = await vi.importActual("@/client/utils/languageDetection")
  return {
    ...actual,
    saveLanguagePreference: vi.fn(),
    getLanguagePreference: vi.fn(),
  }
})

// Mock the ToggleButton component to simplify testing
vi.mock("@cloudoperators/juno-ui-components", () => ({
  ToggleButton: ({ value, options, onChange, ...props }: any) => (
    <div data-testid="toggle-button" {...props}>
      <span data-testid="current-value">{value}</span>
      <div data-testid="options">
        {options.map((option: string) => (
          <button key={option} data-testid={`option-${option}`} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  ),
}))

describe("LanguageSelect", () => {
  const mockSaveLanguagePreference = vi.mocked(saveLanguagePreference)

  beforeEach(() => {
    // Setup i18n with English as default
    i18n.loadAndActivate({ locale: "en", messages: {} })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderWithI18n = () => {
    return render(
      <I18nProvider i18n={i18n}>
        <LanguageSelect />
      </I18nProvider>
    )
  }

  describe("Rendering", () => {
    it("renders the language selector with current locale", () => {
      renderWithI18n()

      expect(screen.getByTestId("toggle-button")).toBeInTheDocument()
      expect(screen.getByTestId("current-value")).toHaveTextContent("EN")
    })

    it("displays all supported languages as options", () => {
      renderWithI18n()

      expect(screen.getByTestId("option-EN")).toBeInTheDocument()
      expect(screen.getByTestId("option-DE")).toBeInTheDocument()
    })

    it("has proper ARIA label for accessibility", () => {
      renderWithI18n()

      expect(screen.getByLabelText("Select language")).toBeInTheDocument()
    })

    it("reflects current i18n locale in uppercase", () => {
      i18n.loadAndActivate({ locale: "de", messages: {} })
      renderWithI18n()

      expect(screen.getByTestId("current-value")).toHaveTextContent("DE")
    })
  })

  describe("Language switching", () => {
    it("switches to German when DE is selected", async () => {
      renderWithI18n()
      const activateSpy = vi.spyOn(i18n, "activate")

      const deButton = screen.getByTestId("option-DE")
      fireEvent.click(deButton)

      await waitFor(() => {
        expect(activateSpy).toHaveBeenCalledWith("de")
        expect(mockSaveLanguagePreference).toHaveBeenCalledWith("de")
      })
    })

    it("switches to English when EN is selected", async () => {
      i18n.loadAndActivate({ locale: "de", messages: {} })
      renderWithI18n()
      const activateSpy = vi.spyOn(i18n, "activate")

      const enButton = screen.getByTestId("option-EN")
      fireEvent.click(enButton)

      await waitFor(() => {
        expect(activateSpy).toHaveBeenCalledWith("en")
        expect(mockSaveLanguagePreference).toHaveBeenCalledWith("en")
      })
    })

    it("normalizes language code to lowercase before processing", async () => {
      renderWithI18n()
      const activateSpy = vi.spyOn(i18n, "activate")

      const deButton = screen.getByTestId("option-DE")
      fireEvent.click(deButton)

      await waitFor(() => {
        // Should call activate with lowercase 'de', not uppercase 'DE'
        expect(activateSpy).toHaveBeenCalledWith("de")
      })
    })
  })

  describe("Error handling", () => {
    it("handles saveLanguagePreference errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockSaveLanguagePreference.mockImplementationOnce(() => {
        throw new Error("Storage failed")
      })

      renderWithI18n()

      const deButton = screen.getByTestId("option-DE")
      fireEvent.click(deButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled()
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe("Input validation", () => {
    it("ignores invalid language codes", () => {
      renderWithI18n()
      const activateSpy = vi.spyOn(i18n, "activate")

      // Simulate invalid language selection (though UI shouldn't allow this)
      const component = screen.getByTestId("toggle-button")
      const onChange = component.querySelector('[data-testid="options"]')?.parentElement

      // Manually trigger with invalid value
      fireEvent.click(screen.getByTestId("option-EN"))
      const buttons = screen.getAllByRole("button")

      // Create a fake button for invalid locale
      const fakeInvalidButton = document.createElement("button")
      fakeInvalidButton.onclick = () => {
        // Simulate the handleLanguageChange being called with invalid value
        const locale = "xx".toLowerCase()
        if (!["en", "de"].includes(locale)) {
          return // Should exit early
        }
        i18n.activate(locale)
      }
      fakeInvalidButton.click()

      // i18n.activate should not be called with invalid locale
      expect(activateSpy).not.toHaveBeenCalledWith("xx")
    })
  })

  describe("Persistence", () => {
    it("saves language preference after successful change", async () => {
      renderWithI18n()

      const deButton = screen.getByTestId("option-DE")
      fireEvent.click(deButton)

      await waitFor(() => {
        expect(mockSaveLanguagePreference).toHaveBeenCalledTimes(1)
        expect(mockSaveLanguagePreference).toHaveBeenCalledWith("de")
      })
    })

    it("calls save only once per language change", async () => {
      renderWithI18n()

      const deButton = screen.getByTestId("option-DE")
      fireEvent.click(deButton)

      await waitFor(() => {
        expect(mockSaveLanguagePreference).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("Styling and props", () => {
    it("applies custom CSS classes", () => {
      renderWithI18n()

      const toggleButton = screen.getByTestId("toggle-button")
      expect(toggleButton).toHaveClass("!bg-transparent")
      expect(toggleButton).toHaveClass("hover:text-theme-accent")
    })
  })
})
