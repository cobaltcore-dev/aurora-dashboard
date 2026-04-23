import { render, screen } from "@testing-library/react"
import { describe, test, expect, beforeEach } from "vitest"
import { RouteError } from "./RouteError"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

// Wrapper component for tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("RouteError", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  test("renders default error message for Error instance", () => {
    const error = new Error("Something went wrong")
    render(<RouteError error={error} />, { wrapper: TestWrapper })

    expect(screen.getByText("Unable to Load Content")).toBeInTheDocument()
    // Security: Error.message should NOT be exposed by default
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument()
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()
    expect(
      screen.getByText(/This could be due to insufficient permissions or a temporary service issue/i)
    ).toBeInTheDocument()
  })

  test("does not expose Error.message for security", () => {
    const error = new Error("Internal database connection string: postgres://sensitive-data")
    render(<RouteError error={error} />, { wrapper: TestWrapper })

    // Security test: sensitive error messages should not be exposed
    expect(screen.queryByText(/database connection string/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sensitive-data/i)).not.toBeInTheDocument()
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()
  })

  test("renders safe error message when explicitly passed", () => {
    const error = new Error("Internal error")
    const safeMessage = "The item you requested could not be found"
    render(<RouteError error={error} safeErrorMessage={safeMessage} />, { wrapper: TestWrapper })

    expect(screen.getByText(safeMessage)).toBeInTheDocument()
    expect(screen.queryByText("Internal error")).not.toBeInTheDocument()
  })

  test("renders safeMessage property when present on error object", () => {
    const error = {
      message: "Internal server error with stack trace",
      safeMessage: "Unable to process your request",
    }
    render(<RouteError error={error} />, { wrapper: TestWrapper })

    expect(screen.getByText("Unable to process your request")).toBeInTheDocument()
    expect(screen.queryByText(/Internal server error/i)).not.toBeInTheDocument()
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
    expect(screen.queryByText(/This could be due to insufficient permissions/i)).not.toBeInTheDocument()
  })

  test("renders with custom title and help text", () => {
    const error = new Error("Network failure")
    render(<RouteError error={error} title="Connection Error" helpText="Check your network connection" />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByText("Connection Error")).toBeInTheDocument()
    // Security: Error.message is not exposed by default
    expect(screen.queryByText("Network failure")).not.toBeInTheDocument()
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()
    expect(screen.getByText("Check your network connection")).toBeInTheDocument()
  })

  test("renders custom title, help text, and safe error message", () => {
    const error = new Error("Internal network error")
    render(
      <RouteError
        error={error}
        title="Connection Error"
        helpText="Check your network connection"
        safeErrorMessage="Unable to connect to the server"
      />,
      {
        wrapper: TestWrapper,
      }
    )

    expect(screen.getByText("Connection Error")).toBeInTheDocument()
    expect(screen.getByText("Unable to connect to the server")).toBeInTheDocument()
    expect(screen.queryByText("Internal network error")).not.toBeInTheDocument()
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

  test("extracts message from Error objects with various properties", () => {
    // Standard Error - should show default message for security
    const standardError = new Error("Standard error message")
    const { rerender } = render(<RouteError error={standardError} />, { wrapper: TestWrapper })
    expect(screen.queryByText("Standard error message")).not.toBeInTheDocument()
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()

    // Error with custom message property - should still show default message
    const customError = { message: "Custom error object" }
    rerender(
      <TestWrapper>
        <RouteError error={customError} />
      </TestWrapper>
    )
    expect(screen.queryByText("Custom error object")).not.toBeInTheDocument()
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()

    // Error with safeMessage property - should show safe message
    const safeError = { message: "Internal error", safeMessage: "User-friendly error" }
    rerender(
      <TestWrapper>
        <RouteError error={safeError} />
      </TestWrapper>
    )
    expect(screen.getByText("User-friendly error")).toBeInTheDocument()
    expect(screen.queryByText("Internal error")).not.toBeInTheDocument()
  })

  test("applies correct CSS classes for layout", () => {
    const error = new Error("Test")
    const { container } = render(<RouteError error={error} />, { wrapper: TestWrapper })

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass("flex")
    expect(wrapper).toHaveClass("min-h-[400px]")
    expect(wrapper).toHaveClass("p-8")
  })
})
