import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { FlavorListContainer } from "./FlavorListContainer"
import { Flavor } from "@/server/Compute/types/flavor"

describe("FlavorListContainer", () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders loading message when isLoading is true", () => {
    render(<FlavorListContainer isLoading={true} />)
    expect(screen.getByTestId("loading")).toBeInTheDocument()
    expect(screen.queryByTestId("no-flavors")).not.toBeInTheDocument()
    expect(screen.queryByTestId("flavors-table")).not.toBeInTheDocument()
  })

  it("renders no flavors message when flavors is empty", () => {
    render(<FlavorListContainer flavors={[]} isLoading={false} />)
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument()
    expect(screen.getByTestId("no-flavors")).toBeInTheDocument()
    expect(screen.queryByTestId("flavors-table")).not.toBeInTheDocument()
  })

  it("renders the flavors table when flavors are provided", () => {
    render(<FlavorListContainer flavors={mockFlavors} isLoading={false} />)
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument()
    expect(screen.queryByTestId("no-flavors")).not.toBeInTheDocument()
    expect(screen.getByTestId("flavors-table")).toBeInTheDocument()

    mockFlavors.forEach((flavor) => {
      expect(screen.getByTestId(`flavor-row-${flavor.id}`)).toBeInTheDocument()
    })
  })
})
