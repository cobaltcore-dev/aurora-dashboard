import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AllocateFloatingIpModal } from "./AllocateFloatingIpModal"
import { trpcReact } from "@/client/trpcClient"

// Mock useParams
vi.mock("@tanstack/react-router", () => ({
  useParams: vi.fn(() => ({ projectId: "test-project" })),
}))

type QueryResultShape<TData> = {
  data?: TData
  isLoading: boolean
  error: { message?: string } | null
}

const createMockQueryResult = <TData,>(overrides: Partial<QueryResultShape<TData>> = {}) => ({
  data: undefined,
  isLoading: false,
  error: null,
  ...overrides,
})

// Mock tRPC client
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    network: {
      listExternalNetworks: {
        useQuery: vi.fn(),
      },
      listDnsDomains: {
        useQuery: vi.fn(),
      },
      port: {
        listAvailablePorts: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}))

const mockExternalNetworks = [
  { id: "net-1", name: "Public Network" },
  { id: "net-2", name: "Private Network" },
]

const mockDnsDomains = ["example.com", "test.domain"]

const mockPorts = [
  {
    id: "port-1",
    name: "Web Server Port",
    fixed_ips: [{ ip_address: "192.168.1.10" }, { ip_address: "192.168.1.11" }],
  },
  {
    id: "port-2",
    name: "DB Server Port",
    fixed_ips: [{ ip_address: "192.168.1.20" }],
  },
]

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <PortalProvider>{children}</PortalProvider>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe("AllocateFloatingIpModal", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  beforeEach(() => {
    i18n.activate("en")
    vi.mocked(trpcReact.network.listExternalNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockExternalNetworks }) as ReturnType<
        typeof trpcReact.network.listExternalNetworks.useQuery
      >
    )
    vi.mocked(trpcReact.network.listDnsDomains.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockDnsDomains }) as ReturnType<typeof trpcReact.network.listDnsDomains.useQuery>
    )
    vi.mocked(trpcReact.network.port.listAvailablePorts.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockPorts }) as ReturnType<
        typeof trpcReact.network.port.listAvailablePorts.useQuery
      >
    )
  })

  describe("Modal visibility", () => {
    it("does not render when open is false", () => {
      const { container } = render(<AllocateFloatingIpModal open={false} onClose={vi.fn()} onUpdate={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      const modal = container.querySelector("[role='dialog']")
      expect(modal).not.toBeInTheDocument()
    })

    it("renders when open is true", () => {
      vi.mocked(trpcReact.network.listExternalNetworks.useQuery).mockReturnValue(
        createMockQueryResult({ data: mockExternalNetworks }) as ReturnType<
          typeof trpcReact.network.listExternalNetworks.useQuery
        >
      )

      const { container } = render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      const modal = container.querySelector("[role='dialog']")
      expect(modal).toBeInTheDocument()
    })

    it("displays correct title", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Allocate Floating IP")).toBeInTheDocument()
    })
  })

  describe("Form fields rendering", () => {
    it("renders all form field labels", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("External Network")).toBeInTheDocument()
      expect(screen.getByText("DNS Domain")).toBeInTheDocument()
      expect(screen.getByText("DNS Name")).toBeInTheDocument()
      expect(screen.getByText("Floating IP Address")).toBeInTheDocument()
      expect(screen.getByText("Port ID")).toBeInTheDocument()
      expect(screen.getByText("Fixed IP Address")).toBeInTheDocument()
    })

    it("renders external networks as options", async () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      await waitFor(() => {
        mockExternalNetworks.forEach((net) => {
          expect(screen.getByText(new RegExp(net.name))).toBeInTheDocument()
        })
      })
    })

    it("renders DNS domains as options", async () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      await waitFor(() => {
        mockDnsDomains.forEach((domain) => {
          expect(screen.getByText(domain)).toBeInTheDocument()
        })
      })
    })

    it("renders available ports as options", async () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      await waitFor(() => {
        mockPorts.forEach((port) => {
          expect(screen.getByText(new RegExp(port.name))).toBeInTheDocument()
        })
      })
    })
  })

  describe("Query loading states", () => {
    it("shows loading state for external networks", () => {
      vi.mocked(trpcReact.network.listExternalNetworks.useQuery).mockReturnValue(
        createMockQueryResult({ isLoading: true }) as ReturnType<typeof trpcReact.network.listExternalNetworks.useQuery>
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      const externalNetworkSelect = screen.getByLabelText("External Network")
      expect(externalNetworkSelect).toBeDisabled()
    })

    it("shows loading state for DNS domains", () => {
      vi.mocked(trpcReact.network.listDnsDomains.useQuery).mockReturnValue(
        createMockQueryResult({ isLoading: true }) as ReturnType<typeof trpcReact.network.listDnsDomains.useQuery>
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      const dnsDomainSelect = screen.getByLabelText("DNS Domain")
      expect(dnsDomainSelect).toBeDisabled()
    })

    it("shows loading state for ports", () => {
      vi.mocked(trpcReact.network.port.listAvailablePorts.useQuery).mockReturnValue(
        createMockQueryResult({ isLoading: true }) as ReturnType<
          typeof trpcReact.network.port.listAvailablePorts.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      const portSelect = screen.getByLabelText("Port ID")
      expect(portSelect).toBeDisabled()
    })
  })

  describe("Query error handling", () => {
    it("displays error message from external networks query", () => {
      vi.mocked(trpcReact.network.listExternalNetworks.useQuery).mockReturnValue(
        createMockQueryResult({ error: { message: "Failed to load networks" } }) as ReturnType<
          typeof trpcReact.network.listExternalNetworks.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Failed to load networks")).toBeInTheDocument()
    })

    it("displays error message from DNS domains query", () => {
      vi.mocked(trpcReact.network.listDnsDomains.useQuery).mockReturnValue(
        createMockQueryResult({ error: { message: "Failed to load DNS domains" } }) as ReturnType<
          typeof trpcReact.network.listDnsDomains.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Failed to load DNS domains")).toBeInTheDocument()
    })

    it("displays error message from ports query", () => {
      vi.mocked(trpcReact.network.port.listAvailablePorts.useQuery).mockReturnValue(
        createMockQueryResult({ error: { message: "Failed to load ports" } }) as ReturnType<
          typeof trpcReact.network.port.listAvailablePorts.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Failed to load ports")).toBeInTheDocument()
    })

    it("displays custom error message from props", () => {
      vi.mocked(trpcReact.network.listExternalNetworks.useQuery).mockReturnValue(
        createMockQueryResult({ data: mockExternalNetworks }) as ReturnType<
          typeof trpcReact.network.listExternalNetworks.useQuery
        >
      )
      vi.mocked(trpcReact.network.listDnsDomains.useQuery).mockReturnValue(
        createMockQueryResult({ data: mockDnsDomains }) as ReturnType<typeof trpcReact.network.listDnsDomains.useQuery>
      )
      vi.mocked(trpcReact.network.port.listAvailablePorts.useQuery).mockReturnValue(
        createMockQueryResult({ data: mockPorts }) as ReturnType<
          typeof trpcReact.network.port.listAvailablePorts.useQuery
        >
      )

      render(
        <AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} error="Custom error message" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText("Custom error message")).toBeInTheDocument()
    })

    it("prioritizes query errors over custom error message", () => {
      vi.mocked(trpcReact.network.listExternalNetworks.useQuery).mockReturnValue(
        createMockQueryResult({ error: { message: "Query error" } }) as ReturnType<
          typeof trpcReact.network.listExternalNetworks.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} error="Custom error" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText("Query error")).toBeInTheDocument()
      expect(screen.queryByText("Custom error")).not.toBeInTheDocument()
    })
  })

  describe("Loading state UI", () => {
    it("shows spinner and loading message when isLoading is true", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} isLoading={true} />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText("Allocating Floating IP...")).toBeInTheDocument()
    })

    it("hides form when isLoading is true", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} isLoading={true} />, {
        wrapper: createWrapper(),
      })

      const dnsNameField = screen.queryByLabelText("DNS Name")
      expect(dnsNameField).not.toBeInTheDocument()
    })

    it("shows form when isLoading is false", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} isLoading={false} />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByLabelText("DNS Name")).toBeInTheDocument()
    })
  })

  describe("Modal buttons", () => {
    it("renders Cancel and Allocate buttons", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Allocate/i })).toBeInTheDocument()
    })

    it("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()

      render(<AllocateFloatingIpModal open={true} onClose={onClose} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe("Form validation", () => {
    it("displays validation error when empty form submitted", async () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      const allocateButton = screen.getByRole("button", { name: /Allocate/i })
      expect(allocateButton).toBeDisabled()
    })
  })

  describe("Form submission", () => {
    it("does not call onUpdate when form is incomplete", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      const allocateButton = screen.getByRole("button", { name: /Allocate/i })
      expect(allocateButton).toBeDisabled()
    })

    it("does not submit form when isLoading is true", () => {
      const onUpdate = vi.fn()

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={onUpdate} isLoading={true} />, {
        wrapper: createWrapper(),
      })

      // Form should not be visible when loading
      expect(screen.queryByLabelText("DNS Name")).not.toBeInTheDocument()
    })
  })

  describe("Port and fixed IP interaction", () => {
    it("displays fixed IP address field", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} onUpdate={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Fixed IP Address")).toBeInTheDocument()
    })
  })
})
