import { render, screen, fireEvent } from "@testing-library/react"
import { ProjectCardView } from "./ProjectCardView"
import { memoryLocation } from "wouter/memory-location"
import { Router } from "wouter"
import { createRoutePaths } from "../../routes/AuroraRoutes"

// Define a test project
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
const auroraRoutes = createRoutePaths().auroraRoutePaths()
describe("ProjectCardView", () => {
  test("renders project data correctly", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home, static: true })
    const domain = { id: "default", name: "Default" }

    render(
      <Router hook={hook}>
        <ProjectCardView projects={projects} domain={domain} />
      </Router>
    )

    expect(screen.getByText("Security Group")).toBeInTheDocument()
    expect(screen.getByText("Manages security compliance and access control.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Security Group" })).toHaveAttribute(
      "href",
      "/default/projects/89ac3f/compute"
    )
  })

  test("clicking the title does NOT trigger navigation", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home, static: true })
    const domain = { id: "default", name: "Default" }

    render(
      <Router hook={hook}>
        <ProjectCardView projects={projects} domain={domain} />
      </Router>
    )

    const title = screen.getByRole("link", { name: "Security Group" })
    fireEvent.click(title)

    expect(history).toHaveLength(1) // Should NOT change location
  })

  test("clicking the popup menu does NOT trigger navigation", () => {
    const { hook, history } = memoryLocation({ path: auroraRoutes.home, record: true })
    const domain = { id: "default", name: "Default" }

    render(
      <Router hook={hook}>
        <ProjectCardView projects={projects} domain={domain} />
      </Router>
    )

    const popupButton = screen.getByTestId("project-card-menu")
    fireEvent.click(popupButton)

    expect(history).toHaveLength(1) // Should NOT change location
  })

  test("clicking the card navigates correctly", () => {
    const { hook, history } = memoryLocation({ path: auroraRoutes.home, record: true })
    const domain = { id: "default", name: "Default" }

    render(
      <Router hook={hook}>
        <ProjectCardView projects={projects} domain={domain} />
      </Router>
    )

    const card = screen.getByText("Security Group").closest("div")
    fireEvent.click(card!)

    expect(history).toContain("/projects/89ac3f/compute") // Navigation should work
  })
})
