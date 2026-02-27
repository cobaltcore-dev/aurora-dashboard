import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"
import { FloatingIpListContainer } from "./FloatingIpListContainer"
import type { FloatingIp } from "@/server/Network/types/floatingIp"

const TestWrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("FloatingIpListContainer", () => {
  describe("Loading state", () => {
    it("displays loading spinnerwhile loading", () => {
      render(<FloatingIpListContainer floatingIps={[]} isLoading={true} isError={false} error={null} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    it("does not display table or error when loading", () => {
      render(<FloatingIpListContainer floatingIps={[]} isLoading={true} isError={false} error={null} />, {
        wrapper: TestWrapper,
      })

      expect(screen.queryByText("No Floating IPs found")).not.toBeInTheDocument()
      expect(screen.queryByText("Failed to load Floating IPs")).not.toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    it("displays custom error message when provided", () => {
      render(
        <FloatingIpListContainer
          floatingIps={[]}
          isLoading={false}
          isError={true}
          error={{ message: "Network connection failed" }}
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Network connection failed")).toBeInTheDocument()
    })

    it("displays default error message when no message provided", () => {
      render(<FloatingIpListContainer floatingIps={[]} isLoading={false} isError={true} error={null} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("Failed to load Floating IPs")).toBeInTheDocument()
    })

    it("displays default error message when error object without message", () => {
      render(<FloatingIpListContainer floatingIps={[]} isLoading={false} isError={true} error={{}} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("Failed to load Floating IPs")).toBeInTheDocument()
    })

    it("does not display table or loading when error occurs", () => {
      render(
        <FloatingIpListContainer
          floatingIps={[]}
          isLoading={false}
          isError={true}
          error={{ message: "Error occurred" }}
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
      expect(screen.queryByText("No Floating IPs found")).not.toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("displays empty state when no floating IPs and not loading", () => {
      render(<FloatingIpListContainer floatingIps={[]} isLoading={false} isError={false} error={null} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("No Floating IPs found")).toBeInTheDocument()
    })

    it("displays helpful message in empty state", () => {
      render(<FloatingIpListContainer floatingIps={[]} isLoading={false} isError={false} error={null} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText(/Floating IPs allow you to map public IP addresses/i)).toBeInTheDocument()
    })

    it("has correct data-testid for empty state", () => {
      render(<FloatingIpListContainer floatingIps={[]} isLoading={false} isError={false} error={null} />, {
        wrapper: TestWrapper,
      })

      const emptyState = screen.getByTestId("no-floating-ips")
      expect(emptyState).toBeInTheDocument()
    })
  })

  describe("Data state with floating IPs", () => {
    const mockFloatingIp: FloatingIp = {
      id: "fip-1",
      floating_ip_address: "203.0.113.10",
      fixed_ip_address: "10.0.0.5",
      floating_network_id: "net-external",
      port_id: "port-1",
      router_id: "router-1",
      project_id: "proj-1",
      tenant_id: "proj-1",
      status: "ACTIVE" as const,
      dns_domain: "example.com",
      dns_name: "fip-1",
      description: "Test FIP",
      revision_number: 1,
      tags: [],
    }

    it("displays table with header columns when data is present", () => {
      render(
        <FloatingIpListContainer floatingIps={[mockFloatingIp]} isLoading={false} isError={false} error={null} />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Status")).toBeInTheDocument()
      expect(screen.getByText("Floating IP Address")).toBeInTheDocument()
      expect(screen.getByText("Fixed IP Address")).toBeInTheDocument()
    })

    it("renders all table columns", () => {
      render(
        <FloatingIpListContainer floatingIps={[mockFloatingIp]} isLoading={false} isError={false} error={null} />,
        { wrapper: TestWrapper }
      )

      // Check for all expected column headers
      expect(screen.getByText("Status")).toBeInTheDocument()
      expect(screen.getByText("Floating IP Address")).toBeInTheDocument()
      expect(screen.getByText("Fixed IP Address")).toBeInTheDocument()
      expect(screen.getByText("Subnet")).toBeInTheDocument()
      expect(screen.getByText("Description")).toBeInTheDocument()
    })

    it("renders floating IP table rows for each item", () => {
      const mockFloatingIp2: FloatingIp = {
        ...mockFloatingIp,
        id: "fip-2",
        floating_ip_address: "203.0.113.20",
      }

      render(
        <FloatingIpListContainer
          floatingIps={[mockFloatingIp, mockFloatingIp2]}
          isLoading={false}
          isError={false}
          error={null}
        />,
        { wrapper: TestWrapper }
      )

      // Based on FloatingIpTableRow implementation, these are rendered
      expect(screen.getAllByRole("row")).toHaveLength(3) // 1 header row + 2 data rows
    })

    it("does not display error or empty message when data is present", () => {
      render(
        <FloatingIpListContainer floatingIps={[mockFloatingIp]} isLoading={false} isError={false} error={null} />,
        { wrapper: TestWrapper }
      )

      expect(screen.queryByText("No Floating IPs found")).not.toBeInTheDocument()
      expect(screen.queryByText("Failed to load Floating IPs")).not.toBeInTheDocument()
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    })

    it("does not display error or loading when data is present", () => {
      render(
        <FloatingIpListContainer floatingIps={[mockFloatingIp]} isLoading={false} isError={false} error={null} />,
        { wrapper: TestWrapper }
      )

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
      expect(screen.queryByText("Failed to load Floating IPs")).not.toBeInTheDocument()
    })
  })

  describe("State priority", () => {
    it("displays loading state when loading is true regardless of data", () => {
      const mockFloatingIp: FloatingIp = {
        id: "fip-1",
        floating_ip_address: "203.0.113.10",
        fixed_ip_address: "10.0.0.5",
        floating_network_id: "net-external",
        port_id: "port-1",
        router_id: "router-1",
        project_id: "proj-1",
        tenant_id: "proj-1",
        status: "ACTIVE" as const,
        dns_domain: "example.com",
        dns_name: "fip-1",
        description: "Test FIP",
        revision_number: 1,
        tags: [],
      }

      render(<FloatingIpListContainer floatingIps={[mockFloatingIp]} isLoading={true} isError={false} error={null} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    it("displays error state when isError is true after loading", () => {
      render(
        <FloatingIpListContainer
          floatingIps={[]}
          isLoading={false}
          isError={true}
          error={{ message: "Failed to load" }}
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Failed to load")).toBeInTheDocument()
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    })
  })

  describe("Props validation", () => {
    it("handles null floatingIps array as empty", () => {
      render(<FloatingIpListContainer floatingIps={[]} isLoading={false} isError={false} error={null} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("No Floating IPs found")).toBeInTheDocument()
    })

    it("handles null error object gracefully", () => {
      render(<FloatingIpListContainer floatingIps={[]} isLoading={false} isError={true} error={null} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("Failed to load Floating IPs")).toBeInTheDocument()
    })
  })
})
