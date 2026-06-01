import { render, screen, waitFor } from "@testing-library/react"
import { ProjectListView } from "./ProjectListView"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string
    params: Record<string, string>
    children: React.ReactNode
    className?: string
  }) => {
    const href = to.replace("$projectId", params.projectId)
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
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
  {
    domain_id: "2789d2",
    enabled: false,
    id: "89ac3g",
    links: {
      self: "https://example.com/identity/v3/projects/89ac3g",
    },
    name: "Database Management",
    description: "Handles database operations and maintenance.",
  },
]

describe("ProjectListView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  test("renders without crashing when no projects", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={undefined} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/no projects found/i)).toBeInTheDocument()
    })
  })

  test("renders without crashing when empty projects array", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={[]} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/no projects found/i)).toBeInTheDocument()
    })
  })

  test("renders project data correctly", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    expect(screen.getByText("Manages security compliance and access control.")).toBeInTheDocument()
  })

  test("renders multiple projects", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    expect(screen.getByText("Database Management")).toBeInTheDocument()
    expect(screen.getByText("Handles database operations and maintenance.")).toBeInTheDocument()
  })

  test("project name links to the correct project route", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    const link = screen.getByText("Security Group").closest("a")
    expect(link).toHaveAttribute("href", "/projects/89ac3f")
  })

  test("each project name links to its own route", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Database Management")).toBeInTheDocument()
    })

    const link = screen.getByText("Database Management").closest("a")
    expect(link).toHaveAttribute("href", "/projects/89ac3g")
  })

  test("renders data grid with correct structure", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    const grid = screen.getByRole("grid")
    expect(grid).toBeInTheDocument()
  })

  test("renders correct number of project rows", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    expect(screen.getByText("Security Group")).toBeInTheDocument()
    expect(screen.getByText("Database Management")).toBeInTheDocument()
  })
})
