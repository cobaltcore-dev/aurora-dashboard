import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { MainNavigation } from "./MainNavigation"
import { AuroraContext, AuroraContextType } from "../AuroraProvider"
import { createRoutePaths } from "../../routes/AuroraRoutes"
import { Project } from "../../../server/Project/types/models"
import { vi } from "vitest"

const mainNavItems = [
  { route: "/", label: "Home" },
  { route: "/about", label: "About" },
]

const auroraRoutes = createRoutePaths().auroraRoutePaths()

// Mocked Domain & Project Data
const mockDomain = { id: "default", name: "Default Domain" }
const mockProject: Project = {
  id: "project-1",
  name: "Project Alpha",
  description: "Test project",
  domain_id: "default",
  enabled: true,
  links: { self: "https://example.com/project-1" },
}

// Helper function to wrap components with a mocked AuroraContext
const renderWithContext = (ui: React.ReactNode, contextValue: AuroraContextType) => {
  return render(
    <AuroraContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={[auroraRoutes.home]}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/about" element={<div>About Page Content</div>} />
          <Route path={auroraRoutes.domain(mockDomain.id).projects} element={<div>Projects Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuroraContext.Provider>
  )
}

describe("MainNavigation", () => {
  test("renders MainNavigation with items", () => {
    const contextValue = {
      currentScope: undefined,
      setCurrentScope: vi.fn(),
      domain: mockDomain,
      auroraRoutes,
      setAuroraRoutes: vi.fn(),
      setDomain: vi.fn(),
    }

    renderWithContext(<MainNavigation items={mainNavItems} />, contextValue)
    expect(screen.getByText("Aurora")).toBeInTheDocument()
  })

  test("clicking a MainNavigation item updates the route", async () => {
    const contextValue = {
      currentScope: undefined,
      setCurrentScope: vi.fn(),
      domain: mockDomain,
      auroraRoutes,
      setAuroraRoutes: vi.fn(),
      setDomain: vi.fn(),
    }

    renderWithContext(<MainNavigation items={mainNavItems} />, contextValue)

    const aboutLink = screen.getByText("About")
    fireEvent.click(aboutLink)

    // Now we should expect to see the content of the About page
    expect(await screen.findByText("About Page Content")).toBeInTheDocument()
  })

  describe("Domain Navigation links", () => {
    it("renders the logo and 'Aurora' text", () => {
      const contextValue = {
        currentScope: undefined,
        setCurrentScope: vi.fn(),
        domain: mockDomain,
        auroraRoutes,
        setAuroraRoutes: vi.fn(),
        setDomain: vi.fn(),
      }

      renderWithContext(<MainNavigation items={mainNavItems} />, contextValue)

      expect(screen.getByTitle("Aurora")).toBeInTheDocument()
      expect(screen.getByText("Aurora")).toBeInTheDocument()
    })

    it("displays the domain name if provided", () => {
      const contextValue = {
        currentScope: undefined,
        setCurrentScope: vi.fn(),
        domain: mockDomain,
        auroraRoutes,
        setAuroraRoutes: vi.fn(),
        setDomain: vi.fn(),
      }

      renderWithContext(<MainNavigation items={mainNavItems} />, contextValue)
      expect(screen.getByText(mockDomain.name)).toBeInTheDocument()
    })

    it("displays the project name if provided", () => {
      const contextValue = {
        currentScope: { scope: { project: mockProject, domain: mockDomain } },
        setCurrentScope: vi.fn(),
        domain: mockDomain,
        auroraRoutes,
        setAuroraRoutes: vi.fn(),
        setDomain: vi.fn(),
      }

      renderWithContext(<MainNavigation items={mainNavItems} />, contextValue)
      expect(screen.getByText(mockProject.name)).toBeInTheDocument()
    })

    it("navigates to '/projects' when clicking the domain name", async () => {
      const contextValue = {
        currentScope: { scope: { project: mockProject, domain: mockDomain } },
        setCurrentScope: vi.fn(),
        domain: mockDomain,
        auroraRoutes,
        setAuroraRoutes: vi.fn(),
        setDomain: vi.fn(),
      }

      renderWithContext(<MainNavigation items={mainNavItems} />, contextValue)

      const domainLink = screen.getByTestId("domain-link").closest("a")
      fireEvent.click(domainLink!)

      // Now we should expect to see the Projects page content
      expect(await screen.findByText("Projects Page")).toBeInTheDocument()
    })
  })
})
