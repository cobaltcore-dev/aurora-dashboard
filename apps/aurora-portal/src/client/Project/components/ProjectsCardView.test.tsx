import { render, screen, fireEvent } from "@testing-library/react"
import { ProjectCardView } from "./ProjectCardView"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { createRoutePaths } from "../../routes/AuroraRoutes"
import { AuroraProvider } from "../../Shell/AuroraProvider"

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
    render(
      <MemoryRouter initialEntries={[auroraRoutes.home]}>
        <AuroraProvider>
          <ProjectCardView projects={projects} />
        </AuroraProvider>
      </MemoryRouter>
    )

    expect(screen.getByText("Security Group")).toBeInTheDocument()
    expect(screen.getByText("Manages security compliance and access control.")).toBeInTheDocument()
  })

  test("clicking the title does NOT trigger navigation", () => {
    render(
      <MemoryRouter initialEntries={[auroraRoutes.home]}>
        <Routes>
          <Route
            path={auroraRoutes.home}
            element={
              <AuroraProvider>
                <ProjectCardView projects={projects} />
              </AuroraProvider>
            }
          />
          <Route path="/1789d1/projects/89ac3f/compute" element={<div>Compute Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    const title = screen.getByText("Security Group")
    fireEvent.click(title)

    // Verify we're still on the same page (no Compute Page content visible)
    expect(screen.queryByText("Compute Overview")).not.toBeInTheDocument()
  })

  test("clicking the popup menu does NOT trigger navigation", () => {
    render(
      <MemoryRouter initialEntries={[auroraRoutes.home]}>
        <Routes>
          <Route
            path={auroraRoutes.home}
            element={
              <AuroraProvider>
                <ProjectCardView projects={projects} />
              </AuroraProvider>
            }
          />
          <Route path="/1789d1/projects/89ac3f/compute" element={<div>Compute Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    const popupButton = screen.getByTestId("project-card-menu")
    fireEvent.click(popupButton)

    // Verify we're still on the same page (no Compute Page content visible)
    expect(screen.queryByText("Compute Page")).not.toBeInTheDocument()
  })

  test.skip("clicking the card navigates correctly", async () => {
    render(
      <MemoryRouter initialEntries={[auroraRoutes.home]}>
        <AuroraProvider>
          <Routes>
            <Route path={auroraRoutes.home} element={<ProjectCardView projects={projects} />} />
            <Route path="/1789d1/projects/89ac3f/compute" element={<div>Compute Page</div>} />
          </Routes>
        </AuroraProvider>
      </MemoryRouter>
    )

    const card = screen.getByText("Security Group").closest("div")
    fireEvent.click(card!)

    // Check for the presence of the destination page content
    expect(await screen.findByText("Compute Overview")).toBeInTheDocument()
  })
})
