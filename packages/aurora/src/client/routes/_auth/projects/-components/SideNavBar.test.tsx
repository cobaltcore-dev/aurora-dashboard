import { render, screen, fireEvent } from "@testing-library/react"
import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest"
import { SideNavBar } from "./SideNavBar"
import { buildNavSections } from "./buildNavSections"
import { PortalProvider } from "@cloudoperators/juno-ui-components/index"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

const mockNavigate = vi.fn()
let mockMatches: { staticData?: Record<string, unknown> }[] = []

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useMatches: () => mockMatches,
  useParams: () => ({}),
  useRouteContext: () => ({ slots: undefined }),
}))

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </PortalProvider>
)

const ALL_SERVICES = [
  { type: "compute", name: "nova" },
  { type: "image", name: "glance" },
  { type: "object-store", name: "swift" },
]

describe("SideNavBar", () => {
  const defaultProps = {
    projectId: "proj-1",
    projectName: "Test Project",
    domainName: "Test Domain",
    sections: buildNavSections("proj-1", ALL_SERVICES),
  }

  beforeAll(async () => {
    i18n.load({ en: {} })
    i18n.activate("en")
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockMatches = []
  })

  describe("Compute Navigation", () => {
    it("renders Compute section when compute services are available", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} />
        </TestingProvider>
      )

      expect(screen.getByText("Compute")).toBeInTheDocument()
    })

    it("renders Compute header", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} />
        </TestingProvider>
      )

      expect(screen.getByText("Compute")).toBeInTheDocument()
    })

    it("renders Images link when glance service is available", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} />
        </TestingProvider>
      )
      expect(screen.getByText("Images")).toBeInTheDocument()
    })

    it("does not render Images link when glance service is unavailable", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} sections={buildNavSections("proj-1", [{ type: "compute", name: "nova" }])} />
        </TestingProvider>
      )

      expect(screen.queryByText("Images")).not.toBeInTheDocument()
    })

    it("renders Flavors link when nova service is available", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} />
        </TestingProvider>
      )
      expect(screen.getByText("Flavors")).toBeInTheDocument()
    })

    it("does not render Flavors link when nova service is unavailable", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} sections={buildNavSections("proj-1", [{ type: "image", name: "glance" }])} />
        </TestingProvider>
      )

      expect(screen.queryByText("Flavors")).not.toBeInTheDocument()
    })

    it("toggles compute section open/closed when Compute header is clicked", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} />
        </TestingProvider>
      )

      expect(screen.getByText("Images")).toBeInTheDocument()

      fireEvent.click(screen.getByText("Compute"))
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(screen.queryByText("Images")).not.toBeInTheDocument()

      fireEvent.click(screen.getByText("Compute"))
      expect(screen.getByText("Images")).toBeInTheDocument()
    })

    describe("Storage Navigation", () => {
      it("renders Storage section when storage services are available", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        expect(screen.getByText("Storage")).toBeInTheDocument()
      })

      it("renders Swift link when swift service is available", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )
        expect(screen.getByText("Object Storage (Swift)")).toBeInTheDocument()
      })

      it("renders Storage section with Ceph even when swift service is unavailable", () => {
        render(
          <TestingProvider>
            <SideNavBar
              {...defaultProps}
              sections={buildNavSections("proj-1", [
                { type: "compute", name: "nova" },
                { type: "image", name: "glance" },
              ])}
            />
          </TestingProvider>
        )
        expect(screen.queryByText("Storage")).toBeInTheDocument()
        expect(screen.queryByText("Object Storage (Ceph)")).toBeInTheDocument()
        expect(screen.queryByText("Object Storage (Swift)")).not.toBeInTheDocument()
      })
    })

    describe("Navigation Behavior", () => {
      it("calls navigate with correct params when Flavors link is clicked", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )
        fireEvent.click(screen.getByText("Flavors"))

        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/projects/$projectId/compute/flavors",
          params: { projectId: "proj-1" },
        })
      })

      it("calls navigate with correct params when Images link is clicked", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )
        fireEvent.click(screen.getByText("Images"))

        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/projects/$projectId/compute/images",
          params: { projectId: "proj-1" },
        })
      })

      it("does not navigate when Compute header is clicked (toggles section instead)", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        fireEvent.click(screen.getByText("Compute"))

        expect(mockNavigate).not.toHaveBeenCalled()
      })
    })

    describe("Context Block", () => {
      it("renders domain with trailing slash and project name on separate line", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )
        expect(screen.getByText("Test Domain /")).toBeInTheDocument()
        expect(screen.getByText("Test Project")).toBeInTheDocument()
      })

      it("omits domain line when domainName is not provided", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} domainName={undefined} />
          </TestingProvider>
        )
        expect(screen.queryByText("Test Domain /")).not.toBeInTheDocument()
        expect(screen.getByText("Test Project")).toBeInTheDocument()
      })

      it("navigates to project overview when context block is clicked", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )
        fireEvent.click(screen.getByText("Test Project"))
        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/projects/$projectId",
          params: { projectId: "proj-1" },
        })
      })
    })

    describe("Active State", () => {
      it("marks Images as selected when on images route", () => {
        mockMatches = [{ staticData: { section: "compute", service: "images" } }]

        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        const imagesLink = screen.getByText("Images").closest("button")
        expect(imagesLink).toBeInTheDocument()
        expect(imagesLink).toHaveClass("juno-sidenavigation-item-selected")
      })

      it("marks Images as selected on image detail page", () => {
        mockMatches = [{ staticData: { section: "compute", service: "images", isDetail: true } }]

        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        const imagesLink = screen.getByText("Images").closest("button")
        expect(imagesLink).toHaveClass("juno-sidenavigation-item-selected")
      })

      it("marks Flavors as selected when on flavors route", () => {
        mockMatches = [{ staticData: { section: "compute", service: "flavors" } }]

        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        const flavorsLink = screen.getByText("Flavors").closest("button")
        expect(flavorsLink).toHaveClass("juno-sidenavigation-item-selected")
      })
    })

    describe("Edge Cases", () => {
      it("renders correctly with empty availableServices array", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} sections={buildNavSections("proj-1", [])} />
          </TestingProvider>
        )

        expect(screen.queryByText("Compute")).toBeInTheDocument()
        expect(screen.queryByText("Storage")).toBeInTheDocument()
        expect(screen.queryByText("Object Storage (Ceph)")).toBeInTheDocument()
      })

      it("handles malformed service data gracefully", () => {
        expect(() => {
          render(
            <TestingProvider>
              <SideNavBar
                {...defaultProps}
                sections={buildNavSections("proj-1", [
                  { type: "", name: "" },
                  { type: "unknown", name: "unknown" },
                ])}
              />
            </TestingProvider>
          )
        }).not.toThrow()
      })

      it("renders both Compute and Storage sections when both are available", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        expect(screen.getByText("Compute")).toBeInTheDocument()
        expect(screen.getByText("Storage")).toBeInTheDocument()
      })
    })
  })
})
