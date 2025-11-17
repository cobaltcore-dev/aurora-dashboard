import { render, screen } from "@testing-library/react"
import { expect, describe, it } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ReviewStep } from "./ReviewStep"
import { ClusterFormData } from "./types"

describe("ReviewStep", () => {
  const defaultFormData: ClusterFormData = {
    name: "test-cluster",
    kubernetesVersion: "1.27.3",
    cloudProfileName: "aws",
    credentialsBindingName: "aws-cred",
    region: "us-east-1",
    infrastructure: {
      floatingPoolName: "public-ip-pool",
    },
    networking: {
      pods: "10.244.0.0/16",
      nodes: "10.0.0.0/16",
      services: "10.96.0.0/12",
    },
    workers: [
      {
        machineType: "t3.medium",
        machineImage: { name: "ubuntu", version: "20.04" },
        minimum: 1,
        maximum: 3,
        zones: ["us-east-1a", "us-east-1b"],
      },
      {
        machineType: "t3.large",
        machineImage: { name: "ubuntu", version: "22.04" },
        minimum: 2,
        maximum: 5,
        zones: ["us-east-1c"],
      },
    ],
  }

  const setup = (formData: ClusterFormData) => {
    return render(
      <I18nProvider i18n={i18n}>
        <ReviewStep formData={formData} />
      </I18nProvider>
    )
  }

  it("renders without crashing", () => {
    setup(defaultFormData)
    expect(screen.getByText("Cluster Configuration")).toBeInTheDocument()
  })

  it("displays cluster configuration section correctly", () => {
    setup(defaultFormData)

    expect(screen.getByText("Cluster Name")).toBeInTheDocument()
    expect(screen.getByText("test-cluster")).toBeInTheDocument()
    expect(screen.getByText("Kubernetes Version")).toBeInTheDocument()
    expect(screen.getByText("1.27.3")).toBeInTheDocument()
    expect(screen.getByText("Cloud Profile")).toBeInTheDocument()
    expect(screen.getByText("aws")).toBeInTheDocument()
    expect(screen.getByText("Credentials Binding")).toBeInTheDocument()
    expect(screen.getByText("aws-cred")).toBeInTheDocument()
    expect(screen.getByText("Region")).toBeInTheDocument()
    expect(screen.getByText("us-east-1")).toBeInTheDocument()
  })

  it("displays infrastructure configuration section correctly", () => {
    setup(defaultFormData)

    expect(screen.getByText("Infrastructure Configuration")).toBeInTheDocument()
    expect(screen.getByText("Floating IP Pool")).toBeInTheDocument()
    expect(screen.getByText("public-ip-pool")).toBeInTheDocument()
  })

  it("displays network configuration section correctly", () => {
    setup(defaultFormData)

    expect(screen.getByText("Network Configuration")).toBeInTheDocument()
    expect(screen.getByText("Pods CIDR")).toBeInTheDocument()
    expect(screen.getByText("10.244.0.0/16")).toBeInTheDocument()
    expect(screen.getByText("Nodes CIDR")).toBeInTheDocument()
    expect(screen.getByText("10.0.0.0/16")).toBeInTheDocument()
    expect(screen.getByText("Services CIDR")).toBeInTheDocument()
    expect(screen.getByText("10.96.0.0/12")).toBeInTheDocument()
  })

  it("displays worker pools correctly", () => {
    setup(defaultFormData)

    expect(screen.getByText("Worker Pools")).toBeInTheDocument()
    expect(screen.getByText("Worker Pool #1")).toBeInTheDocument()
    expect(screen.getAllByText("Machine Type")).toHaveLength(defaultFormData.workers.length)
    expect(screen.getByText("t3.medium")).toBeInTheDocument()
    expect(screen.getAllByText("Machine Image")).toHaveLength(defaultFormData.workers.length)
    expect(screen.getByText("ubuntu (20.04)")).toBeInTheDocument()
    expect(screen.getAllByText("Node Scaling")).toHaveLength(defaultFormData.workers.length)
    expect(screen.getByText("Min: 1, Max: 3")).toBeInTheDocument()
    expect(screen.getAllByText("Availability Zones")).toHaveLength(defaultFormData.workers.length)
    expect(screen.getByText("us-east-1a, us-east-1b")).toBeInTheDocument()

    expect(screen.getByText("Worker Pool #2")).toBeInTheDocument()
    expect(screen.getByText("t3.large")).toBeInTheDocument()
    expect(screen.getByText("ubuntu (22.04)")).toBeInTheDocument()
    expect(screen.getByText("Min: 2, Max: 5")).toBeInTheDocument()
    expect(screen.getByText("us-east-1c")).toBeInTheDocument()
  })

  it("displays warning message", () => {
    setup(defaultFormData)

    expect(screen.getByText(/Please review all configurations carefully/)).toBeInTheDocument()
  })

  it("handles missing form data with N/A", () => {
    const emptyFormData: ClusterFormData = {
      name: "",
      kubernetesVersion: "",
      cloudProfileName: "",
      credentialsBindingName: "",
      region: "",
      infrastructure: { floatingPoolName: "" },
      networking: { pods: "", nodes: "", services: "" },
      workers: [],
    }

    setup(emptyFormData)

    const naElements = screen.getAllByText("N/A")
    expect(naElements.length).toBeGreaterThan(0)
    expect(screen.getByText("Worker Pools")).toBeInTheDocument()
  })
})
