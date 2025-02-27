import { render, screen, fireEvent } from "@testing-library/react"
import { ProjectListView } from "./ProjectListView"
import { memoryLocation } from "wouter/memory-location"
import { Router } from "wouter"

// Define test projects
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
    const { hook } = memoryLocation({ path: "/", static: true })

    render(
      <Router hook={hook}>
        <ProjectListView projects={undefined} />
      </Router>
    )

    expect(screen.getByText(/no projects found/i)).toBeInTheDocument()
  })

  test("renders project data correctly", () => {
    const { hook } = memoryLocation({ path: "/", static: true })

    render(
      <Router hook={hook}>
        <ProjectListView projects={projects} />
      </Router>
    )

    expect(screen.getByText("Security Group")).toBeInTheDocument()
    expect(screen.getByText("Manages security compliance and access control.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Security Group" })).toHaveAttribute("href", "/projects/89ac3f/compute")
  })

  test("clicking the title does trigger navigation", () => {
    const { hook, history } = memoryLocation({ path: "/", record: true })

    render(
      <Router hook={hook}>
        <ProjectListView projects={projects} />
      </Router>
    )

    const title = screen.getByRole("link", { name: "Security Group" })
    fireEvent.click(title)

    expect(history).toHaveLength(2) // Location should change
  })

  test("clicking the popup menu does NOT trigger navigation", () => {
    const { hook, history } = memoryLocation({ path: "/", record: true })

    render(
      <Router hook={hook}>
        <ProjectListView projects={projects} />
      </Router>
    )

    const popupButton = screen.getByTestId("project-card-menu")
    fireEvent.click(popupButton)

    expect(history).toHaveLength(1) // Location should not change
  })

  test("clicking the row navigates correctly", () => {
    const { hook, history } = memoryLocation({ path: "/", record: true })

    render(
      <Router hook={hook}>
        <ProjectListView projects={projects} />
      </Router>
    )

    const row = screen.getByText("Security Group").closest("div")
    fireEvent.click(row!)

    expect(history).toContain("/projects/89ac3f/compute") // Navigation should work
  })
})
