import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react"
import { ProjectInfoBox } from "./ProjectInfoBox"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"

const mockNavigate = vi.fn()
let mockMatches: { routeId: string; staticData?: Record<string, unknown> }[] = []

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useMatches: () => mockMatches,
  useParams: () => ({ accountId: "test-account", projectId: "test-project" }),
  useRouteContext: vi.fn(() => ({
    pageTitle: "Test Page Title",
    pageTitleRef: { current: "Test Page Title" },
  })),
}))

const PROJECT_ROUTE_ID = "/_auth/accounts/$accountId/projects/$projectId"

const defaultProjectInfo = {
  id: "project-123",
  name: "My Project",
  description: "A description.",
  domain: { name: "my-domain.com" },
}

const Wrapper = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </PortalProvider>
)

describe("ProjectInfoBox", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockMatches = []
  })

  describe("Rendering", () => {
    it("renders project ID", async () => {
      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })
      await waitFor(() => {
        expect(screen.getByText(/Project ID/)).toBeInTheDocument()
        expect(screen.getByText(/project-123/)).toBeInTheDocument()
      })
    })

    it("renders project name in breadcrumb", async () => {
      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })
      await waitFor(() => {
        expect(screen.getByText("My Project")).toBeInTheDocument()
      })
    })

    it("renders domain name in breadcrumb when available", async () => {
      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })
      await waitFor(() => {
        expect(screen.getByText("my-domain.com")).toBeInTheDocument()
      })
    })

    it("omits domain when not provided", async () => {
      const props = { ...defaultProjectInfo, domain: undefined }
      render(<ProjectInfoBox projectInfo={props} />, { wrapper: Wrapper })
      await waitFor(() => {
        expect(screen.queryByText("my-domain.com")).not.toBeInTheDocument()
      })
    })
  })

  describe("Breadcrumbs — section pages", () => {
    it("shows section as active leaf on a section overview page", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        { routeId: `${PROJECT_ROUTE_ID}/compute/overview`, staticData: { section: "compute", service: "overview" } },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Compute")).toBeInTheDocument()
        expect(screen.queryByText("Images")).not.toBeInTheDocument()
      })
    })

    it("shows Network section as active leaf on network overview", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        { routeId: `${PROJECT_ROUTE_ID}/network/overview`, staticData: { section: "network", service: "overview" } },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Network")).toBeInTheDocument()
      })
    })
  })

  describe("Breadcrumbs — service list pages", () => {
    it("renders domain > project > Compute > Images on images list", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        { routeId: `${PROJECT_ROUTE_ID}/compute/images/`, staticData: { section: "compute", service: "images" } },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("my-domain.com")).toBeInTheDocument()
        expect(screen.getByText("My Project")).toBeInTheDocument()
        expect(screen.getByText("Compute")).toBeInTheDocument()
        expect(screen.getByText("Images")).toBeInTheDocument()
      })
    })

    it("renders Compute > Flavors on flavors list", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        { routeId: `${PROJECT_ROUTE_ID}/compute/flavors/`, staticData: { section: "compute", service: "flavors" } },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Flavors")).toBeInTheDocument()
      })
    })

    it("renders Network > Security Groups on securitygroups list", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups/`,
          staticData: { section: "network", service: "securitygroups" },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Network")).toBeInTheDocument()
        expect(screen.getByText("Security Groups")).toBeInTheDocument()
      })
    })

    it("renders Network > Floating IPs on floatingips list", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/floatingips/`,
          staticData: { section: "network", service: "floatingips" },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Floating IPs")).toBeInTheDocument()
      })
    })
  })

  describe("Breadcrumbs — detail pages", () => {
    it("renders Compute > Images > page title on image detail", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images/$imageId`,
          staticData: { section: "compute", service: "images", isDetail: true },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Compute")).toBeInTheDocument()
        expect(screen.getByText("Images")).toBeInTheDocument()
        // "Test Page Title" appears in both the breadcrumb and the ContentHeading
        expect(screen.getAllByText("Test Page Title").length).toBeGreaterThanOrEqual(1)
      })
    })

    it("renders Compute > Flavors > page title on flavor detail", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/flavors/$flavorId`,
          staticData: { section: "compute", service: "flavors", isDetail: true },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Flavors")).toBeInTheDocument()
        expect(screen.getAllByText("Test Page Title").length).toBeGreaterThanOrEqual(1)
      })
    })

    it("renders Network > Security Groups > page title on security group detail", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups/$id`,
          staticData: { section: "network", service: "securitygroups", isDetail: true },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Security Groups")).toBeInTheDocument()
        expect(screen.getAllByText("Test Page Title").length).toBeGreaterThanOrEqual(1)
      })
    })

    it("renders Network > Floating IPs > page title on floating IP detail", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/floatingips/$id`,
          staticData: { section: "network", service: "floatingips", isDetail: true },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Floating IPs")).toBeInTheDocument()
        expect(screen.getAllByText("Test Page Title").length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe("Breadcrumb navigation", () => {
    it("clicking project name navigates to projects list", async () => {
      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("My Project"))
      fireEvent.click(screen.getByText("My Project"))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/accounts/$accountId/projects",
        params: { accountId: "test-account" },
      })
    })

    it("clicking Compute breadcrumb on a service page navigates to compute overview", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        { routeId: `${PROJECT_ROUTE_ID}/compute/images/`, staticData: { section: "compute", service: "images" } },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Compute"))
      fireEvent.click(screen.getByText("Compute"))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/compute/overview",
        params: { projectId: "test-project" },
      })
    })

    it("clicking Compute breadcrumb on a detail page navigates to compute overview", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images/$imageId`,
          staticData: { section: "compute", service: "images", isDetail: true },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Compute"))
      fireEvent.click(screen.getByText("Compute"))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/compute/overview",
        params: { projectId: "test-project" },
      })
    })

    it("clicking Images breadcrumb on image detail navigates to images list", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images/$imageId`,
          staticData: { section: "compute", service: "images", isDetail: true },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Images"))
      fireEvent.click(screen.getByText("Images"))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/compute/images",
        params: { projectId: "test-project" },
      })
    })

    it("clicking Flavors breadcrumb on flavor detail navigates to flavors list", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/flavors/$flavorId`,
          staticData: { section: "compute", service: "flavors", isDetail: true },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Flavors"))
      fireEvent.click(screen.getByText("Flavors"))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/compute/flavors",
        params: { projectId: "test-project" },
      })
    })

    it("clicking Network breadcrumb on a service page navigates to network overview", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups/`,
          staticData: { section: "network", service: "securitygroups" },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Network"))
      fireEvent.click(screen.getByText("Network"))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/network/overview",
        params: { projectId: "test-project" },
      })
    })

    it("clicking Security Groups breadcrumb on detail navigates to securitygroups list", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups/$id`,
          staticData: { section: "network", service: "securitygroups", isDetail: true },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Security Groups"))
      fireEvent.click(screen.getByText("Security Groups"))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/network/securitygroups",
        params: { projectId: "test-project" },
      })
    })

    it("clicking Floating IPs breadcrumb on detail navigates to floatingips list", async () => {
      mockMatches = [
        { routeId: PROJECT_ROUTE_ID },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/floatingips/$id`,
          staticData: { section: "network", service: "floatingips", isDetail: true },
        },
      ]

      render(<ProjectInfoBox projectInfo={defaultProjectInfo} />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Floating IPs"))
      fireEvent.click(screen.getByText("Floating IPs"))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/network/floatingips",
        params: { projectId: "test-project" },
      })
    })
  })
})
