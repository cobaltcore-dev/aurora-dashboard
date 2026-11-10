import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Server } from "@/server/Compute/types/server"
import { InstanceListView } from "./InstanceListView"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ projectId: "test-project-id" }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

// Rows render ImageNameLink + FlavorLink, which query getImageById /
// getFlavorsByProjectId; stub both.
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    compute: {
      getImageById: { useQuery: () => ({ data: undefined, status: "pending", error: null }) },
      getFlavorsByProjectId: { useQuery: () => ({ data: { flavors: [] } }) },
    },
  },
}))

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const makeServer = (i: number, overrides: Partial<Server> = {}): Server =>
  ({
    id: `srv-${i}`,
    name: `web-${i}`,
    "OS-EXT-STS:power_state": 1,
    created: "2026-01-01T00:00:00Z",
    flavor: { original_name: "m1.small" },
    image: { id: `img-${i}` },
    "OS-EXT-AZ:availability_zone": "az-1",
    ...overrides,
  }) as Server

const makeServers = (count: number): Server[] => Array.from({ length: count }, (_, i) => makeServer(i + 1))

const DETAIL = {
  to: "/projects/$projectId/compute/instances/$instanceId",
  params: { projectId: "test-project-id", instanceId: "srv-1" },
}

describe("InstanceListView", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.load({ en: {} })
      i18n.activate("en")
    })
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn()
  })

  beforeEach(() => vi.clearAllMocks())

  it("renders a row per instance, showing '- -' in the image column until the name resolves", async () => {
    await act(async () => {
      render(
        <InstanceListView
          instances={[
            makeServer(1, { image: { id: "35ffd44f-6550-4c99-8ca3-f55099fd504a" } }),
            makeServer(2, { image: "" }),
          ]}
          currentPage={1}
          totalPages={1}
        />,
        { wrapper: TestingProvider }
      )
    })
    expect(screen.getByText("web-1")).toBeInTheDocument()
    // Image column shows "- -" while the name query is pending (and for the
    // boot-from-volume row with image ""); the raw id is never surfaced here.
    expect(screen.queryByText(/35ffd44f/)).not.toBeInTheDocument()
    expect(screen.getAllByText("- -").length).toBeGreaterThanOrEqual(2)
    // Power State column renders the label (RUNNING = power_state 1).
    expect(screen.getAllByText("RUNNING").length).toBeGreaterThanOrEqual(1)
  })

  it("renders the empty state when there are no instances", async () => {
    await act(async () => {
      render(<InstanceListView instances={[]} currentPage={1} totalPages={1} />, { wrapper: TestingProvider })
    })
    expect(screen.getByText("No instances found")).toBeInTheDocument()
  })

  it("navigates to the detail route on row click and from the 'View details' menu item", async () => {
    await act(async () => {
      render(<InstanceListView instances={makeServers(1)} currentPage={1} totalPages={1} />, {
        wrapper: TestingProvider,
      })
    })

    fireEvent.click(screen.getByTestId("instance-row-srv-1"))
    expect(mockNavigate).toHaveBeenCalledWith(DETAIL)

    // Open the row overflow menu (its trigger carries the "More" title/label).
    const menuTrigger = screen.getByRole("button", { name: /more/i })
    fireEvent.click(menuTrigger)
    fireEvent.click(await screen.findByText("View details"))
    expect(mockNavigate).toHaveBeenCalledTimes(2)
    expect(mockNavigate).toHaveBeenLastCalledWith(DETAIL)
  })

  it("renders pagination only when multi-page, and fires onPageChange on next", async () => {
    const onPageChange = vi.fn()
    const { rerender } = render(
      <InstanceListView instances={makeServers(10)} currentPage={1} totalPages={1} onPageChange={onPageChange} />,
      { wrapper: TestingProvider }
    )
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument()

    await act(async () => {
      rerender(
        <InstanceListView instances={makeServers(50)} currentPage={1} totalPages={3} onPageChange={onPageChange} />
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
