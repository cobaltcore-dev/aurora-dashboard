import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import { ProjectInfoBox } from "./ProjectInfoBox"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactElement } from "react"
import { createRoute, createRootRoute, RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useRouteContext: vi.fn(() => ({
      pageTitle: "Test Page Title",
      pageTitleRef: { current: "Test Page Title" },
    })),
  }
})

const createTestRouter = (Component: ReactElement) => {
  const memoryHistory = createMemoryHistory({
    initialEntries: ["/accounts/test-account/projects/test-project/compute/"],
  })

  const rootRoute = createRootRoute({
    component: () => (
      <PortalProvider>
        <I18nProvider i18n={i18n}>{Component}</I18nProvider>
      </PortalProvider>
    ),
  })

  const accountsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "accounts/$accountId",
  })

  const projectsRoute = createRoute({
    getParentRoute: () => accountsRoute,
    path: "projects/$projectId",
  })

  const computeRoute = createRoute({
    getParentRoute: () => projectsRoute,
    path: "compute",
  })

  const routeTree = rootRoute.addChildren([accountsRoute.addChildren([projectsRoute.addChildren([computeRoute])])])

  return createRouter({ routeTree, history: memoryHistory })
}

describe("ProjectInfoBox", () => {
  const defaultProps = {
    projectInfo: {
      id: "project-123",
      name: "My Project",
      description: "This is a description.",
      domain: {
        name: "my-domain.com",
      },
    },
  }

  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders project ID", async () => {
      render(<RouterProvider router={createTestRouter(<ProjectInfoBox {...defaultProps} />)} />)

      await waitFor(() => {
        expect(screen.getByText(/Project ID:/)).toBeInTheDocument()
        expect(screen.getByText(/project-123/)).toBeInTheDocument()
      })
    })

    it("renders project name in breadcrumb", async () => {
      render(<RouterProvider router={createTestRouter(<ProjectInfoBox {...defaultProps} />)} />)

      await waitFor(() => {
        expect(screen.getByText("My Project")).toBeInTheDocument()
      })
    })

    it("renders domain name in breadcrumb if available", async () => {
      render(<RouterProvider router={createTestRouter(<ProjectInfoBox {...defaultProps} />)} />)

      await waitFor(() => {
        expect(screen.getByText("my-domain.com")).toBeInTheDocument()
      })
    })

    it("does not render domain name in breadcrumb if not available", async () => {
      const propsWithoutDomain = {
        ...defaultProps,
        projectInfo: {
          ...defaultProps.projectInfo,
          domain: undefined,
        },
      }

      render(<RouterProvider router={createTestRouter(<ProjectInfoBox {...propsWithoutDomain} />)} />)

      await waitFor(() => {
        expect(screen.getByText(/project-123/)).toBeInTheDocument()
      })
      expect(screen.queryByText("my-domain.com")).not.toBeInTheDocument()
    })
  })
})
