import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import ClusterOverviewSection from "./ClusterOverviewSection"
import { Cluster } from "@/server/Gardener/types/cluster"

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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders cluster name and ID correctly", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    expect(screen.getByText("test-cluster")).toBeInTheDocument()
    expect(screen.getByText("test-uid-123")).toBeInTheDocument()
    expect(screen.getByText("ID:")).toBeInTheDocument()
  })

  it("calls handleShare when ID is clicked", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    const idElement = screen.getByText("test-uid-123").closest("div")
    fireEvent.click(idElement!)

    expect(mockHandleShare).toHaveBeenCalledTimes(1)
  })

  it("renders cluster name with correct heading styles", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    const clusterName = screen.getByText("test-cluster")
    expect(clusterName).toHaveClass("text-xl", "font-semibold", "leading-none", "tracking-tight", "text-theme-highest")
    expect(clusterName.tagName).toBe("H3")
  })

  it("renders ID with correct styling and behavior", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

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
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    expect(screen.getByText("Infrastructure")).toBeInTheDocument()
    expect(screen.getByText("Infrastructure:")).toBeInTheDocument()
    expect(screen.getByText("Region:")).toBeInTheDocument()
    expect(screen.getByText("AWS")).toBeInTheDocument() // infrastructure badge text
    expect(screen.getByText("aws")).toBeInTheDocument() // infrastructure display text
    expect(screen.getByText("us-west-2")).toBeInTheDocument()
  })

  it("renders kubernetes section with correct data", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    expect(screen.getByText("Kubernetes")).toBeInTheDocument()
    expect(screen.getByText("Version:")).toBeInTheDocument()
    expect(screen.getByText("Readiness:")).toBeInTheDocument()
    expect(screen.getByText("v")).toBeInTheDocument() // version prefix
    expect(screen.getByText("1.28.0")).toBeInTheDocument()
  })

  it("displays version with correct styling", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    const versionPrefix = screen.getByText("v")
    expect(versionPrefix).toHaveClass("text-theme-link", "mr-0.5")

    const versionNumber = screen.getByText("1.28.0")
    expect(versionNumber).toHaveClass("text-theme-high")
  })

  it("displays infrastructure with correct styling", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    const infrastructureText = screen.getByText("aws")
    expect(infrastructureText).toHaveClass("text-theme-high", "capitalize")
  })

  it("displays region with correct styling", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    const regionText = screen.getByText("us-west-2")
    expect(regionText).toHaveClass("text-theme-high")
  })

  it("creates infrastructure badge with first 3 characters uppercase", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    // AWS -> AWS (first 3 chars)
    expect(screen.getByText("AWS")).toBeInTheDocument()
  })

  it("handles different infrastructure types correctly", () => {
    const azureCluster = { ...mockCluster, infrastructure: "azure" }
    render(<ClusterOverviewSection cluster={azureCluster} handleShare={mockHandleShare} />)

    // azure -> AZU (first 3 chars)
    expect(screen.getByText("AZU")).toBeInTheDocument()
    expect(screen.getByText("azure")).toBeInTheDocument()
  })

  it("handles short infrastructure names", () => {
    const gcpCluster = { ...mockCluster, infrastructure: "gcp" }
    render(<ClusterOverviewSection cluster={gcpCluster} handleShare={mockHandleShare} />)

    // gcp -> GCP (first 3 chars, all available)
    expect(screen.getByText("GCP")).toBeInTheDocument()
    expect(screen.getByText("gcp")).toBeInTheDocument()
  })

  describe("status badge rendering", () => {
    it("renders healthy status badge", () => {
      render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("healthy")).toBeInTheDocument()
    })

    it("renders operational status", () => {
      const operationalCluster = { ...mockCluster, status: "operational" }
      render(<ClusterOverviewSection cluster={operationalCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("operational")).toBeInTheDocument()
    })

    it("renders warning status", () => {
      const warningCluster = { ...mockCluster, status: "warning" }
      render(<ClusterOverviewSection cluster={warningCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("warning")).toBeInTheDocument()
    })

    it("renders pending status", () => {
      const pendingCluster = { ...mockCluster, status: "pending" }
      render(<ClusterOverviewSection cluster={pendingCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("pending")).toBeInTheDocument()
    })

    it("renders unhealthy status", () => {
      const unhealthyCluster = { ...mockCluster, status: "unhealthy" }
      render(<ClusterOverviewSection cluster={unhealthyCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("unhealthy")).toBeInTheDocument()
    })

    it("renders error status", () => {
      const errorCluster = { ...mockCluster, status: "error" }
      render(<ClusterOverviewSection cluster={errorCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("error")).toBeInTheDocument()
    })

    it("renders failed status", () => {
      const failedCluster = { ...mockCluster, status: "failed" }
      render(<ClusterOverviewSection cluster={failedCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("failed")).toBeInTheDocument()
    })

    it("renders unknown status", () => {
      const unknownCluster = { ...mockCluster, status: "unknown" }
      render(<ClusterOverviewSection cluster={unknownCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("unknown")).toBeInTheDocument()
    })
  })

  describe("readiness badge rendering", () => {
    it("renders readiness status badge", () => {
      render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("ready")).toBeInTheDocument()
    })

    it("renders different readiness statuses", () => {
      const degradedCluster = {
        ...mockCluster,
        readiness: { status: "degraded" },
      } as Cluster

      render(<ClusterOverviewSection cluster={degradedCluster} handleShare={mockHandleShare} />)

      expect(screen.getByText("degraded")).toBeInTheDocument()
    })
  })

  it("renders with complex cluster data", () => {
    const complexCluster: Cluster = {
      name: "production-cluster-eu",
      uid: "prod-eu-xyz-789",
      status: "warning",
      infrastructure: "gcp",
      region: "europe-west1",
      version: "1.29.3",
      readiness: {
        status: "degraded",
      },
    } as Cluster

    render(<ClusterOverviewSection cluster={complexCluster} handleShare={mockHandleShare} />)

    expect(screen.getByText("production-cluster-eu")).toBeInTheDocument()
    expect(screen.getByText("prod-eu-xyz-789")).toBeInTheDocument()
    expect(screen.getByText("GCP")).toBeInTheDocument()
    expect(screen.getByText("gcp")).toBeInTheDocument()
    expect(screen.getByText("europe-west1")).toBeInTheDocument()
    expect(screen.getByText("1.29.3")).toBeInTheDocument()
    expect(screen.getByText("warning")).toBeInTheDocument()
    expect(screen.getByText("degraded")).toBeInTheDocument()
  })

  it("renders infrastructure and kubernetes sections", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    expect(screen.getByText("Infrastructure")).toBeInTheDocument()
    expect(screen.getByText("Kubernetes")).toBeInTheDocument()
  })

  it("renders all expected labels", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    expect(screen.getByText("Infrastructure:")).toBeInTheDocument()
    expect(screen.getByText("Region:")).toBeInTheDocument()
    expect(screen.getByText("Version:")).toBeInTheDocument()
    expect(screen.getByText("Readiness:")).toBeInTheDocument()
  })

  it("handles case sensitivity in status correctly", () => {
    const upperCaseCluster = { ...mockCluster, status: "HEALTHY" }
    render(<ClusterOverviewSection cluster={upperCaseCluster} handleShare={mockHandleShare} />)

    expect(screen.getByText("HEALTHY")).toBeInTheDocument()
  })

  it("renders multiple status badges correctly", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

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

    render(<ClusterOverviewSection cluster={minimalCluster} handleShare={mockHandleShare} />)

    // Should still render the structure even with empty values
    expect(screen.getByText("Infrastructure:")).toBeInTheDocument()
    expect(screen.getByText("Region:")).toBeInTheDocument()
    expect(screen.getByText("Version:")).toBeInTheDocument()
    expect(screen.getByText("Readiness:")).toBeInTheDocument()
  })

  it("renders stack components with proper distribution and gaps", () => {
    render(<ClusterOverviewSection cluster={mockCluster} handleShare={mockHandleShare} />)

    // Test that the component renders without errors
    // Stack components should handle layout properly
    expect(screen.getByText("test-cluster")).toBeInTheDocument()
    expect(screen.getByText("healthy")).toBeInTheDocument()
  })

  it("infrastructure badge shows only first 3 characters in uppercase", () => {
    const longInfraCluster = { ...mockCluster, infrastructure: "kubernetes" }
    render(<ClusterOverviewSection cluster={longInfraCluster} handleShare={mockHandleShare} />)

    // kubernetes -> KUB (first 3 chars)
    expect(screen.getByText("KUB")).toBeInTheDocument()
    expect(screen.getByText("kubernetes")).toBeInTheDocument()
  })

  it("handles single character infrastructure names", () => {
    const singleCharCluster = { ...mockCluster, infrastructure: "k" }
    render(<ClusterOverviewSection cluster={singleCharCluster} handleShare={mockHandleShare} />)

    expect(screen.getByText("K")).toBeInTheDocument()
    expect(screen.getByText("k")).toBeInTheDocument()
  })

  it("renders with different readiness statuses", () => {
    const notReadyCluster = {
      ...mockCluster,
      readiness: { status: "not-ready" },
    } as Cluster

    render(<ClusterOverviewSection cluster={notReadyCluster} handleShare={mockHandleShare} />)

    expect(screen.getByText("not-ready")).toBeInTheDocument()
  })
})
