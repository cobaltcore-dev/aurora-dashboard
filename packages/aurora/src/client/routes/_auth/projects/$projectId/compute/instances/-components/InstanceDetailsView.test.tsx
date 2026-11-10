import { render, screen } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi } from "vitest"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Server } from "@/server/Compute/types/server"
import { InstanceDetailsView } from "./InstanceDetailsView"

// ImageNameLink resolves the image name lazily; FlavorLink resolves the flavor
// id from the project flavor list. Stub both queries + Link here.
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    compute: {
      getImageById: { useQuery: () => ({ data: undefined, status: "pending", error: null }) },
      getFlavorsByProjectId: { useQuery: () => ({ data: { flavors: [] } }) },
    },
  },
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

const PROJECT_ID = "test-project-id"

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
        <InstanceDetailsView instance={makeServer()} projectId={PROJECT_ID} />
      </TestingProvider>
    )
    expect(screen.getByText("General Instance Data")).toBeInTheDocument()
    expect(screen.getByText("Compute & State")).toBeInTheDocument()
    expect(screen.getByText("m1.small")).toBeInTheDocument()
    expect(screen.getByText("RUNNING")).toBeInTheDocument()
    expect(screen.getByText("az-1")).toBeInTheDocument()
    // Status renders as plain text, not a badge.
    expect(screen.getByText("ACTIVE")).toBeInTheDocument()
  })

  it("shows the Image ID as a copyable control and the name as '- -' until it resolves", () => {
    const server = makeServer({ image: { id: "35ffd44f-6550-4c99-8ca3-f55099fd504a" } })
    render(
      <TestingProvider>
        <InstanceDetailsView instance={server} projectId={PROJECT_ID} />
      </TestingProvider>
    )
    // Image ID row: the raw id with a copy control, always shown.
    expect(screen.getByText("35ffd44f-6550-4c99-8ca3-f55099fd504a")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Copy 35ffd44f-6550-4c99-8ca3-f55099fd504a to clipboard/i })
    ).toBeInTheDocument()
    // Image Name row: query is pending, so it shows the placeholder, not a link.
    expect(screen.getByText("Image Name")).toBeInTheDocument()
  })

  it("shows 'Booted from volume' for boot-from-volume instances (empty image)", () => {
    render(
      <TestingProvider>
        <InstanceDetailsView instance={makeServer({ image: "" })} projectId={PROJECT_ID} />
      </TestingProvider>
    )
    // Empty image id => boot-from-volume name, and no image-id clipboard control.
    expect(screen.getByText("Booted from volume")).toBeInTheDocument()
    expect(screen.queryByText(/35ffd44f/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /35ffd44f.*to clipboard/i })).not.toBeInTheDocument()
  })

  it("renders metadata key/value pairs and tags", () => {
    const server = makeServer({
      metadata: { env: "prod", team: "aurora" },
      tags: ["frontend", "critical"],
    })
    render(
      <TestingProvider>
        <InstanceDetailsView instance={server} projectId={PROJECT_ID} />
      </TestingProvider>
    )
    // Metadata renders as key/value rows.
    expect(screen.getByText("env")).toBeInTheDocument()
    expect(screen.getByText("prod")).toBeInTheDocument()
    expect(screen.getByText("team")).toBeInTheDocument()
    expect(screen.getByText("aurora")).toBeInTheDocument()
    // Tags render as pills in the General section.
    expect(screen.getByText("frontend")).toBeInTheDocument()
    expect(screen.getByText("critical")).toBeInTheDocument()
  })

  it("renders '- -' for a metadata value that is an empty string", () => {
    render(
      <TestingProvider>
        <InstanceDetailsView instance={makeServer({ metadata: { metaKey: "" } })} projectId={PROJECT_ID} />
      </TestingProvider>
    )
    // The metadata key appears as a term; its empty value falls back to the placeholder.
    expect(screen.getByText("metaKey")).toBeInTheDocument()
    expect(screen.getAllByText("- -").length).toBeGreaterThanOrEqual(1)
  })

  it("omits the Metadata section and tags when absent", () => {
    render(
      <TestingProvider>
        <InstanceDetailsView instance={makeServer({ metadata: {}, tags: [] })} projectId={PROJECT_ID} />
      </TestingProvider>
    )
    // Metadata section is not rendered at all when there's no metadata.
    expect(screen.queryByRole("heading", { name: "Metadata" })).not.toBeInTheDocument()
    // Tags row renders no pills when there are none.
    expect(screen.queryByTestId("instance-tags")).not.toBeInTheDocument()
  })

  it("groups addresses by network and shows MAC/type", () => {
    const server = makeServer({
      addresses: {
        private: [{ addr: "10.0.0.5", version: 4, mac_addr: "fa:16:3e:00:00:01", type: "fixed" }],
      },
    })
    render(
      <TestingProvider>
        <InstanceDetailsView instance={server} projectId={PROJECT_ID} />
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
        <InstanceDetailsView instance={makeServer({ addresses: {} })} projectId={PROJECT_ID} />
      </TestingProvider>
    )
    expect(screen.getByText("No addresses")).toBeInTheDocument()
  })

  it("omits host-level attributes when absent", () => {
    render(
      <TestingProvider>
        <InstanceDetailsView instance={makeServer()} projectId={PROJECT_ID} />
      </TestingProvider>
    )
    expect(screen.queryByText("Host")).not.toBeInTheDocument()
    expect(screen.queryByText("Hypervisor")).not.toBeInTheDocument()
  })

  it("shows host-level attributes when present", () => {
    render(
      <TestingProvider>
        <InstanceDetailsView instance={makeServer({ "OS-EXT-SRV-ATTR:host": "compute-01" })} projectId={PROJECT_ID} />
      </TestingProvider>
    )
    expect(screen.getByRole("heading", { name: "Host" })).toBeInTheDocument()
    expect(screen.getByText("compute-01")).toBeInTheDocument()
  })
})
