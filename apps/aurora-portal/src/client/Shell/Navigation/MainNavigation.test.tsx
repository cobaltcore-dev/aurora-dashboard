import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MainNavigation } from "./MainNavigation"
import { Project } from "../../../server/Project/types/models"
import { Domain } from "../../../server/Authentication/types/models"
import { createRoutesStub } from "react-router"

const mainNavItems = [
  { route: "/", label: "Home" },
  { route: "/about", label: "About" },
]

// // Mocked Domain & Project Data
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
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => <MainNavigation items={mainNavItems} />,
        loader: () => ({ domain: undefined, project: undefined }),
      },
    ])

    render(<Stub initialEntries={["/"]} />)

    await waitFor(() => {
      expect(screen.getByText("Aurora")).toBeInTheDocument()
    })
  })
  test("clicking a MainNavigation item updates the route", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => <MainNavigation items={mainNavItems} />,
        loader: () => ({ domain: undefined, project: undefined }),
      },
      {
        path: "/about",
        Component: () => <div>About Page Content</div>,
      },
    ])

    render(<Stub initialEntries={["/"]} />)
    await waitFor(async () => {
      const aboutLink = screen.getByText("About")
      await fireEvent.click(aboutLink)

      // Now we should expect to see the content of the About page
      expect(await screen.findByText("About Page Content")).toBeInTheDocument()
    })
  })

  describe("Domain Navigation links", () => {
    it("displays the domain name if provided", async () => {
      const Stub = createRoutesStub([
        {
          path: "/",
          Component: () => <MainNavigation items={mainNavItems} />,
          loader: () => ({ domain: mockDomain, project: undefined }),
        },
      ])
      render(<Stub initialEntries={["/"]} />)
      await waitFor(async () => {
        expect(await screen.getByText("Aurora")).toBeInTheDocument()
        expect(await screen.getByText(mockDomain.name!)).toBeInTheDocument()
      })
    })
    it("displays the domain and the project name if provided", async () => {
      const Stub = createRoutesStub([
        {
          path: "/",
          Component: () => <MainNavigation items={mainNavItems} />,
          loader: () => ({ domain: mockDomain, project: mockProject }),
        },
      ])
      render(<Stub initialEntries={["/"]} />)
      await waitFor(async () => {
        expect(await screen.getByText("Aurora")).toBeInTheDocument()
        expect(await screen.getByText(mockDomain.name!)).toBeInTheDocument()
        expect(await screen.getByText(mockProject.name)).toBeInTheDocument()
      })
    })

    it("navigates to '/accounts/:domain/projects' when clicking the domain name", async () => {
      const projectsPath = `/accounts/${mockDomain.id}/projects`
      const Stub = createRoutesStub([
        {
          path: `/`,
          Component: () => <MainNavigation items={mainNavItems} />,
          loader: () => ({ domain: mockDomain, project: mockProject }),
        },
        {
          path: projectsPath,
          Component: () => <div>Projects Page</div>,
        },
      ])
      render(<Stub initialEntries={[`/`]} />)
      await waitFor(async () => {
        const domainLink = await screen.getByTestId("domain-link")
        await fireEvent.click(domainLink)
        // Now we should expect to see the Projects page content
        expect(await screen.findByText("Projects Page")).toBeInTheDocument()
      })
    })
  })
})
