import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, beforeAll } from "vitest"
import { FlavorListContainer } from "./FlavorListContainer"
import { Flavor } from "@/server/Compute/types/flavor"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("FlavorListContainer", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockFlavors: Flavor[] = [
    {
      id: "1",
      name: "Flavor1",
      vcpus: 2,
      ram: 512,
      disk: 20,
      swap: 0,
      rxtx_factor: 1,
      "OS-FLV-EXT-DATA:ephemeral": 10,
    },
    {
      id: "2",
      name: "Flavor2",
      vcpus: 4,
      ram: 1024,
      disk: 40,
      swap: 100,
      rxtx_factor: 2,
      "OS-FLV-EXT-DATA:ephemeral": 20,
    },
  ]

  it("renders loading message when isLoading is true", async () => {
    await act(async () => {
      render(<FlavorListContainer isLoading={true} />, { wrapper: TestingProvider })
    })

    // Use findByText for async rendering
    expect(await screen.findByText("Loading...")).toBeInTheDocument()
    expect(screen.queryByText("No flavors found")).not.toBeInTheDocument()
    expect(screen.queryByText("Name")).not.toBeInTheDocument()
  })

  it("renders no flavors message when flavors is empty", async () => {
    await act(async () => {
      render(<FlavorListContainer flavors={[]} isLoading={false} />, { wrapper: TestingProvider })
    })

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    expect(await screen.findByText("No flavors found")).toBeInTheDocument()
    expect(await screen.findByText(/There are no flavors available for this project/)).toBeInTheDocument()
    expect(screen.queryByText("vCPU")).not.toBeInTheDocument()
  })

  it("renders no flavors message when flavors is undefined", async () => {
    await act(async () => {
      render(<FlavorListContainer flavors={undefined} isLoading={false} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    expect(await screen.findByText("No flavors found")).toBeInTheDocument()
    expect(await screen.findByText(/There are no flavors available for this project/)).toBeInTheDocument()
    expect(screen.queryByText("vCPU")).not.toBeInTheDocument()
  })

  it("renders the flavors table when flavors are provided", async () => {
    await act(async () => {
      render(<FlavorListContainer flavors={mockFlavors} isLoading={false} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    expect(screen.queryByText("No flavors found")).not.toBeInTheDocument()

    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("vCPU")).toBeInTheDocument()
    expect(screen.getByText("RAM (MiB)")).toBeInTheDocument()
    expect(screen.getByText("Root Disk (GiB)")).toBeInTheDocument()
    expect(screen.getByText("Ephemeral Disk (GiB)")).toBeInTheDocument()
    expect(screen.getByText("Swap (MiB)")).toBeInTheDocument()
    expect(screen.getByText("RX/TX Factor")).toBeInTheDocument()
    expect(screen.getByText("Flavor1")).toBeInTheDocument()
    expect(screen.getByText("Flavor2")).toBeInTheDocument()
  })
})
