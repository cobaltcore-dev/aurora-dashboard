import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Cluster } from "@/server/Gardener/types/cluster"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import ClusterOverviewSection from "./ClusterOverviewSection"

describe("ClusterOverviewSection", () => {
  const mockCluster: Cluster = {
    name: "test-cluster",
    uid: "test-uid-123",
    status: "healthy",
    infrastructure: "aws",
    region: "us-west-2",
    version: "1.28.0",
    readiness: {
      status: "ready",
      conditions: [],
    },
    workers: [],
    maintenance: {
      startTime: "",
      timezone: "",
      windowTime: "",
    },
    lastMaintenance: {},
    autoUpdate: { os: false, kubernetes: false },
  }

  const setup = (cluster: Cluster) => {
    return render(
      <I18nProvider i18n={i18n}>
        <ClusterOverviewSection cluster={cluster} />
      </I18nProvider>
    )
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders infrastructure section with correct data", () => {
    setup(mockCluster)

    expect(screen.getAllByText("Infrastructure")).toHaveLength(2)
    expect(screen.getByText("Region")).toBeInTheDocument()
    expect(screen.getByText("aws")).toBeInTheDocument() // infrastructure display text
    expect(screen.getByText("us-west-2")).toBeInTheDocument()
  })

  it("renders kubernetes section with correct data", () => {
    setup(mockCluster)
    expect(screen.getAllByText("Infrastructure")).toHaveLength(2)
    expect(screen.getByText("Kubernetes")).toBeInTheDocument()
    expect(screen.getByText("Version")).toBeInTheDocument()
    expect(screen.getByText("Readiness")).toBeInTheDocument()
    expect(screen.getByText("1.28.0")).toBeInTheDocument()
  })

  describe("status rendering", () => {
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

  it("renders infrastructure and kubernetes sections", () => {
    setup(mockCluster)

    expect(screen.getAllByText("Infrastructure")).toHaveLength(2)
    expect(screen.getByText("Kubernetes")).toBeInTheDocument()
  })

  it("renders all expected labels", () => {
    setup(mockCluster)

    expect(screen.getAllByText("Infrastructure")).toHaveLength(2)
    expect(screen.getByText("Region")).toBeInTheDocument()
    expect(screen.getByText("Version")).toBeInTheDocument()
    expect(screen.getByText("Readiness")).toBeInTheDocument()
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
        conditions: [],
      },
      workers: [],
      maintenance: {
        startTime: "",
        timezone: "",
        windowTime: "",
      },
      lastMaintenance: {},
      autoUpdate: { os: false, kubernetes: false },
    }

    setup(minimalCluster)

    // Should still render the structure even with empty values
    expect(screen.getAllByText("Infrastructure")).toHaveLength(2)
    expect(screen.getByText("Region")).toBeInTheDocument()
    expect(screen.getByText("Version")).toBeInTheDocument()
    expect(screen.getByText("Readiness")).toBeInTheDocument()
  })

  it("renders with different readiness statuses", () => {
    const notReadyCluster: Cluster = {
      ...mockCluster,
      readiness: { status: "not-ready", conditions: [] },
    }

    setup(notReadyCluster)

    expect(screen.getByText("not-ready")).toBeInTheDocument()
  })
})
