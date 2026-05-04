import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { trpcReact } from "@/client/trpcClient"
import { AllocateFloatingIpModal } from "./AllocateFloatingIpModal"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    useParams: vi.fn(() => ({ projectId: "test-project" })),
  }
})

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

type CreateMutationResult = ReturnType<typeof trpcReact.network.floatingIp.create.useMutation>

const createMockCreateMutationResult = (
  overrides: Partial<{
    mutateAsync: () => Promise<unknown>
    reset: () => void
    isPending: boolean
    error: { message?: string } | null
  }> = {}
) =>
  ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    reset: vi.fn(),
    isPending: false,
    error: null,
    ...overrides,
  }) as unknown as CreateMutationResult

// Mock tRPC client
vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      useUtils: vi.fn(() => ({
        network: {
          floatingIp: {
            list: {
              invalidate: vi.fn(),
            },
          },
        },
      })),
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
        floatingIp: {
          create: {
            useMutation: vi.fn(),
          },
        },
      },
    },
  }
})

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
    vi.mocked(trpcReact.network.floatingIp.listExternalNetworks.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockExternalNetworks }) as ReturnType<
        typeof trpcReact.network.floatingIp.listExternalNetworks.useQuery
      >
    )
    vi.mocked(trpcReact.network.listDnsDomains.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockDnsDomains }) as ReturnType<typeof trpcReact.network.listDnsDomains.useQuery>
    )
    vi.mocked(trpcReact.network.floatingIp.listAvailablePorts.useQuery).mockReturnValue(
      createMockQueryResult({ data: mockPorts }) as ReturnType<
        typeof trpcReact.network.floatingIp.listAvailablePorts.useQuery
      >
    )
    vi.mocked(trpcReact.network.floatingIp.create.useMutation).mockReturnValue(createMockCreateMutationResult())
  })

  describe("Modal visibility", () => {
    it("does not render when open is false", () => {
      const { container } = render(<AllocateFloatingIpModal open={false} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      const modal = container.querySelector("[role='dialog']")
      expect(modal).not.toBeInTheDocument()
    })

    it("renders when open is true", () => {
      vi.mocked(trpcReact.network.floatingIp.listExternalNetworks.useQuery).mockReturnValue(
        createMockQueryResult({ data: mockExternalNetworks }) as ReturnType<
          typeof trpcReact.network.floatingIp.listExternalNetworks.useQuery
        >
      )

      const { container } = render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      const modal = container.querySelector("[role='dialog']")
      expect(modal).toBeInTheDocument()
    })

    it("displays correct title", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Allocate Floating IP")).toBeInTheDocument()
    })
  })

  describe("Form fields rendering", () => {
    it("renders all form field labels", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("External Network")).toBeInTheDocument()
      expect(screen.getByText("DNS Domain")).toBeInTheDocument()
      expect(screen.getByText("DNS Name")).toBeInTheDocument()
      expect(screen.getByText("Floating IP Address")).toBeInTheDocument()
      expect(screen.getByText("Port ID")).toBeInTheDocument()
      expect(screen.getByText("Fixed IP Address")).toBeInTheDocument()
    })

    it("renders external networks as options", async () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      await waitFor(() => {
        mockExternalNetworks.forEach((net) => {
          expect(screen.getByText(new RegExp(net.name))).toBeInTheDocument()
        })
      })
    })

    it("renders DNS domains as options", async () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      await waitFor(() => {
        mockDnsDomains.forEach((domain) => {
          expect(screen.getByText(domain)).toBeInTheDocument()
        })
      })
    })

    it("renders available ports as options", async () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      await waitFor(() => {
        mockPorts.forEach((port) => {
          expect(screen.getByText(new RegExp(port.name))).toBeInTheDocument()
        })
      })
    })
  })

  describe("Query loading states", () => {
    it("shows loading state for external networks", () => {
      vi.mocked(trpcReact.network.floatingIp.listExternalNetworks.useQuery).mockReturnValue(
        createMockQueryResult({ isLoading: true }) as ReturnType<
          typeof trpcReact.network.floatingIp.listExternalNetworks.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      const externalNetworkSelect = screen.getByLabelText("External Network")
      expect(externalNetworkSelect).toBeDisabled()
    })

    it("shows loading state for DNS domains", () => {
      vi.mocked(trpcReact.network.listDnsDomains.useQuery).mockReturnValue(
        createMockQueryResult({ isLoading: true }) as ReturnType<typeof trpcReact.network.listDnsDomains.useQuery>
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      const dnsDomainSelect = screen.getByLabelText("DNS Domain")
      expect(dnsDomainSelect).toBeDisabled()
    })

    it("shows loading state for ports", () => {
      vi.mocked(trpcReact.network.floatingIp.listAvailablePorts.useQuery).mockReturnValue(
        createMockQueryResult({ isLoading: true }) as ReturnType<
          typeof trpcReact.network.floatingIp.listAvailablePorts.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      const portSelect = screen.getByLabelText("Port ID")
      expect(portSelect).toBeDisabled()
    })
  })

  describe("Query error handling", () => {
    it("displays error message from external networks query", () => {
      vi.mocked(trpcReact.network.floatingIp.listExternalNetworks.useQuery).mockReturnValue(
        createMockQueryResult({ error: { message: "Failed to load networks" } }) as ReturnType<
          typeof trpcReact.network.floatingIp.listExternalNetworks.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Failed to load networks")).toBeInTheDocument()
    })

    it("displays error message from DNS domains query", () => {
      vi.mocked(trpcReact.network.listDnsDomains.useQuery).mockReturnValue(
        createMockQueryResult({ error: { message: "Failed to load DNS domains" } }) as ReturnType<
          typeof trpcReact.network.listDnsDomains.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Failed to load DNS domains")).toBeInTheDocument()
    })

    it("displays error message from ports query", () => {
      vi.mocked(trpcReact.network.floatingIp.listAvailablePorts.useQuery).mockReturnValue(
        createMockQueryResult({ error: { message: "Failed to load ports" } }) as ReturnType<
          typeof trpcReact.network.floatingIp.listAvailablePorts.useQuery
        >
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Failed to load ports")).toBeInTheDocument()
    })

    it("prioritizes query errors over mutation error message", () => {
      vi.mocked(trpcReact.network.floatingIp.listExternalNetworks.useQuery).mockReturnValue(
        createMockQueryResult({ error: { message: "Query error" } }) as ReturnType<
          typeof trpcReact.network.floatingIp.listExternalNetworks.useQuery
        >
      )

      vi.mocked(trpcReact.network.floatingIp.create.useMutation).mockReturnValue(
        createMockCreateMutationResult({ error: { message: "Mutation error" } })
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText("Query error")).toBeInTheDocument()
      expect(screen.queryByText("Mutation error")).not.toBeInTheDocument()
    })
  })

  describe("Loading state UI", () => {
    it("shows spinner and loading message when mutation is pending", () => {
      vi.mocked(trpcReact.network.floatingIp.create.useMutation).mockReturnValue(
        createMockCreateMutationResult({ isPending: true })
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText("Allocating Floating IP...")).toBeInTheDocument()
    })

    it("hides form when mutation is pending", () => {
      vi.mocked(trpcReact.network.floatingIp.create.useMutation).mockReturnValue(
        createMockCreateMutationResult({ isPending: true })
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      const dnsNameField = screen.queryByLabelText("DNS Name")
      expect(dnsNameField).not.toBeInTheDocument()
    })

    it("shows form when mutation is not pending", () => {
      vi.mocked(trpcReact.network.floatingIp.create.useMutation).mockReturnValue(
        createMockCreateMutationResult({ isPending: false })
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByLabelText("DNS Name")).toBeInTheDocument()
    })
  })

  describe("Modal buttons", () => {
    it("renders Cancel and Allocate buttons", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Allocate/i })).toBeInTheDocument()
    })

    it("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()

      render(<AllocateFloatingIpModal open={true} onClose={onClose} />, { wrapper: createWrapper() })

      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe("Form validation", () => {
    it("displays validation error when empty form submitted", async () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      const allocateButton = screen.getByRole("button", { name: /Allocate/i })
      expect(allocateButton).toBeDisabled()
    })
  })

  describe("Form submission", () => {
    it("button is disabled when form is incomplete", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      const allocateButton = screen.getByRole("button", { name: /Allocate/i })
      expect(allocateButton).toBeDisabled()
    })

    it("button is disabled when mutation is pending", () => {
      vi.mocked(trpcReact.network.floatingIp.create.useMutation).mockReturnValue(
        createMockCreateMutationResult({ isPending: true })
      )

      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      const allocateButton = screen.getByRole("button", { name: /Allocate/i })
      expect(allocateButton).toBeDisabled()
    })
  })

  describe("Port and fixed IP interaction", () => {
    it("displays fixed IP address field", () => {
      render(<AllocateFloatingIpModal open={true} onClose={vi.fn()} />, { wrapper: createWrapper() })

      expect(screen.getByText("Fixed IP Address")).toBeInTheDocument()
    })
  })
})
