import { render, screen, fireEvent } from "@testing-library/react"
import { Router } from "wouter"
import { MainNavigation } from "./MainNavigation"
import { AuthProvider } from "../AuthProvider"
import { AuroraProvider } from "../AuroraProvider"

const mainNavItems = [
  { route: "/", label: "Home" },
  { route: "/about", label: "About" },
]

// Helper function to wrap components with AuthProvider & Router
const renderWithAuth = (ui: React.ReactNode) => {
  return render(
    <AuthProvider>
      <AuroraProvider>
        <Router>{ui}</Router>
      </AuroraProvider>
    </AuthProvider>
  )
}

describe("MainNavigation", () => {
  test("renders MainNavigation with items", () => {
    renderWithAuth(<MainNavigation items={mainNavItems} scopedDomain={undefined} />)
    expect(screen.getByText("Aurora")).toBeInTheDocument()
  })

  test("clicking a MainNavigation item updates the route", () => {
    renderWithAuth(<MainNavigation items={mainNavItems} scopedDomain={undefined} />)

    const aboutLink = screen.getByText("About")
    fireEvent.click(aboutLink)

    expect(aboutLink).toHaveClass("text-sap-grey-2 hover:text-sap-grey-2 font-medium")
  })
})
