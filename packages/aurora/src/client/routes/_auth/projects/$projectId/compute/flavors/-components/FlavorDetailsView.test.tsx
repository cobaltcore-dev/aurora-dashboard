import { render, screen } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest"
import { FlavorDetailsView } from "./FlavorDetailsView"
import { PortalProvider } from "@cloudoperators/juno-ui-components/index"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

let mockUseQueryReturn: { data?: Record<string, string>; isLoading?: boolean; error?: Error } = { data: {} }

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ projectId: "test-project" }),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    compute: {
      getExtraSpecs: {
        useQuery: vi.fn(() => mockUseQueryReturn),
      },
    },
  },
}))

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </PortalProvider>
)

describe("FlavorDetailsView", () => {
  beforeAll(() => {
    i18n.activate("en")
  })

  beforeEach(() => {
    mockUseQueryReturn = { data: {} }
  })

  const baseFlavor = {
    id: "flavor-123",
    name: "Test Flavor",
    description: "A test flavor for unit tests",
    vcpus: 4,
    ram: 8192,
    disk: 40,
    swap: 1024,
    rxtx_factor: 1.0,
    "os-flavor-access:is_public": true,
    "OS-FLV-DISABLED:disabled": false,
    "OS-FLV-EXT-DATA:ephemeral": 20,
  }

  it("renders flavor information section with all fields", () => {
    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    expect(screen.getByText("Flavor Information")).toBeInTheDocument()
    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByText("flavor-123")).toBeInTheDocument()
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Test Flavor")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(screen.getByText("A test flavor for unit tests")).toBeInTheDocument()
    expect(screen.getByText("Public")).toBeInTheDocument()
    expect(screen.getByText("Disabled")).toBeInTheDocument()
  })

  it("renders hardware specifications section with all fields", () => {
    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    expect(screen.getByText("Hardware Specifications")).toBeInTheDocument()
    expect(screen.getByText("VCPUs")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("RAM")).toBeInTheDocument()
    expect(screen.getByText("8192 MiB")).toBeInTheDocument()
    expect(screen.getByText("Root Disk")).toBeInTheDocument()
    expect(screen.getByText("40 GiB")).toBeInTheDocument()
    expect(screen.getByText("Ephemeral Disk")).toBeInTheDocument()
    expect(screen.getByText("20 GiB")).toBeInTheDocument()
    expect(screen.getByText("Swap")).toBeInTheDocument()
    expect(screen.getByText("1024 MiB")).toBeInTheDocument()
    expect(screen.getByText("RX/TX Factor")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("renders metadata section when specs are present", () => {
    mockUseQueryReturn = {
      data: {
        "hw:cpu_policy": "dedicated",
        "hw:mem_page_size": "large",
      },
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    expect(screen.getByText("Metadata")).toBeInTheDocument()
    expect(screen.getByText("hw:cpu_policy")).toBeInTheDocument()
    expect(screen.getByText("dedicated")).toBeInTheDocument()
    expect(screen.getByText("hw:mem_page_size")).toBeInTheDocument()
    expect(screen.getByText("large")).toBeInTheDocument()
  })

  it("does not render metadata section when specs are empty", () => {
    mockUseQueryReturn = { data: {} }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    expect(screen.queryByText("Metadata")).not.toBeInTheDocument()
  })

  it("does not render metadata section when specs are undefined", () => {
    mockUseQueryReturn = { data: undefined }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    expect(screen.queryByText("Metadata")).not.toBeInTheDocument()
  })

  it("does not render metadata section while loading", () => {
    mockUseQueryReturn = { isLoading: true, data: undefined }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    expect(screen.queryByText("Metadata")).not.toBeInTheDocument()
  })

  it("does not render metadata section on query error", () => {
    mockUseQueryReturn = { error: new Error("Failed to load"), data: undefined }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    expect(screen.queryByText("Metadata")).not.toBeInTheDocument()
  })

  it("handles zero disk values", () => {
    const flavorWithZeros = {
      ...baseFlavor,
      disk: 0,
      "OS-FLV-EXT-DATA:ephemeral": 0,
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={flavorWithZeros} />
      </TestingProvider>
    )

    const zeroGib = screen.getAllByText("0 GiB")
    expect(zeroGib.length).toBeGreaterThanOrEqual(2)
  })

  it("displays 'None' for zero swap", () => {
    const flavorWithZeroSwap = {
      ...baseFlavor,
      swap: 0,
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={flavorWithZeroSwap} />
      </TestingProvider>
    )

    expect(screen.getByText("None")).toBeInTheDocument()
  })

  it("displays 'None' for empty swap string", () => {
    const flavorWithEmptySwap = {
      ...baseFlavor,
      swap: "",
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={flavorWithEmptySwap} />
      </TestingProvider>
    )

    expect(screen.getByText("None")).toBeInTheDocument()
  })

  it("handles missing ephemeral disk", () => {
    const flavorWithoutEphemeral = {
      ...baseFlavor,
      "OS-FLV-EXT-DATA:ephemeral": undefined,
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={flavorWithoutEphemeral} />
      </TestingProvider>
    )

    expect(screen.getByText("Ephemeral Disk")).toBeInTheDocument()
    expect(screen.getByText("0 GiB")).toBeInTheDocument()
  })

  it("shows 'No' for private flavors", () => {
    const privateFlavor = {
      ...baseFlavor,
      "os-flavor-access:is_public": false,
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={privateFlavor} />
      </TestingProvider>
    )

    const noElements = screen.getAllByText("No")
    expect(noElements.length).toBeGreaterThanOrEqual(1)
  })

  it("shows 'Yes' for disabled flavors", () => {
    const disabledFlavor = {
      ...baseFlavor,
      "OS-FLV-DISABLED:disabled": true,
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={disabledFlavor} />
      </TestingProvider>
    )

    const yesElements = screen.getAllByText("Yes")
    expect(yesElements.length).toBeGreaterThanOrEqual(1)
  })
})
