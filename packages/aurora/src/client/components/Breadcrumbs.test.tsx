import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react"
import { Breadcrumbs } from "./Breadcrumbs"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"
import { BreadcrumbExtensionProvider } from "@/client/context/BreadcrumbExtensionContext"
import { DynamicBreadcrumbProvider } from "@/client/context/DynamicBreadcrumbContext"
import { usePushBreadcrumbs } from "@/client/hooks/usePushBreadcrumbs"
import type { BreadcrumbItem } from "@/client/hooks/useBreadcrumbs"

const mockNavigate = vi.fn()
let mockMatches: {
  routeId: string
  staticData?: Record<string, unknown>
  params?: Record<string, string>
  pathname?: string
}[] = []

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useMatches: () => mockMatches,
  useParams: () => ({ projectId: "test-project" }),
}))

const AUTH_ROUTE_ID = "/_auth"
const PROJECT_ROUTE_ID = "/_auth/projects/$projectId"

const homeMatch = {
  routeId: AUTH_ROUTE_ID,
  staticData: { crumb: { icon: "home", to: "/projects" } },
  pathname: "/",
}

const projectMatch = {
  routeId: PROJECT_ROUTE_ID,
  staticData: { crumb: { text: "my-domain.com/My Project" } },
  pathname: "/projects/test-project",
}

const Wrapper = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>
      <DynamicBreadcrumbProvider>
        <BreadcrumbExtensionProvider>{children}</BreadcrumbExtensionProvider>
      </DynamicBreadcrumbProvider>
    </I18nProvider>
  </PortalProvider>
)

