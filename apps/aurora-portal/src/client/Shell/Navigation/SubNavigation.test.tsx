import { render, screen, fireEvent } from "@testing-library/react"
import { BaseLocationHook, Router } from "wouter"
import { SubNavigation } from "./SubNavigation"
import { AuroraContext, AuroraContextType } from "../AuroraProvider"
import { memoryLocation } from "wouter/memory-location"
import { createRoutePaths } from "../../routes/AuroraRoutes"

const auroraRoutes = createRoutePaths().auroraRoutePaths()

const renderWithAuth = (ui: React.ReactNode, hook: BaseLocationHook, contextValue: AuroraContextType) => {
  return render(
    <AuroraContext.Provider value={contextValue}>
      <Router hook={hook}>{ui}</Router>
    </AuroraContext.Provider>
  )
}

describe("SubNavigation", () => {
  test("renders correct navigation items based on route", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home })
    const contextValue = { currentScope: { scope: {} }, auroraRoutes } as AuroraContextType

    renderWithAuth(<SubNavigation />, hook, contextValue)
    expect(screen.getByText("Wellcome")).toBeInTheDocument()
  })

  test("renders project-specific items when projectId is set", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.domain("domain-1").project("project-1").compute.root })
    const contextValue = {
      currentScope: { scope: { project: { id: "project-1" }, domain: { id: "domain-1" } } },
      auroraRoutes,
    } as AuroraContextType

    renderWithAuth(<SubNavigation />, hook, contextValue)
    expect(screen.getByText("Compute")).toBeInTheDocument()
    expect(screen.getByText("Network")).toBeInTheDocument()
    expect(screen.getByText("Storage")).toBeInTheDocument()
    expect(screen.getByText("Metrics")).toBeInTheDocument()
  })

  test("applies correct active styles", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home })
    const contextValue = { currentScope: { scope: {} }, auroraRoutes } as AuroraContextType

    renderWithAuth(<SubNavigation />, hook, contextValue)
    const activeLink = screen.getByText("Wellcome").closest("a")
    expect(activeLink).toHaveClass("relative px-3 py-2 transition-colors active")
  })

  test("hover effect is applied correctly", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home })
    const contextValue = { currentScope: { scope: {} }, auroraRoutes } as AuroraContextType

    renderWithAuth(<SubNavigation />, hook, contextValue)
    const wellcomeLink = screen.getByText("Wellcome").closest("a")

    fireEvent.mouseOver(wellcomeLink!)
    expect(wellcomeLink?.firstChild).toHaveClass("hover:bg-juno-grey-blue-1")
  })

  test("clicking a navigation item updates the route", () => {
    const { hook, history } = memoryLocation({ path: auroraRoutes.about, record: true })
    const contextValue = { currentScope: { scope: {} }, auroraRoutes } as AuroraContextType

    renderWithAuth(<SubNavigation />, hook, contextValue)
    const aboutLink = screen.getByText("About").closest("a")
    fireEvent.click(aboutLink!)

    expect(history).toContain(auroraRoutes.about)
  })
})
