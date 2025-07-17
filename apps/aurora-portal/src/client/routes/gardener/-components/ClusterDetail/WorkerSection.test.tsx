import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import WorkerSection from "./WorkerSection"
import { Cluster } from "@/server/Gardener/types/cluster"

describe("WorkerSection", () => {
  it('renders "No worker nodes configured" message when workers array is empty', () => {
    const workers: Cluster["workers"] = []
    render(<WorkerSection workers={workers} />)

    expect(screen.getByText("No worker nodes configured for this cluster.")).toBeInTheDocument()
    expect(screen.queryByRole("row", { name: /Name Machine Type Image Scaling Zones/i })).toBeInTheDocument()
  })

  it("renders worker data correctly when workers are provided", () => {
    const workers: Cluster["workers"] = [
      {
        name: "worker-1",
        architecture: "amd64",
        machineType: "m5.large",
        containerRuntime: "containerd",
        machineImage: { name: "ubuntu", version: "20.04" },
        actual: 3,
        min: 2,
        max: 5,
        maxSurge: 1,
        zones: ["us-west-1a", "us-west-1b"],
      },
    ]

    render(<WorkerSection workers={workers} />)

    // Check header
    expect(screen.getByText("Workers")).toBeInTheDocument()
    expect(screen.getByRole("row", { name: /Name Machine Type Image Scaling Zones/i })).toBeInTheDocument()

    // Check worker data
    expect(screen.getByText("worker-1")).toBeInTheDocument()
    expect(screen.getByText("amd64")).toBeInTheDocument()
    expect(screen.getByText("m5.large")).toBeInTheDocument()
    expect(screen.getByText("containerd")).toBeInTheDocument()
    expect(screen.getByText("ubuntu")).toBeInTheDocument()
    expect(screen.getByText("v")).toBeInTheDocument()
    expect(screen.getByText("20.04")).toBeInTheDocument()
    expect(screen.getByText("3 nodes")).toBeInTheDocument()
    expect(screen.getByText("Min: 2 / Max: 5 / Surge: 1")).toBeInTheDocument()
    expect(screen.getByText("us-west-1a")).toBeInTheDocument()
    expect(screen.getByText("us-west-1b")).toBeInTheDocument()
  })

  it("handles undefined actual node count", () => {
    const workers: Cluster["workers"] = [
      {
        name: "worker-2",
        architecture: "arm64",
        machineType: "t3.medium",
        containerRuntime: "docker",
        machineImage: { name: "coreos", version: "1.2.3" },
        min: 1,
        max: 3,
        maxSurge: 2,
        zones: ["eu-central-1a"],
      },
    ]

    render(<WorkerSection workers={workers} />)

    expect(screen.getByText("? nodes")).toBeInTheDocument()
    expect(screen.getByText("Min: 1 / Max: 3 / Surge: 2")).toBeInTheDocument()
  })

  it("renders multiple workers correctly", () => {
    const workers: Cluster["workers"] = [
      {
        name: "worker-1",
        architecture: "amd64",
        machineType: "m5.large",
        containerRuntime: "containerd",
        machineImage: { name: "ubuntu", version: "20.04" },
        actual: 3,
        min: 2,
        max: 5,
        maxSurge: 1,
        zones: ["us-west-1a"],
      },
      {
        name: "worker-2",
        architecture: "arm64",
        machineType: "t3.medium",
        containerRuntime: "docker",
        machineImage: { name: "coreos", version: "1.2.3" },
        actual: 2,
        min: 1,
        max: 3,
        maxSurge: 2,
        zones: ["eu-central-1a"],
      },
    ]

    render(<WorkerSection workers={workers} />)

    expect(screen.getAllByRole("row")).toHaveLength(3) // Header + 2 worker rows
    expect(screen.getByText("worker-1")).toBeInTheDocument()
    expect(screen.getByText("worker-2")).toBeInTheDocument()
  })
})
