import { render, screen } from "@testing-library/react"
import { describe, test, expect, beforeEach } from "vitest"
import { RouteError } from "./RouteError"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

// Wrapper component for tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
)

describe("RouteError", () => {
  beforeEach(() => {
    i18n.activate("en")
  })
  test("renders default error message for Error instance", () => {
    const error = new Error("Something went wrong")
    render(<RouteError error={error} />, { wrapper: TestWrapper })

    expect(screen.getByText("Unable to Load Content")).toBeInTheDocument()
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    expect(
      screen.getByText(
        /This could be due to insufficient permissions or a temporary service issue/i
      )
    ).toBeInTheDocument()
  })

  test("renders default error message for non-Error object", () => {
    const error = { foo: "bar" }
    render(<RouteError error={error} />, { wrapper: TestWrapper })

    expect(screen.getByText("Unable to Load Content")).toBeInTheDocument()
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()
  })

  test("renders custom title when provided", () => {
    const error = new Error("Custom error")
    render(<RouteError error={error} title="Custom Title" />, { wrapper: TestWrapper })

    expect(screen.getByText("Custom Title")).toBeInTheDocument()
    expect(screen.queryByText("Unable to Load Content")).not.toBeInTheDocument()
  })

  test("renders custom help text when provided", () => {
    const error = new Error("Test error")
    const customHelpText = "Please contact support for assistance"
    render(<RouteError error={error} helpText={customHelpText} />, { wrapper: TestWrapper })

    expect(screen.getByText(customHelpText)).toBeInTheDocument()
    expect(
      screen.queryByText(/This could be due to insufficient permissions/i)
    ).not.toBeInTheDocument()
  })

  test("renders with custom title and help text", () => {
    const error = new Error("Network failure")
    render(
      <RouteError
        error={error}
        title="Connection Error"
        helpText="Check your network connection"
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText("Connection Error")).toBeInTheDocument()
    expect(screen.getByText("Network failure")).toBeInTheDocument()
    expect(screen.getByText("Check your network connection")).toBeInTheDocument()
  })

  test("handles null or undefined error gracefully", () => {
    render(<RouteError error={null} />, { wrapper: TestWrapper })
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()
  })

  test("handles string error correctly", () => {
    render(<RouteError error="Custom string error" />, { wrapper: TestWrapper })
    expect(screen.getByText("Custom string error")).toBeInTheDocument()
  })

  test("renders status code when provided", () => {
    const error = new Error("Server error")
    render(<RouteError error={error} statusCode={500} />, { wrapper: TestWrapper })

    expect(screen.getByText("500")).toBeInTheDocument()
    expect(screen.getByText("Server error")).toBeInTheDocument()
  })

  test("does not render status code when not provided", () => {
    const error = new Error("Test error")
    render(<RouteError error={error} />, { wrapper: TestWrapper })

    expect(screen.queryByText("404")).not.toBeInTheDocument()
    expect(screen.queryByText("500")).not.toBeInTheDocument()
  })

  test("renders danger variant Message component", () => {
    const error = new Error("Test")
    const { container } = render(<RouteError error={error} />, { wrapper: TestWrapper })

    // Check that the Message component is rendered with proper structure
    const messageContainer = container.querySelector(".juno-message")
    expect(messageContainer).toBeInTheDocument()
  })

  test("extracts message from Error objects with various properties", () => {
    // Standard Error
    const standardError = new Error("Standard error message")
    const { rerender } = render(<RouteError error={standardError} />, { wrapper: TestWrapper })
    expect(screen.getByText("Standard error message")).toBeInTheDocument()

    // Error with custom message property
    const customError = { message: "Custom error object" }
    rerender(
      <TestWrapper>
        <RouteError error={customError} />
      </TestWrapper>
    )
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()
  })

  test("applies correct CSS classes for layout", () => {
    const error = new Error("Test")
    const { container } = render(<RouteError error={error} />, { wrapper: TestWrapper })

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass("flex", "items-center", "justify-center")
    expect(wrapper).toHaveClass("min-h-[400px]")
    expect(wrapper).toHaveClass("p-8")
  })
})
