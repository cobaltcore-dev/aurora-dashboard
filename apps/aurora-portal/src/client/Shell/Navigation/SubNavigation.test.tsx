import { render, screen, fireEvent } from "@testing-library/react"
import { Router } from "wouter"
import { SubNavigation } from "./SubNavigation"
import { NavigationItem } from "./types"
import { AuroraProvider } from "../AuroraProvider"

const subNavItems: NavigationItem[] = [
  { route: "/dashboard", label: "Dashboard" },
  { route: "/settings", label: "Settings" },
]

// Helper function to wrap components with AuthProvider & Router
const renderWithAuth = (ui: React.ReactNode, initialRoute = "/") => {
  window.history.pushState({}, "Test page", initialRoute) // Set initial route
  return render(
    <AuroraProvider>
      <Router>{ui}</Router>
    </AuroraProvider>
  )
}

describe("SubNavigation", () => {
  test("renders SubNavigation items correctly", () => {
    renderWithAuth(<SubNavigation items={subNavItems} />)

    subNavItems.forEach(({ label }) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  test("applies correct styles on hover", () => {
    renderWithAuth(<SubNavigation items={subNavItems} />)

    const dashboardLink = screen.getByText("Dashboard").closest("a") // Get the link element
    expect(dashboardLink).not.toHaveClass("hover:bg-juno-grey-blue-1")

    fireEvent.mouseOver(dashboardLink!) // Simulate hover
    expect(dashboardLink?.firstChild).toHaveClass("hover:bg-juno-grey-blue-1")
  })

  test("clicking a SubNavigation item updates the route and applies bottom border", () => {
    renderWithAuth(<SubNavigation items={subNavItems} />)

    const settingsLink = screen.getByText("Settings").closest("a") as HTMLElement
    fireEvent.click(settingsLink)

    // Ensure active class is applied
    expect(settingsLink.querySelector("span")).toHaveClass("font-semibold text-theme-accent")

    // Ensure bottom border effect is applied
    const bottomBorder = settingsLink.querySelector("div.absolute")
    expect(bottomBorder).toHaveClass("absolute left-0 bottom-0 w-full h-[3px] bg-theme-accent")
  })
})
