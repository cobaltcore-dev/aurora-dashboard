import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MainNavigation } from "./MainNavigation"
import { Project } from "../../../../server/Project/types/models"
import { Domain } from "../../../../server/Authentication/types/models"
import { createMemoryRouter, RouterProvider, createRoutesFromElements, Route } from "react-router-dom"

const mainNavItems = [
  { route: "/", label: "Home" },
  { route: "/about", label: "About" },
]

// Mocked Domain & Project Data
const mockDomain: Domain = {
  id: "default",
  name: "Default Domain",
  // Add other required properties based on your Domain type
}

const mockProject: Project = {
  id: "project-1",
  name: "Project Alpha",
  description: "Test project",
  domain_id: "default",
  enabled: true,
  links: { self: "https://example.com/project-1" },
}

describe("MainNavigation", () => {
  test("renders MainNavigation with items", async () => {
    const routes = createRoutesFromElements(
      <Route
        path="/"
        element={<MainNavigation items={mainNavItems} />}
        loader={async () => ({ domain: undefined, project: undefined })}
      />
    )

    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    })

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Aurora")).toBeInTheDocument()
    })
  })

  test("clicking a MainNavigation item updates the route", async () => {
    const routes = createRoutesFromElements(
      <>
        <Route
          path="/"
          element={<MainNavigation items={mainNavItems} />}
          loader={async () => ({ domain: undefined, project: undefined })}
        />
        <Route path="/about" element={<div>About Page Content</div>} />
      </>
    )

    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    })

    render(<RouterProvider router={router} />)

    await waitFor(async () => {
      const aboutLink = screen.getByText("About")
      await fireEvent.click(aboutLink)

      // Now we should expect to see the content of the About page
      expect(await screen.findByText("About Page Content")).toBeInTheDocument()
    })
  })

  describe("Domain Navigation links", () => {
    it("displays the domain name if provided", async () => {
      const routes = createRoutesFromElements(
        <Route
          path="/"
          element={<MainNavigation items={mainNavItems} />}
          loader={async () => ({ domain: mockDomain, project: undefined })}
        />
      )

      const router = createMemoryRouter(routes, {
        initialEntries: ["/"],
      })

      render(<RouterProvider router={router} />)

      await waitFor(async () => {
        expect(await screen.getByText("Aurora")).toBeInTheDocument()
        expect(await screen.getByText(mockDomain.name!)).toBeInTheDocument()
      })
    })

    it("displays the domain and the project name if provided", async () => {
      const routes = createRoutesFromElements(
        <Route
          path="/"
          element={<MainNavigation items={mainNavItems} />}
          loader={async () => ({ domain: mockDomain, project: mockProject })}
        />
      )

      const router = createMemoryRouter(routes, {
        initialEntries: ["/"],
      })

      render(<RouterProvider router={router} />)

      await waitFor(async () => {
        expect(await screen.getByText("Aurora")).toBeInTheDocument()
        expect(await screen.getByText(mockDomain.name!)).toBeInTheDocument()
        expect(await screen.getByText(mockProject.name)).toBeInTheDocument()
      })
    })

    it("navigates to '/accounts/:domain/projects' when clicking the domain name", async () => {
      const projectsPath = `/accounts/${mockDomain.id}/projects`

      const routes = createRoutesFromElements(
        <>
          <Route
            path="/"
            element={<MainNavigation items={mainNavItems} />}
            loader={async () => ({ domain: mockDomain, project: mockProject })}
          />
          <Route path={projectsPath} element={<div>Projects Page</div>} />
        </>
      )

      const router = createMemoryRouter(routes, {
        initialEntries: ["/"],
      })

      render(<RouterProvider router={router} />)

      await waitFor(async () => {
        const domainLink = await screen.getByTestId("domain-link")
        await fireEvent.click(domainLink)
        // Now we should expect to see the Projects page content
        expect(await screen.findByText("Projects Page")).toBeInTheDocument()
      })
    })
  })
})
