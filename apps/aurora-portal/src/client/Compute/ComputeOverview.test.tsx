import { describe, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { ComputeOverview } from "./ComputeOverview"
import { TrpcClient } from "../trpcClient"
import { Server } from "../../server/Compute/types/models"
import { AuroraProvider } from "../Shell/AuroraProvider"
import { MemoryRouter, Route, Routes } from "react-router-dom"

const mockGetServers = vi.fn()
const mockGetProjectById = vi.fn()

const mockClient = {
  compute: {
    getServersByProjectId: {
      query: mockGetServers,
    },
  },
  project: { getProjectById: { query: mockGetProjectById } },
} as unknown as TrpcClient

// Helper function to wrap components with AuthProvider & MemoryRouter
const renderWithAuth = (ui: React.ReactNode) => {
  return render(
    <MemoryRouter initialEntries={["/1789d1/projects/89ac3f/compute"]}>
      <AuroraProvider>
        <Routes>
          <Route path="/1789d1/projects/89ac3f/compute" element={ui} />
        </Routes>
      </AuroraProvider>
    </MemoryRouter>
  )
}

describe("ComputePanel", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("renders loading state", async () => {
    mockGetServers.mockReturnValue(new Promise(() => {})) // Never resolves
    mockGetProjectById.mockReturnValue(new Promise(() => {})) // Never resolves

    renderWithAuth(<ComputeOverview client={mockClient} />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("renders error state", async () => {
    mockGetServers.mockRejectedValue(new Error("Failed to fetch servers"))
    mockGetProjectById.mockRejectedValue(new Error("Failed to fetch project"))

    renderWithAuth(<ComputeOverview client={mockClient} />)

    await waitFor(() => {
      expect(screen.getByText("Error: Failed to fetch servers")).toBeInTheDocument()
    })
  })

  it("renders server list view by default", async () => {
    const mockServers = [
      {
        id: "10",
        name: "Development Server",
        accessIPv4: "192.168.1.100",
        accessIPv6: "fe80::A",
        addresses: {
          private: [{ addr: "10.0.0.10", mac_addr: "00:2D:3E:4F:7A:8B", type: "fixed", version: 4 }],
        },
        created: "2025-02-15T03:25:00Z",
        updated: "2025-02-16T04:40:00Z",
        status: "ACTIVE",
        flavor: { disk: 60, ram: 32768, vcpus: 16 },
        image: { id: "image-110" },
        metadata: { "Server Role": "Development" },
      },
    ]
    const mockProject = { id: "1", name: "Project 1" }
    mockGetProjectById.mockResolvedValue(mockProject)
    mockGetServers.mockResolvedValue(mockServers)

    renderWithAuth(<ComputeOverview client={mockClient} />)

    await waitFor(() => {
      expect(screen.getByText("Compute")).toBeInTheDocument()
      expect(screen.getByText("Development Server")).toBeInTheDocument()
    })
  })

  it("shows a content", async () => {
    const mockServers = [
      {
        id: "10",
        name: "Development Server",
        accessIPv4: "192.168.1.100",
        accessIPv6: "fe80::A",
        addresses: {
          private: [{ addr: "10.0.0.10", mac_addr: "00:2D:3E:4F:7A:8B", type: "fixed", version: 4 }],
        },
        created: "2025-02-15T03:25:00Z",
        updated: "2025-02-16T04:40:00Z",
        status: "ACTIVE",
        flavor: { disk: 60, ram: 32768, vcpus: 16 },
        image: { id: "image-110" },
        metadata: { "Server Role": "Development" },
      },
    ] as Server[]
    const mockProject = { id: "1", name: "Project 1" }
    mockGetProjectById.mockResolvedValue(mockProject)
    mockGetServers.mockResolvedValue(mockServers)

    renderWithAuth(<ComputeOverview client={mockClient} />)

    await waitFor(() => {
      expect(screen.getByText("Compute")).toBeInTheDocument()
      expect(screen.getByText("Development Server")).toBeInTheDocument()
    })
  })
})
