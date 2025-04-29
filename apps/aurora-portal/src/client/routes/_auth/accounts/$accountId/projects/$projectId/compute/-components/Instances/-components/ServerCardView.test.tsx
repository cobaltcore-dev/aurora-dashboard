import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ServerCardView } from "./ServerCardView"
import type { Server } from "@/server/Compute/types/server"

const mockServers: Server[] = [
  {
    id: "9",
    name: "Cache Server",
    accessIPv4: "192.168.1.90",
    accessIPv6: "fe80::9",
    addresses: {
      private: [{ addr: "10.0.0.9", mac_addr: "00:2C:3D:4E:6F:8A", type: "fixed", version: 4 }],
    },
    created: "2025-02-10T04:40:00Z",
    updated: "2025-02-11T05:55:00Z",
    status: "SHUTOFF",
    flavor: { disk: 15, ram: 8192, vcpus: 4 },
    image: { id: "image-109" },
    metadata: { "Server Role": "Cache" },
  },
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

describe("ServerCardView", () => {
  it("renders a list of servers with correct names", () => {
    render(<ServerCardView servers={mockServers} />)

    expect(screen.getByText("Cache Server")).toBeInTheDocument()
    expect(screen.getByText("Development Server")).toBeInTheDocument()
  })

  it("renders correct status icons for ACTIVE and SHUTOFF servers", () => {
    render(<ServerCardView servers={mockServers} />)

    // "ACTIVE" should have a success icon
    expect(screen.getByTestId("icon-success")).toBeInTheDocument()

    // "SHUTOFF" should have a danger icon
    expect(screen.getByTestId("icon-danger")).toBeInTheDocument()
  })

  it("displays server details correctly", () => {
    render(<ServerCardView servers={mockServers} />)

    expect(screen.getByText("192.168.1.90")).toBeInTheDocument()
    expect(screen.getByText("fe80::9")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("8192 MB")).toBeInTheDocument()
    expect(screen.getByText("15 GB")).toBeInTheDocument()

    expect(screen.getByText("192.168.1.100")).toBeInTheDocument()
    expect(screen.getByText("fe80::A")).toBeInTheDocument()
    expect(screen.getByText("16")).toBeInTheDocument()
    expect(screen.getByText("32768 MB")).toBeInTheDocument()
    expect(screen.getByText("60 GB")).toBeInTheDocument()
  })

  it("renders server roles correctly", () => {
    render(<ServerCardView servers={mockServers} />)

    expect(screen.getByText("Server Role: Cache")).toBeInTheDocument()
    expect(screen.getByText("Server Role: Development")).toBeInTheDocument()
  })

  it("shows 'No servers available' when the list is empty", () => {
    render(<ServerCardView servers={[]} />)

    expect(screen.getByText("No servers available.")).toBeInTheDocument()
  })
})
