import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { ProjectCardView } from "./ProjectCardView"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@cloudoperators/juno-ui-components", () => ({
  Card: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <div role="button" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  ContentHeading: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h1 className={className}>{children}</h1>
  ),
}))

const projects = [
  {
    domain_id: "1789d1",
    enabled: true,
    id: "89ac3f",
    links: {
      self: "https://example.com/identity/v3/projects/89ac3f",
    },
    name: "Security Group",
    description: "Manages security compliance and access control.",
  },
]

describe("ProjectCardView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  test("renders project data correctly", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectCardView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeDefined()
    })

    expect(screen.getByText("Manages security compliance and access control.")).toBeDefined()
  })

  test("card navigates to the correct project route on click", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectCardView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button"))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId: "89ac3f" },
    })
  })

  test("renders empty state when no projects", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectCardView projects={undefined} />
      </I18nProvider>
    )

    await waitFor(
      () => {
        const emptyState = screen.queryByText(/no projects/i)
        expect(emptyState).toBeDefined()
      },
      { timeout: 1000 }
    )
  })
})
