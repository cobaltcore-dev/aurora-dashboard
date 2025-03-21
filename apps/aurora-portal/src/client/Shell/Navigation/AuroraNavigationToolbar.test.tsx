import { render, screen, fireEvent } from "@testing-library/react"
import { Router } from "wouter"
import { describe, it, expect } from "vitest"
import { AuroraNavigationToolbar } from "./AuroraNavigationToolbar"
import { Project } from "../../../server/Project/types/models"
import { AuroraProvider } from "../AuroraProvider"
import { memoryLocation } from "wouter/memory-location"
import { createRoutePaths } from "../../routes/AuroraRoutes"

describe("AuroraNavigationToolbar", () => {
  const domain = { id: "default", name: "Default Domain" }
  const project: Project = {
    id: "project-1",
    name: "Project Alpha",
    description: "Test project",
    domain_id: "default",
    enabled: true,
    links: { self: "https://example.com/project-1" },
  }
  const auroraRoutes = createRoutePaths().auroraRoutePaths()

  it("renders the logo and 'Aurora' text", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home })
    render(
      <Router hook={hook}>
        <AuroraProvider>
          <AuroraNavigationToolbar scopedDomain={undefined} scopedProject={null} />
        </AuroraProvider>
      </Router>
    )

    expect(screen.getByTitle("Aurora")).toBeInTheDocument()
    expect(screen.getByText("Aurora")).toBeInTheDocument()
  })

  it("displays the domain name if provided", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home })
    render(
      <Router hook={hook}>
        <AuroraProvider>
          <AuroraNavigationToolbar scopedDomain={domain} scopedProject={null} />
        </AuroraProvider>
      </Router>
    )

    expect(screen.getByText(domain.name)).toBeInTheDocument()
  })

  it("displays the project name if provided", () => {
    const { hook } = memoryLocation({ path: auroraRoutes.home })
    render(
      <Router hook={hook}>
        <AuroraProvider>
          <AuroraNavigationToolbar scopedDomain={domain} scopedProject={project} />
        </AuroraProvider>
      </Router>
    )

    expect(screen.getByText(project.name)).toBeInTheDocument()
  })

  it("navigates to '/' and resets project when clicking the logo", () => {
    const { hook, history } = memoryLocation({ path: auroraRoutes.domain(domain.id).projects, record: true })
    render(
      <Router hook={hook}>
        <AuroraProvider>
          <AuroraNavigationToolbar scopedDomain={domain} scopedProject={project} />
        </AuroraProvider>
      </Router>
    )

    const logoLink = screen.getByTitle("Aurora").closest("a")
    fireEvent.click(logoLink!)

    expect(history).toContain("/")
  })

  it("navigates to '/projects' when clicking the domain name", () => {
    const { hook, history } = memoryLocation({ path: auroraRoutes.home, record: true })
    render(
      <Router hook={hook}>
        <AuroraProvider>
          <AuroraNavigationToolbar scopedDomain={domain} scopedProject={null} />
        </AuroraProvider>
      </Router>
    )

    const domainLink = screen.getByText(domain.name).closest("a")
    fireEvent.click(domainLink!)

    expect(history).toContain("/projects")
  })
})
