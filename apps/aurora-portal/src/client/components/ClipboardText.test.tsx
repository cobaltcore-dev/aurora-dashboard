import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import ClipboardText from "./ClipboardText"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </PortalProvider>
)

describe("ClipboardText", () => {
  const mockWriteText = vi.fn()

  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    vi.useFakeTimers()

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    })

    mockWriteText.mockResolvedValue(undefined)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Rendering", () => {
    it("renders the text correctly", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ClipboardText text="Test text" />
          </TestingProvider>
        )
      })
      expect(screen.getByText("Test text")).toBeInTheDocument()
    })

    it("renders with custom className", async () => {
      const { container } = await act(async () => {
        return render(
          <TestingProvider>
            <ClipboardText text="Test" className="custom-class" />
          </TestingProvider>
        )
      })
      expect(container.querySelector(".custom-class")).toBeInTheDocument()
    })

    it("renders copy icon by default", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ClipboardText text="Test" />
          </TestingProvider>
        )
      })

      const trigger = screen.getByTestId("clipboard-copy-trigger")
      expect(trigger).toBeInTheDocument()
    })

    it("truncates text when truncateAt is specified", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ClipboardText text="This is a very long text" truncateAt={10} />
          </TestingProvider>
        )
      })
      expect(screen.getByText("This is a ...")).toBeInTheDocument()
    })

    it("does not truncate text shorter than truncateAt", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ClipboardText text="Short" truncateAt={10} />
          </TestingProvider>
        )
      })
      expect(screen.getByText("Short")).toBeInTheDocument()
    })

    it("forwards additional HTML attributes", async () => {
      const { container } = await act(async () => {
        return render(
          <TestingProvider>
            <ClipboardText text="Test" data-custom="value" id="test-id" />
          </TestingProvider>
        )
      })
      const wrapper = container.querySelector("#test-id")
      expect(wrapper).toBeInTheDocument()
      expect(wrapper).toHaveAttribute("data-custom", "value")
    })
  })

  describe("Copy functionality", () => {
    it("copies text to clipboard when clicked", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ClipboardText text="Copy me" />
          </TestingProvider>
        )
      })

      const trigger = screen.getByTestId("clipboard-copy-trigger")

      await act(async () => {
        fireEvent.click(trigger)
      })

      expect(mockWriteText).toHaveBeenCalledWith("Copy me")
    })

    it("prevents event propagation when copying", async () => {
      const parentClickHandler = vi.fn()

      await act(async () => {
        render(
          <TestingProvider>
            <div onClick={parentClickHandler}>
              <ClipboardText text="Copy me" />
            </div>
          </TestingProvider>
        )
      })

      const trigger = screen.getByTestId("clipboard-copy-trigger")

      await act(async () => {
        fireEvent.click(trigger)
      })

      expect(mockWriteText).toHaveBeenCalled()
      expect(parentClickHandler).not.toHaveBeenCalled()
    })

    it("copies original text even when truncated", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ClipboardText text="This is a very long text" truncateAt={10} />
          </TestingProvider>
        )
      })

      expect(screen.getByText("This is a ...")).toBeInTheDocument()

      const trigger = screen.getByTestId("clipboard-copy-trigger")

      await act(async () => {
        fireEvent.click(trigger)
      })

      expect(mockWriteText).toHaveBeenCalledWith("This is a very long text")
    })
  })
})
