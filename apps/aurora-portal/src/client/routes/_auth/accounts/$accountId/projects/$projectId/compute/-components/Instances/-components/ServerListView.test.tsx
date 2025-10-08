import { describe, it, expect, beforeAll } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { ServerListView } from "./ServerListView"
import type { Server } from "@/server/Compute/types/server"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

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

describe("ServerListView", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders a table with server names", async () => {
    await act(async () => {
      render(<ServerListView servers={mockServers} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.getByText("Cache Server")).toBeInTheDocument()
    expect(screen.getByText("Development Server")).toBeInTheDocument()
  })

  it("displays the correct server status with icons", async () => {
    await act(async () => {
      render(<ServerListView servers={mockServers} />, {
        wrapper: TestingProvider,
      })
    })

    // "ACTIVE" should have a success icon
    expect(screen.getByTestId("icon-success")).toBeInTheDocument()

    // "SHUTOFF" should have a danger icon
    expect(screen.getByTestId("icon-danger")).toBeInTheDocument()

    expect(screen.getByText("ACTIVE")).toBeInTheDocument()
    expect(screen.getByText("SHUTOFF")).toBeInTheDocument()
  })

  it("displays correct IPv4 and IPv6 addresses", async () => {
    await act(async () => {
      render(<ServerListView servers={mockServers} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.getByText("192.168.1.90")).toBeInTheDocument()
    expect(screen.getByText("fe80::9")).toBeInTheDocument()

    expect(screen.getByText("192.168.1.100")).toBeInTheDocument()
    expect(screen.getByText("fe80::A")).toBeInTheDocument()
  })

  it("displays correct CPU, RAM, and disk details", async () => {
    await act(async () => {
      render(<ServerListView servers={mockServers} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("8192 MB")).toBeInTheDocument()
    expect(screen.getByText("15 GB")).toBeInTheDocument()

    expect(screen.getByText("16")).toBeInTheDocument()
    expect(screen.getByText("32768 MB")).toBeInTheDocument()
    expect(screen.getByText("60 GB")).toBeInTheDocument()
  })

  it("renders action buttons for each server", async () => {
    await act(async () => {
      render(<ServerListView servers={mockServers} />, {
        wrapper: TestingProvider,
      })
    })

    const viewButtons = screen.getAllByRole("button", { name: "View" })
    const restartButtons = screen.getAllByRole("button", { name: "Restart" })

    expect(viewButtons.length).toBe(2) // One for each server
    expect(restartButtons.length).toBe(2)
  })

  it("shows 'No servers available' when the list is empty", async () => {
    await act(async () => {
      render(<ServerListView servers={[]} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.getByText("No servers available.")).toBeInTheDocument()
  })
})
