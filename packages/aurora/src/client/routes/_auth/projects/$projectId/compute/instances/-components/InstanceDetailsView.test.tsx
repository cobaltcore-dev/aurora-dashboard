import { render, screen } from "@testing-library/react"
import { describe, it, expect, beforeAll } from "vitest"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Server } from "@/server/Compute/types/server"
import { InstanceDetailsView } from "./InstanceDetailsView"

beforeAll(() => {
  i18n.load({ en: {} })
  i18n.activate("en")
})

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const makeServer = (overrides: Partial<Server> = {}): Server =>
  ({
    id: "srv-1",
    name: "web-1",
    status: "ACTIVE",
    created: "2026-01-01T00:00:00Z",
    flavor: { original_name: "m1.small", vcpus: 2, ram: 2048, disk: 20 },
    image: { id: "img-1" },
    "OS-EXT-AZ:availability_zone": "az-1",
    "OS-EXT-STS:power_state": 1,
    ...overrides,
  }) as Server

describe("InstanceDetailsView", () => {
  it("renders the sections and key fields", () => {
    render(
      <TestingProvider>
        <InstanceDetailsView instance={makeServer()} />
      </TestingProvider>
    )
    expect(screen.getByText("General Instance Data")).toBeInTheDocument()
    expect(screen.getByText("Compute & State")).toBeInTheDocument()
    expect(screen.getByText("m1.small")).toBeInTheDocument()
    expect(screen.getByText("Running")).toBeInTheDocument()
    expect(screen.getByText("az-1")).toBeInTheDocument()
    // Status renders as plain text, not a badge.
    expect(screen.getByText("ACTIVE")).toBeInTheDocument()
  })

  it("groups addresses by network and shows MAC/type", () => {
    const server = makeServer({
      addresses: {
        private: [{ addr: "10.0.0.5", version: 4, mac_addr: "fa:16:3e:00:00:01", type: "fixed" }],
      },
    })
    render(
      <TestingProvider>
        <InstanceDetailsView instance={server} />
      </TestingProvider>
    )
    expect(screen.getByTestId("instance-addresses-private")).toBeInTheDocument()
    expect(screen.getByText("fa:16:3e:00:00:01")).toBeInTheDocument()
    expect(screen.getByText("fixed")).toBeInTheDocument()
    expect(screen.getByText("IPv4")).toBeInTheDocument()
  })

  it("shows the No addresses empty state when there are none", () => {
    render(
      <TestingProvider>
        <InstanceDetailsView instance={makeServer({ addresses: {} })} />
      </TestingProvider>
    )
    expect(screen.getByText("No addresses")).toBeInTheDocument()
  })

  it("omits host-level attributes when absent", () => {
    render(
      <TestingProvider>
        <InstanceDetailsView instance={makeServer()} />
      </TestingProvider>
    )
    expect(screen.queryByText("Host")).not.toBeInTheDocument()
    expect(screen.queryByText("Hypervisor")).not.toBeInTheDocument()
  })

  it("shows host-level attributes when present", () => {
    render(
      <TestingProvider>
        <InstanceDetailsView instance={makeServer({ "OS-EXT-SRV-ATTR:host": "compute-01" })} />
      </TestingProvider>
    )
    expect(screen.getByRole("heading", { name: "Host" })).toBeInTheDocument()
    expect(screen.getByText("compute-01")).toBeInTheDocument()
  })
})
