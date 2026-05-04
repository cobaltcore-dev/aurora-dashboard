import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ProjectListView } from "./ProjectListView"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
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

  test("renders enabled project with checkmark icon", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={[projects[0]]} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    // Check for checkCircle icon (enabled status)
    const checkCircleIcon = screen.getByRole("img", { hidden: true, name: /checkCircle/i })
    expect(checkCircleIcon).toBeInTheDocument()
  })

  test("renders disabled project with info icon", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={[projects[1]]} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Database Management")).toBeInTheDocument()
    })

    // Check for info icon (disabled status)
    const infoIcon = screen.getByRole("img", { hidden: true, name: /info/i })
    expect(infoIcon).toBeInTheDocument()
  })

  test("clicking the row triggers navigation", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeInTheDocument()
    })

    // Get the row by finding the project name cell and getting its parent row
    const projectCell = screen.getByText("Security Group")
    const row = projectCell.closest("[role='row']")

    expect(row).not.toBeNull()
    fireEvent.click(row!)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1)
    })

    // Verify navigation path
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId: "89ac3f" },
    })
  })

  test("clicking different rows navigates to correct projects", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectListView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Database Management")).toBeInTheDocument()
    })

    // Click the second project row
    const projectCell = screen.getByText("Database Management")
    const row = projectCell.closest("[role='row']")

    expect(row).not.toBeNull()
    fireEvent.click(row!)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
    })

    // Verify navigation to the second project
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId: "89ac3g" },
    })
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

    // Verify the grid is rendered
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

    // Check that both project names are present (2 projects)
    const securityGroup = screen.getByText("Security Group")
    const databaseManagement = screen.getByText("Database Management")

    expect(securityGroup).toBeInTheDocument()
    expect(databaseManagement).toBeInTheDocument()
  })
})
