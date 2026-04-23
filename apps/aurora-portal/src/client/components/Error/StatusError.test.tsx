import { ReactNode } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { StatusError } from "./StatusError"

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    history: {
      back: vi.fn(),
    },
  }),
}))

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("StatusError", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  it("renders error message with status code", () => {
    render(
      <StatusError statusCode={404} title="Page Not Found" message="The page you are looking for does not exist." />,
      { wrapper: TestingProvider }
    )

    expect(screen.getByText("404")).toBeInTheDocument()
    expect(screen.getByText("Page Not Found")).toBeInTheDocument()
    expect(screen.getByText("The page you are looking for does not exist.")).toBeInTheDocument()
  })

  it("renders without status code", () => {
    render(<StatusError title="Error" message="Something went wrong" />, { wrapper: TestingProvider })

    expect(screen.queryByText("404")).not.toBeInTheDocument()
    expect(screen.getByText("Error")).toBeInTheDocument()
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })

  it("renders Back button when onBackClick is provided", () => {
    const onBackClick = vi.fn()
    render(<StatusError title="Error" message="Test error" onBackClick={onBackClick} />, { wrapper: TestingProvider })

    const backButton = screen.getByText("Back")
    expect(backButton).toBeInTheDocument()

    fireEvent.click(backButton)
    expect(onBackClick).toHaveBeenCalledTimes(1)
  })

  it("renders Home button when onHomeClick is provided", () => {
    const onHomeClick = vi.fn()
    render(<StatusError title="Error" message="Test error" onHomeClick={onHomeClick} />, { wrapper: TestingProvider })

    const homeButton = screen.getByText("Home")
    expect(homeButton).toBeInTheDocument()

    fireEvent.click(homeButton)
    expect(onHomeClick).toHaveBeenCalledTimes(1)
  })

  it("renders Try Again button when reset is provided", () => {
    const reset = vi.fn()
    render(<StatusError title="Error" message="Test error" reset={reset} />, { wrapper: TestingProvider })

    const tryAgainButton = screen.getByText("Try Again")
    expect(tryAgainButton).toBeInTheDocument()

    fireEvent.click(tryAgainButton)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("renders all buttons when all handlers are provided", () => {
    const onBackClick = vi.fn()
    const onHomeClick = vi.fn()
    const reset = vi.fn()

    render(
      <StatusError
        title="Error"
        message="Test error"
        onBackClick={onBackClick}
        onHomeClick={onHomeClick}
        reset={reset}
      />,
      { wrapper: TestingProvider }
    )

    expect(screen.getByText("Back")).toBeInTheDocument()
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Try Again")).toBeInTheDocument()
  })

  it("does not render buttons when no handlers are provided", () => {
    render(<StatusError title="Error" message="Test error" />, { wrapper: TestingProvider })

    expect(screen.queryByText("Back")).not.toBeInTheDocument()
    expect(screen.queryByText("Home")).not.toBeInTheDocument()
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument()
  })

  it("renders different status codes correctly", () => {
    const { rerender } = render(<StatusError statusCode={500} title="Server Error" message="Internal server error" />, {
      wrapper: TestingProvider,
    })

    expect(screen.getByText("500")).toBeInTheDocument()

    rerender(
      <TestingProvider>
        <StatusError statusCode={403} title="Forbidden" message="Access denied" />
      </TestingProvider>
    )

    expect(screen.getByText("403")).toBeInTheDocument()
    expect(screen.queryByText("500")).not.toBeInTheDocument()
  })
})
