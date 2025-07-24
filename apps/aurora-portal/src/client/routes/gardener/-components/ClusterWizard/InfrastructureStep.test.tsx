import { render, screen, fireEvent, act } from "@testing-library/react"
import { vi } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { InfrastructureStep, InfrastructureStepProps } from "./InfrastructureStep"
import { ClusterFormData } from "./types"

describe("InfrastructureStep", () => {
  const defaultFormData: ClusterFormData = {
    name: "",
    kubernetesVersion: "",
    cloudProfileName: "",
    credentialsBindingName: "",
    region: "",
    infrastructure: { floatingPoolName: "" },
    networking: { pods: "", nodes: "", services: "" },
    workers: [],
  }

  const setup = (props: InfrastructureStepProps) => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <InfrastructureStep {...props} />
        </PortalProvider>
      </I18nProvider>
    )
  }

  beforeEach(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const defaultProps = {
    formData: defaultFormData,
    onFormDataChange: vi.fn(),
    availableFloatingPools: ["FloatingIP-test-01", "FloatingIP-test-02"],
  }

  it("renders the component with all form elements", () => {
    setup(defaultProps)

    expect(screen.getByText("Floating IP Pool")).toBeInTheDocument()
    expect(screen.getByText("Network Configuration")).toBeInTheDocument()
    expect(screen.getByLabelText("Pods CIDR")).toBeInTheDocument()
    expect(screen.getByLabelText("Nodes CIDR")).toBeInTheDocument()
    expect(screen.getByLabelText("Services CIDR")).toBeInTheDocument()
  })

  it("displays provided floating IP pool options", () => {
    setup(defaultProps)

    const select = screen.getByLabelText("Floating IP Pool")
    fireEvent.mouseDown(select) // Open the dropdown
    expect(screen.getByText("FloatingIP-test-01")).toBeInTheDocument()
    expect(screen.getByText("FloatingIP-test-02")).toBeInTheDocument()
  })

  it("falls back to default floating IP pool options when none provided", () => {
    setup({ ...defaultProps, availableFloatingPools: [] })

    const select = screen.getByLabelText("Floating IP Pool")
    fireEvent.mouseDown(select) // Open the dropdown
    expect(screen.getByText("FloatingIP-external-monsoon3-01")).toBeInTheDocument()
    expect(screen.getByText("FloatingIP-external-monsoon3-02")).toBeInTheDocument()
  })

  it("calls onFormDataChange when floating IP pool is selected", () => {
    setup(defaultProps)

    const select = screen.getByLabelText("Floating IP Pool")
    fireEvent.mouseDown(select) // Open the dropdown
    fireEvent.click(screen.getByText("FloatingIP-test-01"))

    expect(defaultProps.onFormDataChange).toHaveBeenCalledWith("infrastructure", {
      ...defaultFormData.infrastructure,
      floatingPoolName: "FloatingIP-test-01",
    })
  })

  it("calls onFormDataChange when pods CIDR input changes", () => {
    setup(defaultProps)

    const podsInput = screen.getByLabelText("Pods CIDR")
    fireEvent.change(podsInput, { target: { value: "192.168.0.0/16" } })

    expect(defaultProps.onFormDataChange).toHaveBeenCalledWith("networking", {
      ...defaultFormData.networking,
      pods: "192.168.0.0/16",
    })
  })

  it("calls onFormDataChange when nodes CIDR input changes", () => {
    setup(defaultProps)

    const nodesInput = screen.getByLabelText("Nodes CIDR")
    fireEvent.change(nodesInput, { target: { value: "10.0.0.0/16" } })

    expect(defaultProps.onFormDataChange).toHaveBeenCalledWith("networking", {
      ...defaultFormData.networking,
      nodes: "10.0.0.0/16",
    })
  })

  it("calls onFormDataChange when services CIDR input changes", () => {
    setup(defaultProps)

    const servicesInput = screen.getByLabelText("Services CIDR")
    fireEvent.change(servicesInput, { target: { value: "172.16.0.0/12" } })

    expect(defaultProps.onFormDataChange).toHaveBeenCalledWith("networking", {
      ...defaultFormData.networking,
      services: "172.16.0.0/12",
    })
  })

  it("displays form data values in inputs", () => {
    const formDataWithValues: ClusterFormData = {
      infrastructure: {
        floatingPoolName: "FloatingIP-test-01",
      },
      networking: {
        pods: "192.168.0.0/16",
        nodes: "10.0.0.0/16",
        services: "172.16.0.0/12",
      },
      name: "",
      kubernetesVersion: "",
      cloudProfileName: "",
      credentialsBindingName: "",
      region: "",
      workers: [],
    }

    const { container } = setup({ ...defaultProps, formData: formDataWithValues })

    expect(container.querySelector("input[name=floatingPool]")).toHaveValue("FloatingIP-test-01")
    expect(screen.getByLabelText("Pods CIDR")).toHaveValue("192.168.0.0/16")
    expect(screen.getByLabelText("Nodes CIDR")).toHaveValue("10.0.0.0/16")
    expect(screen.getByLabelText("Services CIDR")).toHaveValue("172.16.0.0/12")
  })
})
