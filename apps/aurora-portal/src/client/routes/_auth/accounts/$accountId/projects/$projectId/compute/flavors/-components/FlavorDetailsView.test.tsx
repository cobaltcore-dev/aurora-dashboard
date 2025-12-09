import { render, screen } from "@testing-library/react"
import { describe, it, expect, beforeAll } from "vitest"
import { FlavorDetailsView } from "./FlavorDetailsView"
import { PortalProvider } from "@cloudoperators/juno-ui-components/index"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </PortalProvider>
)

describe("FlavorDetailsView", () => {
  beforeAll(() => {
    i18n.activate("en")
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
    extra_specs: {
      "hw:cpu_policy": "dedicated",
      "hw:mem_page_size": "large",
    },
  }

  it("renders basic information section correctly", () => {
    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    expect(screen.getByText("Basic Information")).toBeInTheDocument()
    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByText("flavor-123")).toBeInTheDocument()
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Test Flavor")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(screen.getByText("A test flavor for unit tests")).toBeInTheDocument()
  })

  it("renders public and disabled status correctly", () => {
    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    const yesElements = screen.getAllByText("Yes")
    const noElements = screen.getAllByText("No")

    expect(yesElements).toHaveLength(1)
    expect(noElements).toHaveLength(1)
  })

  it("renders hardware specifications correctly", () => {
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
    expect(screen.getByText("Disk")).toBeInTheDocument()
    expect(screen.getByText("40 GiB")).toBeInTheDocument()
    expect(screen.getByText("Ephemeral Disk")).toBeInTheDocument()
    expect(screen.getByText("20 GiB")).toBeInTheDocument()
    expect(screen.getByText("Swap")).toBeInTheDocument()
    expect(screen.getByText("1024 MiB")).toBeInTheDocument()
    expect(screen.getByText("RX/TX Factor")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("handles zero values correctly", () => {
    const flavorWithZeros = {
      ...baseFlavor,
      disk: 0,
      swap: 0,
      "OS-FLV-EXT-DATA:ephemeral": 0,
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={flavorWithZeros} />
      </TestingProvider>
    )

    const zeroGib = screen.getAllByText("0 GiB")
    expect(zeroGib.length).toBeGreaterThanOrEqual(2) // root and eph
    expect(screen.getByText("None")).toBeInTheDocument() // For swap
  })

  it("handles empty swap string correctly", () => {
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

  it("renders extra specs when present", () => {
    render(
      <TestingProvider>
        <FlavorDetailsView flavor={baseFlavor} />
      </TestingProvider>
    )

    expect(screen.getByText("Extra Specs")).toBeInTheDocument()
    expect(screen.getByText("hw:cpu_policy")).toBeInTheDocument()
    expect(screen.getByText("dedicated")).toBeInTheDocument()
    expect(screen.getByText("hw:mem_page_size")).toBeInTheDocument()
    expect(screen.getByText("large")).toBeInTheDocument()
  })

  it("does not render extra specs section when empty", () => {
    const flavorWithoutExtraSpecs = {
      ...baseFlavor,
      extra_specs: {},
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={flavorWithoutExtraSpecs} />
      </TestingProvider>
    )

    expect(screen.queryByText("Extra Specs")).not.toBeInTheDocument()
  })

  it("does not render extra specs section when undefined", () => {
    const flavorWithoutExtraSpecs = {
      ...baseFlavor,
      extra_specs: undefined,
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={flavorWithoutExtraSpecs} />
      </TestingProvider>
    )

    expect(screen.queryByText("Extra Specs")).not.toBeInTheDocument()
  })

  it("does not render description when not provided", () => {
    const flavorWithoutDescription = {
      ...baseFlavor,
      description: undefined,
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={flavorWithoutDescription} />
      </TestingProvider>
    )

    expect(screen.getByText("Basic Information")).toBeInTheDocument()
    expect(screen.queryByText("Description")).not.toBeInTheDocument()
  })

  it("handles missing ephemeral disk data", () => {
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

  it("formats bytes correctly with different units", () => {
    const flavorForFormatting = {
      ...baseFlavor,
      ram: 0,
      disk: 0,
    }

    render(
      <TestingProvider>
        <FlavorDetailsView flavor={flavorForFormatting} />
      </TestingProvider>
    )

    expect(screen.getByText("0 MiB")).toBeInTheDocument()
    expect(screen.getByText("0 GiB")).toBeInTheDocument()
  })

  it("handles private flavors correctly", () => {
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

  it("handles disabled flavors correctly", () => {
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
