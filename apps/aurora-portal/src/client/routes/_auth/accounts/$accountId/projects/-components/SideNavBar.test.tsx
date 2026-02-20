import { render, screen, fireEvent } from "@testing-library/react"
import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest"
import { SideNavBar } from "./SideNavBar"
import { PortalProvider } from "@cloudoperators/juno-ui-components/index"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

const mockNavigate = vi.fn()
const mockLocation = {
  pathname: "/accounts/acc-1/projects/proj-1/compute",
  search: "",
  hash: "",
  href: "/accounts/acc-1/projects/proj-1/compute",
  state: {},
}

// Mock the router hooks before importing the component
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}))

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </PortalProvider>
)

describe("SideNavBar", () => {
  const defaultProps = {
    accountId: "acc-1",
    projectId: "proj-1",
    availableServices: [
      { type: "compute", name: "nova" },
      { type: "image", name: "glance" },
      { type: "object-store", name: "swift" },
    ],
  }

  beforeAll(async () => {
    i18n.activate("en")
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.pathname = "/accounts/acc-1/projects/proj-1/compute"
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

    it("renders Overview link in Compute section after expanding", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} />
        </TestingProvider>
      )

      // Click to expand Compute section
      const computeSection = screen.getByText("Compute")
      fireEvent.click(computeSection)

      expect(screen.getByText("Overview")).toBeInTheDocument()
    })

    it("renders Images link when glance service is available", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} />
        </TestingProvider>
      )

      // Expand Compute section
      const computeSection = screen.getByText("Compute")
      fireEvent.click(computeSection)

      expect(screen.getByText("Images")).toBeInTheDocument()
    })

    it("does not render Images link when glance service is unavailable", () => {
      const propsWithoutGlance = {
        ...defaultProps,
        availableServices: [{ type: "compute", name: "nova" }],
      }

      render(
        <TestingProvider>
          <SideNavBar {...propsWithoutGlance} />
        </TestingProvider>
      )

      // Expand Compute section
      const computeSection = screen.getByText("Compute")
      fireEvent.click(computeSection)

      expect(screen.queryByText("Images")).not.toBeInTheDocument()
    })

    it("renders Flavors link when nova service is available", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} />
        </TestingProvider>
      )

      // Expand Compute section
      const computeSection = screen.getByText("Compute")
      fireEvent.click(computeSection)

      expect(screen.getByText("Flavors")).toBeInTheDocument()
    })

    it("does not render Flavors link when nova service is unavailable", () => {
      const propsWithoutNova = {
        ...defaultProps,
        availableServices: [{ type: "image", name: "glance" }],
      }

      render(
        <TestingProvider>
          <SideNavBar {...propsWithoutNova} />
        </TestingProvider>
      )

      // Expand Compute section if it exists (should bc images)
      const computeSection = screen.queryByText("Compute")
      if (computeSection) {
        fireEvent.click(computeSection)
      }

      expect(screen.queryByText("Flavors")).not.toBeInTheDocument()
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

      it("renders Object Storage link when swift service is available", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        // Expand Storage section
        const storageSection = screen.getByText("Storage")
        fireEvent.click(storageSection)

        expect(screen.getByText("Object Storage Swift")).toBeInTheDocument()
      })

      it("does not render Storage section when swift service is unavailable", () => {
        const propsWithoutSwift = {
          ...defaultProps,
          availableServices: [
            { type: "compute", name: "nova" },
            { type: "image", name: "glance" },
          ],
        }

        render(
          <TestingProvider>
            <SideNavBar {...propsWithoutSwift} />
          </TestingProvider>
        )

        expect(screen.queryByText("Storage")).not.toBeInTheDocument()
      })
    })

    describe("Navigation Behavior", () => {
      it("calls navigate with correct path when Flavors link is clicked", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        // Expand Compute section
        const computeSection = screen.getByText("Compute")
        fireEvent.click(computeSection)

        const flavorsLink = screen.getByText("Flavors")
        fireEvent.click(flavorsLink)

        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/accounts/acc-1/projects/proj-1/compute/flavors",
        })
      })

      it("calls navigate with correct path when Images link is clicked", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        // Expand Compute section
        const computeSection = screen.getByText("Compute")
        fireEvent.click(computeSection)

        const imagesLink = screen.getByText("Images")
        fireEvent.click(imagesLink)

        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/accounts/acc-1/projects/proj-1/compute/images",
        })
      })

      it("calls navigate with correct path when Object Storage link is clicked", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        // Expand Storage section
        const storageSection = screen.getByText("Storage")
        fireEvent.click(storageSection)

        const objectStorageLink = screen.getByText("Object Storage Swift")
        fireEvent.click(objectStorageLink)

        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/accounts/acc-1/projects/proj-1/storage/swift",
        })
      })

      it("calls navigate with correct path when Compute Overview is clicked", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        // Expand Compute section
        const computeSection = screen.getByText("Compute")
        fireEvent.click(computeSection)

        const overviewLink = screen.getByText("Overview")
        fireEvent.click(overviewLink)

        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/accounts/acc-1/projects/proj-1/compute",
        })
      })
    })

    describe("Active State", () => {
      it("marks current path as selected", () => {
        mockLocation.pathname = "/accounts/acc-1/projects/proj-1/compute/flavors"

        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        // Expand Compute section
        const computeSection = screen.getByText("Compute")
        fireEvent.click(computeSection)

        // sting in div in span, in button with "selected class"
        const flavorsLink = screen.getByText("Flavors").closest("button")

        expect(flavorsLink).toBeInTheDocument()
        expect(flavorsLink).toHaveClass("selected")
      })
    })

    describe("Edge Cases", () => {
      it("renders correctly with empty availableServices array", () => {
        const propsWithNoServices = {
          ...defaultProps,
          availableServices: [],
        }

        render(
          <TestingProvider>
            <SideNavBar {...propsWithNoServices} />
          </TestingProvider>
        )

        // Compute Overview is currently always added.
        expect(screen.queryByText("Compute")).toBeInTheDocument()
        expect(screen.queryByText("Storage")).not.toBeInTheDocument()
      })

      it("handles malformed service data gracefully", () => {
        const propsWithMalformedServices = {
          ...defaultProps,
          availableServices: [
            { type: "", name: "" },
            { type: "unknown", name: "unknown" },
          ],
        }

        expect(() => {
          render(
            <TestingProvider>
              <SideNavBar {...propsWithMalformedServices} />
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
