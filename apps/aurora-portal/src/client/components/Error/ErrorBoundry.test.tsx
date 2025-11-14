import { ReactNode } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ErrorBoundary } from "./ErrorBoundry"

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    history: {
      back: vi.fn(),
    },
  }),
}))

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders error message", () => {
    const error = new Error("Test error")
    render(<ErrorBoundary error={error} />, { wrapper: TestingProvider })

    expect(screen.getByText("500")).toBeInTheDocument()
    expect(screen.getByText("Test error")).toBeInTheDocument()
  })

  it("show home button, and no Back without history", () => {
    const error = new Error("Test error")
    render(<ErrorBoundary error={error} />, { wrapper: TestingProvider })
    expect(screen.queryAllByText("Back")).not.toBeInTheDocument()
    expect(screen.getByText("Home")).toBeInTheDocument()
  })

  it("shows both back and home buttons when history exists", () => {
    Object.defineProperty(window, "history", {
      value: { length: 2, back: vi.fn() },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(document, "referrer", {
      value: window.location.origin + "/previous-page",
      writable: true,
      configurable: true,
    })

    const error = new Error("Test error")
    render(<ErrorBoundary error={error} />, { wrapper: TestingProvider })

    expect(screen.getByText("Back")).toBeInTheDocument()
    expect(screen.getByText("Home")).toBeInTheDocument()
  })
})
