import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { ServiceLevelDefaultError } from "./ServiceLevelDefaultError"

const { mockNavigate, mockUseParams } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("ServiceLevelDefaultError", () => {
  beforeEach(() => {
    i18n.activate("en")
    mockNavigate.mockReset()
    mockUseParams.mockReset()
  })

  test("navigates to the project home when a project route is not found", () => {
    mockUseParams.mockReturnValue({ projectId: "631a3518e93d436fbdf57525babe8606" })

    render(<ServiceLevelDefaultError />, { wrapper: TestWrapper })

    expect(screen.getByRole("button", { name: "Go to Project Home" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Go to Project Home" }))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId: "631a3518e93d436fbdf57525babe8606" },
    })
  })

  test("navigates to the application home when no project route is available", () => {
    mockUseParams.mockReturnValue({})

    render(<ServiceLevelDefaultError />, { wrapper: TestWrapper })

    fireEvent.click(screen.getByRole("button", { name: "Go to Project Home" }))

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" })
  })
})
