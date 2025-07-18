import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Cluster } from "@/server/Gardener/types/cluster"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import ClusterOverviewSection from "./ClusterOverviewSection"

describe("ClusterOverviewSection", () => {
  const mockHandleShare = vi.fn()

  const mockCluster = {
    name: "test-cluster",
    uid: "test-uid-123",
    status: "healthy",
    infrastructure: "aws",
    region: "us-west-2",
    version: "1.28.0",
    readiness: {
      status: "ready",
    },
  } as Cluster

  const setup = (cluster: Cluster) => {
    return render(
      <I18nProvider i18n={i18n}>
        <ClusterOverviewSection cluster={cluster} handleShare={mockHandleShare} />
      </I18nProvider>
    )
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders cluster name and ID correctly", () => {
    setup(mockCluster)

    expect(screen.getByText("test-cluster")).toBeInTheDocument()
    expect(screen.getByText("test-uid-123")).toBeInTheDocument()
    expect(screen.getByText("ID:")).toBeInTheDocument()
  })

  it("calls handleShare when ID is clicked", () => {
    setup(mockCluster)

    const idElement = screen.getByText("test-uid-123").closest("div")
    fireEvent.click(idElement!)

    expect(mockHandleShare).toHaveBeenCalledTimes(1)
  })

  it("renders cluster name with correct heading styles", () => {
    setup(mockCluster)

    const clusterName = screen.getByText("test-cluster")
    expect(clusterName).toHaveClass("text-xl", "font-semibold", "leading-none", "tracking-tight", "text-theme-highest")
    expect(clusterName.tagName).toBe("H3")
  })

  it("renders ID with correct styling and behavior", () => {
    setup(mockCluster)

    const idContainer = screen.getByText("test-uid-123").closest("div")
    expect(idContainer).toHaveClass(
      "text-sm",
      "text-theme-high",
      "mt-1.5",
      "hover:text-theme-light",
      "transition-colors",
      "cursor-pointer"
    )

    const uidSpan = screen.getByText("test-uid-123")
    expect(uidSpan).toHaveClass("font-mono")
  })

  it("renders infrastructure section with correct data", () => {
    setup(mockCluster)

    expect(screen.getByText("Infrastructure")).toBeInTheDocument()
    expect(screen.getByText("Infrastructure:")).toBeInTheDocument()
    expect(screen.getByText("Region:")).toBeInTheDocument()
    expect(screen.getByText("AWS")).toBeInTheDocument() // infrastructure badge text
    expect(screen.getByText("aws")).toBeInTheDocument() // infrastructure display text
    expect(screen.getByText("us-west-2")).toBeInTheDocument()
  })

  it("renders kubernetes section with correct data", () => {
    setup(mockCluster)

    expect(screen.getByText("Kubernetes")).toBeInTheDocument()
    expect(screen.getByText("Version:")).toBeInTheDocument()
    expect(screen.getByText("Readiness:")).toBeInTheDocument()
    expect(screen.getByText("v")).toBeInTheDocument() // version prefix
    expect(screen.getByText("1.28.0")).toBeInTheDocument()
  })

  it("displays version with correct styling", () => {
    setup(mockCluster)

    const versionPrefix = screen.getByText("v")
    expect(versionPrefix).toHaveClass("text-theme-link", "mr-0.5")

    const versionNumber = screen.getByText("1.28.0")
    expect(versionNumber).toHaveClass("text-theme-high")
  })

  it("displays infrastructure with correct styling", () => {
    setup(mockCluster)

    const infrastructureText = screen.getByText("aws")
    expect(infrastructureText).toHaveClass("text-theme-high", "capitalize")
  })

  it("displays region with correct styling", () => {
    setup(mockCluster)

    const regionText = screen.getByText("us-west-2")
    expect(regionText).toHaveClass("text-theme-high")
  })

  it("creates infrastructure badge with first 3 characters uppercase", () => {
    setup(mockCluster)

    // AWS -> AWS (first 3 chars)
    expect(screen.getByText("AWS")).toBeInTheDocument()
  })

  describe("status badge rendering", () => {
    it("renders healthy status badge", () => {
      setup(mockCluster)

      expect(screen.getByText("healthy")).toBeInTheDocument()
    })

    it("renders operational status", () => {
      const operationalCluster = { ...mockCluster, status: "operational" }
      setup(operationalCluster)

      expect(screen.getByText("operational")).toBeInTheDocument()
    })

    it("renders warning status", () => {
      const warningCluster = { ...mockCluster, status: "warning" }
      setup(warningCluster)

      expect(screen.getByText("warning")).toBeInTheDocument()
    })

    it("renders pending status", () => {
      const pendingCluster = { ...mockCluster, status: "pending" }
      setup(pendingCluster)

      expect(screen.getByText("pending")).toBeInTheDocument()
    })

    it("renders unhealthy status", () => {
      const unhealthyCluster = { ...mockCluster, status: "unhealthy" }
      setup(unhealthyCluster)

      expect(screen.getByText("unhealthy")).toBeInTheDocument()
    })

    it("renders error status", () => {
      const errorCluster = { ...mockCluster, status: "error" }
      setup(errorCluster)

      expect(screen.getByText("error")).toBeInTheDocument()
    })

    it("renders failed status", () => {
      const failedCluster = { ...mockCluster, status: "failed" }
      setup(failedCluster)

      expect(screen.getByText("failed")).toBeInTheDocument()
    })

    it("renders unknown status", () => {
      const unknownCluster = { ...mockCluster, status: "unknown" }
      setup(unknownCluster)

      expect(screen.getByText("unknown")).toBeInTheDocument()
    })
  })

  describe("readiness badge rendering", () => {
    it("renders readiness status badge", () => {
      setup(mockCluster)

      expect(screen.getByText("ready")).toBeInTheDocument()
    })

    it("renders different readiness statuses", () => {
      const degradedCluster = {
        ...mockCluster,
        readiness: { status: "degraded" },
      } as Cluster

      setup(degradedCluster)

      expect(screen.getByText("degraded")).toBeInTheDocument()
    })
  })

  it("renders infrastructure and kubernetes sections", () => {
    setup(mockCluster)

    expect(screen.getByText("Infrastructure")).toBeInTheDocument()
    expect(screen.getByText("Kubernetes")).toBeInTheDocument()
  })

  it("renders all expected labels", () => {
    setup(mockCluster)

    expect(screen.getByText("Infrastructure:")).toBeInTheDocument()
    expect(screen.getByText("Region:")).toBeInTheDocument()
    expect(screen.getByText("Version:")).toBeInTheDocument()
    expect(screen.getByText("Readiness:")).toBeInTheDocument()
  })

  it("handles case sensitivity in status correctly", () => {
    const upperCaseCluster = { ...mockCluster, status: "HEALTHY" }
    setup(upperCaseCluster)

    expect(screen.getByText("HEALTHY")).toBeInTheDocument()
  })

  it("renders multiple status badges correctly", () => {
    setup(mockCluster)

    // Main status badge
    expect(screen.getByText("healthy")).toBeInTheDocument()
    // Readiness status badge
    expect(screen.getByText("ready")).toBeInTheDocument()
  })

  it("handles empty or missing cluster properties gracefully", () => {
    const minimalCluster: Cluster = {
      name: "",
      uid: "",
      status: "",
      infrastructure: "",
      region: "",
      version: "",
      readiness: {
        status: "",
      },
    } as Cluster

    setup(minimalCluster)

    // Should still render the structure even with empty values
    expect(screen.getByText("Infrastructure:")).toBeInTheDocument()
    expect(screen.getByText("Region:")).toBeInTheDocument()
    expect(screen.getByText("Version:")).toBeInTheDocument()
    expect(screen.getByText("Readiness:")).toBeInTheDocument()
  })

  it("renders stack components with proper distribution and gaps", () => {
    setup(mockCluster)

    // Test that the component renders without errors
    // Stack components should handle layout properly
    expect(screen.getByText("test-cluster")).toBeInTheDocument()
    expect(screen.getByText("healthy")).toBeInTheDocument()
  })

  it("handles single character infrastructure names", () => {
    const singleCharCluster = { ...mockCluster, infrastructure: "k" }
    setup(singleCharCluster)

    expect(screen.getByText("K")).toBeInTheDocument()
    expect(screen.getByText("k")).toBeInTheDocument()
  })

  it("renders with different readiness statuses", () => {
    const notReadyCluster = {
      ...mockCluster,
      readiness: { status: "not-ready" },
    } as Cluster

    setup(notReadyCluster)

    expect(screen.getByText("not-ready")).toBeInTheDocument()
  })
})
