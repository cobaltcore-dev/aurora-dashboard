import { render, screen, fireEvent } from "@testing-library/react"
import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest"
import { SideNavBar } from "./SideNavBar"
import { PortalProvider } from "@cloudoperators/juno-ui-components/index"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

const mockNavigate = vi.fn()
let mockMatches: { staticData?: Record<string, unknown> }[] = []

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useMatches: () => mockMatches,
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
      const propsWithoutGlance = {
        ...defaultProps,
        availableServices: [{ type: "compute", name: "nova" }],
      }

      render(
        <TestingProvider>
          <SideNavBar {...propsWithoutGlance} />
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
      const propsWithoutNova = {
        ...defaultProps,
        availableServices: [{ type: "image", name: "glance" }],
      }

      render(
        <TestingProvider>
          <SideNavBar {...propsWithoutNova} />
        </TestingProvider>
      )

      expect(screen.queryByText("Flavors")).not.toBeInTheDocument()
    })

    it("navigates to compute overview when Compute header is clicked", () => {
      render(
        <TestingProvider>
          <SideNavBar {...defaultProps} />
        </TestingProvider>
      )

      expect(screen.getByText("Images")).toBeInTheDocument()

      fireEvent.click(screen.getByText("Compute"))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/compute/overview",
        params: { projectId: "proj-1" },
      })
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

      it("renders Swift link when swift service is available (open by default)", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        expect(screen.getByText("Swift")).toBeInTheDocument()
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

      it("calls navigate with correct params when Compute header is clicked", () => {
        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        fireEvent.click(screen.getByText("Compute"))

        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/projects/$projectId/compute/overview",
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
        expect(imagesLink).toHaveClass("selected")
      })

      it("marks Images as selected on image detail page", () => {
        mockMatches = [{ staticData: { section: "compute", service: "images", isDetail: true } }]

        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        const imagesLink = screen.getByText("Images").closest("button")
        expect(imagesLink).toHaveClass("selected")
      })

      it("marks Flavors as selected when on flavors route", () => {
        mockMatches = [{ staticData: { section: "compute", service: "flavors" } }]

        render(
          <TestingProvider>
            <SideNavBar {...defaultProps} />
          </TestingProvider>
        )

        const flavorsLink = screen.getByText("Flavors").closest("button")
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
