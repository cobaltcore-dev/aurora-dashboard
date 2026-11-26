import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { RouterInterface } from "@/server/Network/types/router"
import { RouterInterfacesTable } from "./RouterInterfacesTable"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string
    params: Record<string, string>
    children: ReactNode
    className?: string
  }) => {
    const href = Object.entries(params ?? {}).reduce((acc, [k, v]) => acc.replace(`$${k}`, v), to)
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  },
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "proj-1",
}))

const TestWrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

const mockInterface: RouterInterface = {
  port_id: "port-1",
  port_name: "",
  network_id: "net-1",
  network_name: "private-net",
  device_owner: "network:router_interface",
  status: "ACTIVE",
  admin_state_up: true,
  fixed_ips: [{ subnet_id: "subnet-1", subnet_name: "private-subnet", ip_address: "10.180.1.1" }],
}

const renderTable = (props: Partial<Parameters<typeof RouterInterfacesTable>[0]> = {}) =>
  render(
    <RouterInterfacesTable interfaces={[mockInterface]} isLoading={false} isError={false} error={null} {...props} />,
    { wrapper: TestWrapper }
  )

describe("RouterInterfacesTable", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe("States", () => {
    it("renders the loading state", () => {
      renderTable({ isLoading: true })

      expect(screen.getByText("Loading Internal Networks...")).toBeInTheDocument()
      expect(screen.queryByTestId("router-interfaces-table")).not.toBeInTheDocument()
    })

    it("renders the error message", () => {
      renderTable({ isError: true, error: { message: "Ports could not be loaded" } })

      expect(screen.getByText("Ports could not be loaded")).toBeInTheDocument()
    })

    it("renders the default error message when the error has no message", () => {
      renderTable({ isError: true, error: null })

      expect(screen.getByText("Failed to Load Internal Networks")).toBeInTheDocument()
    })

    it("offers a retry in the error state", async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()
      renderTable({ isError: true, error: { message: "Ports could not be loaded" }, onRetry })

      await user.click(screen.getByRole("button", { name: "Try Again" }))

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("renders no retry action without onRetry", () => {
      renderTable({ isError: true, error: null })

      expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
    })

    it("renders the empty state inside the table", () => {
      renderTable({ interfaces: [] })

      expect(screen.getByText("No Internal Networks")).toBeInTheDocument()
      expect(screen.getByText("Name / ID")).toBeInTheDocument()
    })
  })

  describe("Data", () => {
    it("renders the column headers without a toolbar", () => {
      renderTable()

      expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
        "Name / ID",
        "Fixed IPs",
        "Type",
        "Admin State",
      ])
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
    })

    it("renders one row per interface", () => {
      renderTable({ interfaces: [mockInterface, { ...mockInterface, port_id: "port-2" }] })

      expect(screen.getByTestId("router-interface-row-port-1")).toBeInTheDocument()
      expect(screen.getByTestId("router-interface-row-port-2")).toBeInTheDocument()
    })

    it("links the network name to its detail page, with a copyable ID", () => {
      renderTable()

      const link = screen.getByRole("link", { name: /private-net/ })
      expect(link).toHaveAttribute("href", "/projects/proj-1/network/networks/net-1")
      expect(link).toHaveClass("text-inherit", "hover:underline")
      expect(screen.getByRole("button", { name: /copy net-1 to clipboard/i })).toBeInTheDocument()
      // fixed IP and subnet copy still render
      const row = screen.getByTestId("router-interface-row-port-1")
      expect(row).toHaveTextContent("10.180.1.1")
      expect(row).toHaveTextContent("UP")
      expect(screen.getByRole("button", { name: /copy subnet-1 to clipboard/i })).toBeInTheDocument()
    })

    it("links the network ID when the name is unknown", () => {
      renderTable({ interfaces: [{ ...mockInterface, network_name: undefined }] })

      expect(screen.getAllByText("- -")).not.toHaveLength(0)
      const link = screen.getByRole("link", { name: /net-1/ })
      expect(link).toHaveAttribute("href", "/projects/proj-1/network/networks/net-1")
      expect(screen.getByRole("button", { name: /copy net-1 to clipboard/i })).toBeInTheDocument()
    })

    it("renders all fixed IPs of an interface", () => {
      renderTable({
        interfaces: [
          {
            ...mockInterface,
            fixed_ips: [
              { subnet_id: "subnet-1", ip_address: "10.180.1.1" },
              { subnet_id: "subnet-v6", ip_address: "2001:db8::1" },
            ],
          },
        ],
      })

      expect(screen.getByText("10.180.1.1")).toBeInTheDocument()
      expect(screen.getByText("2001:db8::1")).toBeInTheDocument()
      // each fixed IP exposes its subnet_id as a copy affordance
      expect(screen.getByRole("button", { name: /copy subnet-1 to clipboard/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /copy subnet-v6 to clipboard/i })).toBeInTheDocument()
    })

    it.each([
      [false, "DOWN"],
      [undefined, "- -"],
    ])("renders admin_state_up=%s as %s", (adminStateUp, text) => {
      renderTable({ interfaces: [{ ...mockInterface, admin_state_up: adminStateUp }] })

      expect(screen.getByTestId("router-interface-row-port-1")).toHaveTextContent(text)
    })
  })
})
