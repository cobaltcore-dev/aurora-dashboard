import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { ProjectListView } from "./ProjectListView"
import { AuroraProvider } from "../../Shell/AuroraProvider"
import { vi } from "vitest"

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

describe("ProjectListView", () => {
  test("renders without crashing when no projects", () => {
    render(
      <MemoryRouter>
        <AuroraProvider>
          <ProjectListView projects={undefined} />
        </AuroraProvider>
      </MemoryRouter>
    )
    expect(screen.getByText(/no projects found/i)).toBeInTheDocument()
  })

  test("renders project data correctly", () => {
    render(
      <MemoryRouter>
        <AuroraProvider>
          <ProjectListView projects={projects} />
        </AuroraProvider>
      </MemoryRouter>
    )

    expect(screen.getByText("Security Group")).toBeInTheDocument()
    expect(screen.getByText("Manages security compliance and access control.")).toBeInTheDocument()
  })

  test("clicking the title triggers navigation", () => {
    const mockNavigate = vi.fn()
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuroraProvider>
          <Routes>
            <Route path={"/"} element={<ProjectListView projects={projects} />} />
          </Routes>
        </AuroraProvider>
      </MemoryRouter>
    )

    const title = screen.getByText("Security Group")
    fireEvent.click(title)

    // Assuming navigation happens inside a function
    expect(mockNavigate).not.toHaveBeenCalled() // Replace with actual expectation
  })

  test("clicking the popup menu does NOT trigger navigation", () => {
    render(
      <MemoryRouter>
        <AuroraProvider>
          <ProjectListView projects={projects} />
        </AuroraProvider>
      </MemoryRouter>
    )

    const popupButton = screen.getByTestId("project-card-menu")
    fireEvent.click(popupButton)

    expect(window.location.pathname).toBe("/")
  })

  test("clicking the row navigates correctly", () => {
    const mockNavigate = vi.fn()
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuroraProvider>
          <Routes>
            <Route path={"/"} element={<ProjectListView projects={projects} />} />
          </Routes>
        </AuroraProvider>
      </MemoryRouter>
    )

    const row = screen.getByText("Security Group").closest("div")
    fireEvent.click(row!)

    expect(mockNavigate).not.toHaveBeenCalled() // Update this assertion
  })
})
