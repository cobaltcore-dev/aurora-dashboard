import { cleanup, render, screen } from "@testing-library/react"
import { describe, it, expect, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Network } from "@/server/Network/types/network"
import { NetworkSegmentationTab } from "./NetworkSegmentationTab"

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const mockNetwork: Network = {
  id: "net-1",
  name: "private",
  description: "",
  status: "ACTIVE",
  admin_state_up: true,
  shared: false,
  subnets: [],
  project_id: "proj-1",
  "provider:network_type": "vlan",
  "provider:physical_network": "physnet1",
  "provider:segmentation_id": 100,
} as Network

const renderTab = (network: Network = mockNetwork) =>
  render(<NetworkSegmentationTab network={network} />, { wrapper: TestWrapper })

describe("NetworkSegmentationTab", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("shows a datagrid with segmentation columns when provider data is present", () => {
    renderTab()

    expect(screen.getByTestId("segmentation-table")).toBeInTheDocument()
    expect(screen.getByText("Network Type")).toBeInTheDocument()
    expect(screen.getByText("Physical Network")).toBeInTheDocument()
    expect(screen.getByText("Segmentation ID")).toBeInTheDocument()
  })

  it("displays the provider field values in the segmentation row", () => {
    renderTab()

    expect(screen.getByTestId("segmentation-table")).toHaveTextContent("vlan")
    expect(screen.getByTestId("segmentation-table")).toHaveTextContent("physnet1")
    expect(screen.getByTestId("segmentation-table")).toHaveTextContent("100")
  })

  it("shows segment count above the datagrid", () => {
    renderTab()

    expect(screen.getByTestId("segment-count")).toHaveTextContent("1 segment")
    expect(screen.getByTestId("segment-count")).toHaveTextContent("vlan: 1")
  })

  it("shows 'No Segmentation Data' when all provider fields are absent", () => {
    renderTab({
      ...mockNetwork,
      "provider:network_type": null,
      "provider:physical_network": null,
      "provider:segmentation_id": null,
    })

    expect(screen.queryByTestId("segmentation-table")).not.toBeInTheDocument()
    expect(screen.getByTestId("segmentation-empty")).toBeInTheDocument()
  })

  it("shows '- -' for present-but-null provider sub-fields", () => {
    renderTab({
      ...mockNetwork,
      "provider:network_type": "vlan",
      "provider:physical_network": null,
      "provider:segmentation_id": null,
    })

    const table = screen.getByTestId("segmentation-table")
    expect(table).toHaveTextContent("vlan")
    expect(table.textContent).toContain("- -")
  })
})
