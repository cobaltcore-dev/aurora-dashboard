import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { RouteIdLevelDefaultError } from "./RouteIdLevelDefaultError"

const { mockNavigate, mockUseParams } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("RouteIdLevelDefaultError", () => {
  beforeEach(() => {
    i18n.activate("en")
    mockNavigate.mockReset()
    mockUseParams.mockReset()
  })

  test("renders the default not-found content and navigates to the project home", () => {
    const projectId = "631a3518e93d436fbdf57525babe8606"
    mockUseParams.mockReturnValue({ projectId })

    render(<RouteIdLevelDefaultError />, { wrapper: TestWrapper })

    expect(screen.getByText("Resource Not Found")).toBeInTheDocument()
    expect(
      screen.getByText("The Resource you are looking for does not exist or is not accessible.")
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Go to Project Home" }))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId },
    })
  })

  test("navigates to the application home when no project ID is available", () => {
    mockUseParams.mockReturnValue({})

    render(<RouteIdLevelDefaultError />, { wrapper: TestWrapper })

    fireEvent.click(screen.getByRole("button", { name: "Go to Project Home" }))

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" })
  })

  test("uses custom title, description, and action when provided", () => {
    mockUseParams.mockReturnValue({ projectId: "project-id" })

    render(
      <RouteIdLevelDefaultError
        errorTitle="Floating IP Not Found"
        errorDescription="The requested Floating IP does not exist."
        action={<button type="button">Back to Floating IPs</button>}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText("Floating IP Not Found")).toBeInTheDocument()
    expect(screen.getByText("The requested Floating IP does not exist.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Back to Floating IPs" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Go to Project Home" })).not.toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
