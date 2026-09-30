import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { ServiceLevelDefaultError } from "./ServiceLevelDefaultError"

const { mockNavigate, mockUseParams, mockUseLocation } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
  mockUseLocation: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
  useLocation: () => mockUseLocation(),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("ServiceLevelDefaultError", () => {
  beforeEach(() => {
    i18n.activate("en")
    mockNavigate.mockReset()
    mockUseParams.mockReset()
    mockUseLocation.mockReset()
    mockUseLocation.mockReturnValue({ pathname: "/" })
  })

  test("navigates to the project home when a project route is not found", () => {
    mockUseParams.mockReturnValue({ projectId: "631a3518e93d436fbdf57525babe8606" })
    mockUseLocation.mockReturnValue({
      pathname: "/projects/631a3518e93d436fbdf57525babe8606/netrowk/floatingips",
    })

    render(<ServiceLevelDefaultError />, { wrapper: TestWrapper })

    expect(screen.getByRole("button", { name: "Go to Project Home" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Go to Project Home" }))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId: "631a3518e93d436fbdf57525babe8606" },
    })
  })

  test("shows the entered service segment in the body when inside a project", () => {
    mockUseParams.mockReturnValue({ projectId: "631a3518e93d436fbdf57525babe8606" })
    mockUseLocation.mockReturnValue({
      pathname: "/projects/631a3518e93d436fbdf57525babe8606/netrowk/floatingips",
    })

    render(<ServiceLevelDefaultError />, { wrapper: TestWrapper })

    expect(screen.getByText("Service not found")).toBeInTheDocument()
    expect(screen.getByText(/"netrowk\/floatingips"/)).toBeInTheDocument()
  })

  test("omits the service name when no segment follows the projectId", () => {
    mockUseParams.mockReturnValue({ projectId: "631a3518e93d436fbdf57525babe8606" })
    mockUseLocation.mockReturnValue({
      pathname: "/projects/631a3518e93d436fbdf57525babe8606",
    })

    render(<ServiceLevelDefaultError />, { wrapper: TestWrapper })

    expect(screen.getByText("Service not found")).toBeInTheDocument()
    expect(screen.getByText(/^This service doesn't exist in this project\./)).toBeInTheDocument()
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
  })

  test("navigates to the application home when no project route is available", () => {
    mockUseParams.mockReturnValue({})

    render(<ServiceLevelDefaultError />, { wrapper: TestWrapper })

    expect(screen.getByText("Page not found")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Go to Home" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Go to Project Home" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Go to Home" }))

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" })
  })
})
