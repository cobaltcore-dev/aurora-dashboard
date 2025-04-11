import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SubNavigation } from "./SubNavigation"
import { Route, createMemoryRouter, RouterProvider, createRoutesFromElements } from "react-router-dom"

describe("SubNavigation", () => {
  test("renders Welcome item on home route", async () => {
    const routes = createRoutesFromElements(<Route path="/" element={<SubNavigation />} />)

    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    })

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Wellcome")).toBeInTheDocument()
    })
  })

  test("renders About item on about route", async () => {
    const routes = createRoutesFromElements(<Route path="/about" element={<SubNavigation />} />)

    const router = createMemoryRouter(routes, {
      initialEntries: ["/about"],
    })

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("About")).toBeInTheDocument()
    })
  })

  test("renders project-specific items when on a project route", async () => {
    const domainId = "domain-1"
    const projectId = "project-1"
    const projectPath = `/accounts/${domainId}/projects/${projectId}/compute`

    const routes = createRoutesFromElements(
      <Route
        path="/accounts/:domain/projects/:project/compute"
        element={<SubNavigation />}
        loader={async ({ params }) => {
          // Mock loader that returns domain and project from params
          return {
            domain: { id: params.domain },
            project: { id: params.project },
          }
        }}
      />
    )

    const router = createMemoryRouter(routes, {
      initialEntries: [projectPath],
    })

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Compute")).toBeInTheDocument()
      expect(screen.getByText("Network")).toBeInTheDocument()
      expect(screen.getByText("Storage")).toBeInTheDocument()
      expect(screen.getByText("Metrics")).toBeInTheDocument()
    })
  })

  test("renders Overview item on domain projects route", async () => {
    const domainId = "domain-1"
    const domainPath = `/accounts/${domainId}/projects`

    const routes = createRoutesFromElements(
      <Route
        path="/accounts/:domain/projects"
        element={<SubNavigation />}
        loader={async ({ params }) => {
          // Mock loader that returns domain from params
          return {
            domain: { id: params.domain },
            project: null,
          }
        }}
      />
    )

    const router = createMemoryRouter(routes, {
      initialEntries: [domainPath],
    })

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument()
    })
  })

  test("applies correct active styles to current route", async () => {
    const domainId = "domain-1"
    const projectId = "project-1"
    const projectPath = `/accounts/${domainId}/projects/${projectId}/compute`

    const routes = createRoutesFromElements(
      <Route
        path="/accounts/:domain/projects/:project/compute"
        element={<SubNavigation />}
        loader={async ({ params }) => {
          return {
            domain: { id: params.domain },
            project: { id: params.project },
          }
        }}
      />
    )

    const router = createMemoryRouter(routes, {
      initialEntries: [projectPath],
    })

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      const computeLink = screen.getByText("Compute").closest("a")
      expect(computeLink).toHaveClass("relative px-3 py-2 transition-colors active")

      const computeText = screen.getByText("Compute")
      expect(computeText).toHaveClass("font-semibold text-theme-accent")

      // Check that the active indicator is present for Compute
      const activeIndicator = computeLink?.querySelector(".absolute.left-0.bottom-0")
      expect(activeIndicator).toBeInTheDocument()
    })
  })

  test("navigates to different project tab when clicked", async () => {
    const domainId = "domain-1"
    const projectId = "project-1"
    const computePath = `/accounts/${domainId}/projects/${projectId}/compute`

    const routes = createRoutesFromElements(
      <>
        <Route
          path="/accounts/:domain/projects/:project/compute"
          element={<SubNavigation />}
          loader={async ({ params }) => {
            return {
              domain: { id: params.domain },
              project: { id: params.project },
            }
          }}
        />
        <Route
          path="/accounts/:domain/projects/:project/storage"
          element={
            <>
              <SubNavigation />
              <div>Storage Page</div>
            </>
          }
          loader={async ({ params }) => {
            return {
              domain: { id: params.domain },
              project: { id: params.project },
            }
          }}
        />
      </>
    )

    const router = createMemoryRouter(routes, {
      initialEntries: [computePath],
    })

    render(<RouterProvider router={router} />)

    await waitFor(async () => {
      const storageLink = screen.getByText("Storage").closest("a")
      await fireEvent.click(storageLink!)

      // Should find the Storage Page content
      expect(await screen.findByText("Storage Page")).toBeInTheDocument()

      // Check that the Storage link now has the active class
      const storageLinkAfterClick = screen.getByText("Storage").closest("a")
      expect(storageLinkAfterClick).toHaveClass("active")
    })
  })

  test("hover effect is applied to navigation items", async () => {
    const routes = createRoutesFromElements(<Route path="/" element={<SubNavigation />} />)

    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    })

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      const welcomeLink = screen.getByText("Wellcome").closest("div")
      expect(welcomeLink).toHaveClass("hover:bg-juno-grey-blue-1")
    })
  })
})
