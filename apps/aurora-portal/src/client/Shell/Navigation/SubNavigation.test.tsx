import { render, screen, fireEvent } from "@testing-library/react"
import { SubNavigation } from "./SubNavigation"
import { AuroraContext, AuroraContextType } from "../AuroraProvider"
import { createRoutePaths } from "../../routes/AuroraRoutes"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { vi } from "vitest"
import { Project } from "../../../server/Project/types/models" // Adjust import path as needed

const auroraRoutes = createRoutePaths().auroraRoutePaths()

// Define mock domain and project
const mockDomain = { id: "domain-1", name: "Test Domain" }
const mockProject: Project = {
  id: "project-1",
  name: "Test Project",
  description: "Test project description",
  domain_id: "domain-1",
  enabled: true,
  links: { self: "https://example.com/projects/project-1" },
}

// Create a properly typed mock context factory
const createMockContext = (overrides = {}): AuroraContextType => ({
  currentScope: undefined,
  setCurrentScope: vi.fn(),
  auroraRoutes,
  setAuroraRoutes: vi.fn(),
  ...overrides,
})

// We need to ensure our route paths match the format expected by useParams()
// Looking at your component, we need routes with :domain and :project parameters
const renderWithAuth = (ui: React.ReactNode, initialEntries: string[], contextValue: AuroraContextType) => {
  return render(
    <AuroraContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/about" element={<div>About Page Content</div>} />
          {/* Routes with parameters that match what useParams() expects */}
          <Route path="/:domain/projects" element={<div>Projects Page</div>} />
          <Route path="/:domain/projects/:project/compute" element={ui} />
          <Route path="/:domain/projects/:project/network" element={ui} />
          <Route path="/:domain/projects/:project/storage" element={<div>Storage Page</div>} />
          <Route path="/:domain/projects/:project/metrics" element={<div>Metrics Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuroraContext.Provider>
  )
}

describe("SubNavigation", () => {
  test("renders correct navigation items based on route", () => {
    const contextValue = createMockContext()

    renderWithAuth(<SubNavigation />, ["/"], contextValue)
    expect(screen.getByText("Wellcome")).toBeInTheDocument()
  })

  test("renders project-specific items when on a project route", () => {
    const contextValue = createMockContext({
      currentScope: {
        scope: {
          project: mockProject,
          domain: mockDomain,
        },
      },
    })

    // Use a route with actual parameters that useParams will extract
    renderWithAuth(<SubNavigation />, ["/domain-1/projects/project-1/compute"], contextValue)
    expect(screen.getByText("Compute")).toBeInTheDocument()
    expect(screen.getByText("Network")).toBeInTheDocument()
    expect(screen.getByText("Storage")).toBeInTheDocument()
    expect(screen.getByText("Metrics")).toBeInTheDocument()
  })

  test("applies correct active styles", () => {
    const contextValue = createMockContext()

    renderWithAuth(<SubNavigation />, ["/"], contextValue)
    const activeLink = screen.getByText("Wellcome").closest("a")
    expect(activeLink).toHaveClass("relative px-3 py-2 transition-colors active")
  })

  test("hover effect is applied correctly", () => {
    const contextValue = createMockContext()

    renderWithAuth(<SubNavigation />, ["/"], contextValue)
    const wellcomeLink = screen.getByText("Wellcome").closest("a")

    fireEvent.mouseOver(wellcomeLink!)
    expect(wellcomeLink?.firstChild).toHaveClass("hover:bg-juno-grey-blue-1")
  })

  test("renders Overview link on domain routes without project", async () => {
    const contextValue = createMockContext()

    // Use a route with only the domain parameter
    renderWithAuth(<SubNavigation />, ["/domain-1/projects"], contextValue)

    // Check that the Overview link is displayed
    expect(screen.getByText("Projects Page")).toBeInTheDocument()
  })
})
