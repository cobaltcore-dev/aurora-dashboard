import { render, screen, fireEvent } from "@testing-library/react"
import { BaseLocationHook, Router } from "wouter"
import { MainNavigation } from "./MainNavigation"
import { AuroraContext, AuroraContextType } from "../AuroraProvider"
import { memoryLocation } from "wouter/memory-location"
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

// Helper function to wrap components with a **mocked AuroraContext**
const renderWithContext = (ui: React.ReactNode, hook: BaseLocationHook, contextValue: AuroraContextType) => {
  return render(
    <AuroraContext.Provider value={contextValue}>
      <Router hook={hook}>{ui}</Router>
    </AuroraContext.Provider>
  )
}

describe("MainNavigation", () => {
  test("renders MainNavigation with items", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home })
    const contextValue = {
      currentScope: undefined,
      setCurrentScope: vi.fn(),
      domain: mockDomain,
      auroraRoutes,
      setAuroraRoutes: vi.fn(),
      setDomain: vi.fn(),
    }

    renderWithContext(<MainNavigation items={mainNavItems} />, hook, contextValue)
    expect(screen.getByText("Aurora")).toBeInTheDocument()
  })

  test("clicking a MainNavigation item updates the route", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home })
    const contextValue = {
      currentScope: undefined,
      setCurrentScope: vi.fn(),
      domain: mockDomain,
      auroraRoutes,
      setAuroraRoutes: vi.fn(),
      setDomain: vi.fn(),
    }

    renderWithContext(<MainNavigation items={mainNavItems} />, hook, contextValue)

    const aboutLink = screen.getByText("About")
    fireEvent.click(aboutLink)

    expect(aboutLink).toHaveClass("text-sap-grey-2 hover:text-sap-grey-2 font-medium")
  })

  describe("Domain Navigation links", () => {
    it("renders the logo and 'Aurora' text", () => {
      const { hook } = memoryLocation({ path: auroraRoutes.home })
      const contextValue = {
        currentScope: undefined,
        setCurrentScope: vi.fn(),
        domain: mockDomain,
        auroraRoutes,
        setAuroraRoutes: vi.fn(),
        setDomain: vi.fn(),
      }

      renderWithContext(<MainNavigation items={mainNavItems} />, hook, contextValue)

      expect(screen.getByTitle("Aurora")).toBeInTheDocument()
      expect(screen.getByText("Aurora")).toBeInTheDocument()
    })

    it("displays the domain name if provided", () => {
      const { hook } = memoryLocation({ path: auroraRoutes.home })
      const contextValue = {
        currentScope: undefined,
        setCurrentScope: vi.fn(),
        domain: mockDomain,
        auroraRoutes,
        setAuroraRoutes: vi.fn(),
        setDomain: vi.fn(),
      }

      renderWithContext(<MainNavigation items={mainNavItems} />, hook, contextValue)
      expect(screen.getByText(mockDomain.name)).toBeInTheDocument()
    })

    it("displays the project name if provided", () => {
      const { hook } = memoryLocation({ path: auroraRoutes.home })
      const contextValue = {
        currentScope: { scope: { project: mockProject, domain: mockDomain } },
        setCurrentScope: vi.fn(),
        domain: mockDomain,
        auroraRoutes,
        setAuroraRoutes: vi.fn(),
        setDomain: vi.fn(),
      }

      renderWithContext(<MainNavigation items={mainNavItems} />, hook, contextValue)
      expect(screen.getByText(mockProject.name)).toBeInTheDocument()
    })

    it("navigates to '/projects' when clicking the domain name", () => {
      const { hook, history } = memoryLocation({ path: auroraRoutes.home, record: true })
      const contextValue = {
        currentScope: { scope: { project: mockProject, domain: mockDomain } },
        setCurrentScope: vi.fn(),
        domain: mockDomain,
        auroraRoutes,
        setAuroraRoutes: vi.fn(),
        setDomain: vi.fn(),
      }

      renderWithContext(<MainNavigation items={mainNavItems} />, hook, contextValue)

      const domainLink = screen.getByText(mockDomain.name).closest("a")
      fireEvent.click(domainLink!)

      expect(history).toContain(auroraRoutes.domain(mockDomain.id).projects)
    })
  })
})
