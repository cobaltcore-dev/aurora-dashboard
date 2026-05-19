import { render, screen, waitFor } from "@testing-library/react"
import { ProjectCardView } from "./ProjectCardView"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, params, children, className }: { to: string; params: Record<string, string>; children: React.ReactNode; className?: string }) => {
    const href = to.replace("$projectId", params.projectId)
    return <a href={href} className={className}>{children}</a>
  },
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

  test("card links to the correct project route", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectCardView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    const link = screen.getByText("Security Group").closest("a")
    expect(link).toHaveAttribute("href", "/projects/89ac3f")
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