describe("Breadcrumbs", () => {
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
    it("renders home and project crumbs", async () => {
      mockMatches = [homeMatch, projectMatch]
      render(<Breadcrumbs />, { wrapper: Wrapper })
      await waitFor(() => {
        expect(screen.getByText("my-domain.com/My Project")).toBeInTheDocument()
      })
    })

    it("renders project name only when domain not in crumb text", async () => {
      mockMatches = [homeMatch, { ...projectMatch, staticData: { crumb: { text: "My Project" } } }]
      render(<Breadcrumbs />, { wrapper: Wrapper })
      await waitFor(() => {
        expect(screen.getByText("My Project")).toBeInTheDocument()
        expect(screen.queryByText("my-domain.com")).not.toBeInTheDocument()
      })
    })
  })

  describe("Breadcrumbs — service list pages", () => {
    it("renders home > project > Images on images list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images`,
          staticData: { section: "compute", service: "images", crumb: { text: "Images" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/compute/images",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images/`,
          staticData: { section: "compute", service: "images", analytics: { name: "compute.images.list" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/compute/images/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("my-domain.com/My Project")).toBeInTheDocument()
        expect(screen.queryByText("Compute")).not.toBeInTheDocument()
        expect(screen.getByText("Images")).toBeInTheDocument()
      })
    })

    it("renders Flavors on flavors list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/flavors`,
          staticData: { section: "compute", service: "flavors", crumb: { text: "Flavors" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/compute/flavors",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/flavors/`,
          staticData: { section: "compute", service: "flavors", analytics: { name: "compute.flavors.list" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/compute/flavors/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Flavors")).toBeInTheDocument()
      })
    })

    it("renders Security Groups on securitygroups list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups`,
          staticData: { section: "network", service: "securitygroups", crumb: { text: "Security Groups" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/network/securitygroups",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups/`,
          staticData: {
            section: "network",
            service: "securitygroups",
            analytics: { name: "network.securitygroups.list" },
          },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/network/securitygroups/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.queryByText("Network")).not.toBeInTheDocument()
        expect(screen.getByText("Security Groups")).toBeInTheDocument()
      })
    })

    it("renders Object Storage (Swift) on swift containers list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/storage/$provider/$storageType`,
          staticData: { section: "storage", service: "containers", crumb: { text: "Object Storage (Swift)" } },
          params: { projectId: "test-project", provider: "swift", storageType: "containers" },
          pathname: "/projects/test-project/storage/swift/containers",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/storage/$provider/$storageType/`,
          staticData: { section: "storage", service: "containers", analytics: { name: "storage.objectstore.list" } },
          params: { projectId: "test-project", provider: "swift", storageType: "containers" },
          pathname: "/projects/test-project/storage/swift/containers/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.queryByText("Storage")).not.toBeInTheDocument()
        expect(screen.getByText("Object Storage (Swift)")).toBeInTheDocument()
      })
    })

    it("renders Object Storage (Ceph) on ceph containers list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/storage/$provider/$storageType`,
          staticData: { section: "storage", service: "containers", crumb: { text: "Object Storage (Ceph)" } },
          params: { projectId: "test-project", provider: "ceph", storageType: "buckets" },
          pathname: "/projects/test-project/storage/ceph/buckets",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/storage/$provider/$storageType/`,
          staticData: { section: "storage", service: "containers", analytics: { name: "storage.objectstore.list" } },
          params: { projectId: "test-project", provider: "ceph", storageType: "buckets" },
          pathname: "/projects/test-project/storage/ceph/buckets/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.queryByText("Storage")).not.toBeInTheDocument()
        expect(screen.getByText("Object Storage (Ceph)")).toBeInTheDocument()
      })
    })

    it("renders Floating IPs on floatingips list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/network/floatingips`,
          staticData: { section: "network", service: "floatingips", crumb: { text: "Floating IPs" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/network/floatingips",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/floatingips/`,
          staticData: { section: "network", service: "floatingips", analytics: { name: "network.floatingips.list" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/network/floatingips/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Floating IPs")).toBeInTheDocument()
      })
    })
  })

  describe("Breadcrumbs — detail pages", () => {
    it("renders project > Images > detail name on image detail", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images`,
          staticData: { section: "compute", service: "images", crumb: { text: "Images" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/compute/images",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images/$imageId`,
          staticData: { section: "compute", service: "images", crumb: { text: "Test Image Name" } },
          params: { projectId: "test-project", imageId: "img-1" },
          pathname: "/projects/test-project/compute/images/img-1",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.queryByText("Compute")).not.toBeInTheDocument()
        expect(screen.getByText("Images")).toBeInTheDocument()
        expect(screen.getByText("Test Image Name")).toBeInTheDocument()
      })
    })

    it("renders Flavors > detail name on flavor detail", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/flavors`,
          staticData: { section: "compute", service: "flavors", crumb: { text: "Flavors" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/compute/flavors",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/flavors/$flavorId`,
          staticData: { section: "compute", service: "flavors", crumb: { text: "Test Flavor Name" } },
          params: { projectId: "test-project", flavorId: "flavor-1" },
          pathname: "/projects/test-project/compute/flavors/flavor-1",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Flavors")).toBeInTheDocument()
        expect(screen.getByText("Test Flavor Name")).toBeInTheDocument()
      })
    })

    it("renders Security Groups > detail name on security group detail", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups`,
          staticData: { section: "network", service: "securitygroups", crumb: { text: "Security Groups" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/network/securitygroups",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups/$securityGroupId/`,
          staticData: { section: "network", service: "securitygroups", crumb: { text: "Test SG Name" } },
          params: { projectId: "test-project", securityGroupId: "sg-1" },
          pathname: "/projects/test-project/network/securitygroups/sg-1/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Security Groups")).toBeInTheDocument()
        expect(screen.getByText("Test SG Name")).toBeInTheDocument()
      })
    })

    it("renders Floating IPs > detail name on floating IP detail", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/network/floatingips`,
          staticData: { section: "network", service: "floatingips", crumb: { text: "Floating IPs" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/network/floatingips",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/floatingips/$floatingIpId/`,
          staticData: { section: "network", service: "floatingips", crumb: { text: "1.2.3.4" } },
          params: { projectId: "test-project", floatingIpId: "fip-1" },
          pathname: "/projects/test-project/network/floatingips/fip-1/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByText("Floating IPs")).toBeInTheDocument()
        expect(screen.getByText("1.2.3.4")).toBeInTheDocument()
      })
    })

    it("renders Object Storage (Swift) > container name on object browser", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/storage/$provider/$storageType`,
          staticData: { section: "storage", service: "containers", crumb: { text: "Object Storage (Swift)" } },
          params: { projectId: "test-project", provider: "swift", storageType: "containers" },
          pathname: "/projects/test-project/storage/swift/containers",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/storage/$provider/$storageType/$containerName/objects/`,
          staticData: { section: "storage", service: "containers", crumb: { text: "my-bucket" } },
          params: {
            projectId: "test-project",
            provider: "swift",
            storageType: "containers",
            containerName: "my-bucket",
          },
          pathname: "/projects/test-project/storage/swift/containers/my-bucket/objects/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.queryByText("Storage")).not.toBeInTheDocument()
        expect(screen.getByText("Object Storage (Swift)")).toBeInTheDocument()
        expect(screen.getByText("my-bucket")).toBeInTheDocument()
      })
    })
  })

  describe("Breadcrumb navigation", () => {
    it("clicking Images breadcrumb on image detail navigates to images list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images`,
          staticData: { section: "compute", service: "images", crumb: { text: "Images" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/compute/images",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images/$imageId`,
          staticData: { section: "compute", service: "images", crumb: { text: "My Image" } },
          params: { projectId: "test-project", imageId: "img-1" },
          pathname: "/projects/test-project/compute/images/img-1",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Images"))
      fireEvent.click(screen.getByText("Images"))

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/projects/test-project/compute/images" })
      )
    })

    it("clicking Flavors breadcrumb on flavor detail navigates to flavors list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/flavors`,
          staticData: { section: "compute", service: "flavors", crumb: { text: "Flavors" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/compute/flavors",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/flavors/$flavorId`,
          staticData: { section: "compute", service: "flavors", crumb: { text: "My Flavor" } },
          params: { projectId: "test-project", flavorId: "flavor-1" },
          pathname: "/projects/test-project/compute/flavors/flavor-1",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Flavors"))
      fireEvent.click(screen.getByText("Flavors"))

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/projects/test-project/compute/flavors" })
      )
    })

    it("clicking Security Groups breadcrumb on detail navigates to securitygroups list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups`,
          staticData: { section: "network", service: "securitygroups", crumb: { text: "Security Groups" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/network/securitygroups",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/securitygroups/$securityGroupId/`,
          staticData: { section: "network", service: "securitygroups", crumb: { text: "My SG" } },
          params: { projectId: "test-project", securityGroupId: "sg-1" },
          pathname: "/projects/test-project/network/securitygroups/sg-1/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Security Groups"))
      fireEvent.click(screen.getByText("Security Groups"))

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/projects/test-project/network/securitygroups" })
      )
    })

    it("clicking Floating IPs breadcrumb on detail navigates to floatingips list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/network/floatingips`,
          staticData: { section: "network", service: "floatingips", crumb: { text: "Floating IPs" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/network/floatingips",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/network/floatingips/$floatingIpId/`,
          staticData: { section: "network", service: "floatingips", crumb: { text: "1.2.3.4" } },
          params: { projectId: "test-project", floatingIpId: "fip-1" },
          pathname: "/projects/test-project/network/floatingips/fip-1/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Floating IPs"))
      fireEvent.click(screen.getByText("Floating IPs"))

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/projects/test-project/network/floatingips" })
      )
    })

    it("clicking Object Storage (Swift) breadcrumb on object browser navigates to containers list", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/storage/$provider/$storageType`,
          staticData: { section: "storage", service: "containers", crumb: { text: "Object Storage (Swift)" } },
          params: { projectId: "test-project", provider: "swift", storageType: "containers" },
          pathname: "/projects/test-project/storage/swift/containers",
        },
        {
          routeId: `${PROJECT_ROUTE_ID}/storage/$provider/$storageType/$containerName/objects/`,
          staticData: { section: "storage", service: "containers", crumb: { text: "my-bucket" } },
          params: {
            projectId: "test-project",
            provider: "swift",
            storageType: "containers",
            containerName: "my-bucket",
          },
          pathname: "/projects/test-project/storage/swift/containers/my-bucket/objects/",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("Object Storage (Swift)"))
      fireEvent.click(screen.getByText("Object Storage (Swift)"))

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/projects/test-project/storage/swift/containers" })
      )
    })

    it("clicking project crumb navigates to project overview", async () => {
      mockMatches = [
        homeMatch,
        projectMatch,
        {
          routeId: `${PROJECT_ROUTE_ID}/compute/images`,
          staticData: { section: "compute", service: "images", crumb: { text: "Images" } },
          params: { projectId: "test-project" },
          pathname: "/projects/test-project/compute/images",
        },
      ]

      render(<Breadcrumbs />, { wrapper: Wrapper })

      await waitFor(() => screen.getByText("my-domain.com/My Project"))
      fireEvent.click(screen.getByText("my-domain.com/My Project"))

      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/projects/test-project" }))
    })
  })

  describe("Extension crumbs", () => {
    function PushCrumbs({ crumbs }: { crumbs: BreadcrumbItem[] }) {
      usePushBreadcrumbs(crumbs)
      return null
    }

    it("appends extension crumbs after the OSS trail", async () => {
      mockMatches = [homeMatch, projectMatch]
      render(
        <Wrapper>
          <PushCrumbs
            crumbs={[
              { label: "CA List", active: false },
              { label: "cert-abc", active: true },
            ]}
          />
          <Breadcrumbs />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText("CA List")).toBeInTheDocument()
        expect(screen.getByText("cert-abc")).toBeInTheDocument()
      })
    })

    it("deactivates the last OSS crumb when extension crumbs are present", async () => {
      mockMatches = [homeMatch, projectMatch]
      render(
        <Wrapper>
          <PushCrumbs crumbs={[{ label: "CA List", active: true }]} />
          <Breadcrumbs />
        </Wrapper>
      )

      await waitFor(() => screen.getByText("my-domain.com/My Project"))

      // project crumb is no longer the active leaf — it should be rendered as a link
      const projectCrumb = screen.getByText("my-domain.com/My Project").closest("[data-active]")
      expect(projectCrumb).toBeNull()
    })

    it("clicking deactivated last OSS crumb navigates to the project", async () => {
      mockMatches = [homeMatch, projectMatch]
      render(
        <Wrapper>
          <PushCrumbs crumbs={[{ label: "CA List", active: true }]} />
          <Breadcrumbs />
        </Wrapper>
      )

      await waitFor(() => screen.getByText("my-domain.com/My Project"))
      fireEvent.click(screen.getByText("my-domain.com/My Project"))

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/projects/$projectId", params: { projectId: "test-project" } })
      )
    })
  })
})
