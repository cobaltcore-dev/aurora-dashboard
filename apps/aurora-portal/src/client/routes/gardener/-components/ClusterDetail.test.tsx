import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { useNavigate } from "@tanstack/react-router"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import ClusterDetailPage from "./ClusterDetail"

// Mock the useNavigate hook
vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
}))

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

describe("ClusterDetailPage", () => {
  const mockNavigate = vi.fn()
  const mockCluster = {
    uid: "test-cluster-123",
    name: "test-cluster",
    infrastructure: "aws",
    region: "us-east-1",
    status: "Operational",
    version: "1.28.5",
    readiness: {
      status: "5/5",
      conditions: [],
    },
    workers: [],
    maintenance: {
      startTime: "030000+0000",
      timezone: "UTC",
      windowTime: "040000+0000",
    },
    lastMaintenance: {
      state: "Succeeded",
    },
    autoUpdate: {
      os: true,
      kubernetes: true,
    },
  }

  const setup = () => {
    return render(
      <I18nProvider i18n={i18n}>
        <ClusterDetailPage cluster={mockCluster} />
      </I18nProvider>
    )
  }

  beforeEach(async () => {
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)

    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders cluster details", () => {
    setup()

    expect(screen.getByText("Cluster Details")).toBeInTheDocument()
  })

  it("navigates back when breadcrumb is clicked", () => {
    setup()

    fireEvent.click(screen.getByText("Clusters"))
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/gardener/clusters" })
  })

  it("handles share functionality", async () => {
    setup()

    const shareButton = screen.getByRole("button", { name: /share/i })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })
})
