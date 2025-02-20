import { describe, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { ComputePanel } from "./ComputePanel"
import { TrpcClient } from "../trpcClient"
import { Server } from "../../shared/types/models"

const mockGetServers = vi.fn()

const mockClient = {
  getServers: {
    query: mockGetServers,
  },
} as unknown as TrpcClient["compute"]

describe("ComputePanel", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("renders loading state", async () => {
    mockGetServers.mockReturnValue(new Promise(() => {})) // Never resolves

    render(<ComputePanel client={mockClient} />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("renders error state", async () => {
    mockGetServers.mockRejectedValue(new Error("Failed to fetch servers"))

    render(<ComputePanel client={mockClient} />)

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
    mockGetServers.mockResolvedValue(mockServers)

    render(<ComputePanel client={mockClient} />)

    await waitFor(() => {
      expect(screen.getByText("Server List")).toBeInTheDocument()
      expect(screen.getByText("Development Server")).toBeInTheDocument()
    })
  })

  it("switches to card view", async () => {
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
    mockGetServers.mockResolvedValue(mockServers)

    render(<ComputePanel client={mockClient} />)

    await waitFor(() => {
      expect(screen.getByText("Server List")).toBeInTheDocument()
    })

    const cardViewButton = screen.getByText("Card")
    fireEvent.click(cardViewButton)

    await waitFor(() => {
      expect(screen.getByText("Development Server")).toBeInTheDocument()
    })
  })
})
