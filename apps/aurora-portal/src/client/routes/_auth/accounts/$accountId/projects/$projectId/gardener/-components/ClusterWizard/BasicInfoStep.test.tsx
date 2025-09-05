import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { BasicInfoStep, BasicInfoStepProps } from "./BasicInfoStep"
import { ClusterFormData } from "./types"
import { PortalProvider } from "@cloudoperators/juno-ui-components/index"

describe("BasicInfoStep", () => {
  const mockFormData: ClusterFormData = {
    name: "",
    kubernetesVersion: "",
    region: "",
    cloudProfileName: "default-profile",
    credentialsBindingName: "",
    infrastructure: {
      floatingPoolName: "",
    },
    networking: {
      pods: "",
      nodes: "",
      services: "",
    },
    workers: [],
  }

  const mockOnFormDataChange = vi.fn()
  const mockKubernetesVersions = ["1.28.0", "1.27.5", "1.26.8"]

  const defaultProps = {
    formData: mockFormData,
    onFormDataChange: mockOnFormDataChange,
    availableKubernetesVersions: mockKubernetesVersions,
  }

  const setup = (props: BasicInfoStepProps) => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <BasicInfoStep {...props} />
        </PortalProvider>
      </I18nProvider>
    )
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    it("should render all form fields", () => {
      setup(defaultProps)

      expect(screen.getByLabelText("Cluster Name")).toBeInTheDocument()
      expect(screen.getByLabelText("Kubernetes Version")).toBeInTheDocument()
      expect(screen.getByLabelText("Cloud Profile")).toBeInTheDocument()
      expect(screen.getByTestId("region")).toBeInTheDocument()
      expect(screen.getByTestId("credentialsBinding")).toBeInTheDocument()
    })

    it("should render cluster name input with correct placeholder and max length", () => {
      setup(defaultProps)

      const clusterNameInput = screen.getByLabelText("Cluster Name")
      expect(clusterNameInput).toHaveAttribute(
        "placeholder",
        "Lowercase alphanumeric characters, dash (-) and must start with a letter"
      )
      expect(clusterNameInput).toHaveAttribute("maxLength", "200")
    })

    it("should render cloud profile as read-only", () => {
      setup(defaultProps)

      const cloudProfileInput = screen.getByLabelText("Cloud Profile")
      expect(cloudProfileInput).toHaveAttribute("readOnly")
    })

    it("should render kubernetes version options when available", () => {
      const user = userEvent.setup()
      setup(defaultProps)

      const kubernetesSelect = screen.getByLabelText("Kubernetes Version")
      user.click(kubernetesSelect)

      mockKubernetesVersions.forEach((version) => {
        expect(screen.getByText(version)).toBeInTheDocument()
      })
    })

    it("should render region options", () => {
      const user = userEvent.setup()
      setup(defaultProps)

      const regionSelect = screen.getByTestId("region")
      user.click(regionSelect)

      expect(screen.getByText("eu-de-1 (Germany)")).toBeInTheDocument()
      expect(screen.getByText("eu-de-2 (Germany)")).toBeInTheDocument()
      expect(screen.getByText("eu-nl-1 (Netherlands)")).toBeInTheDocument()
      expect(screen.getByText("na-us-1 (USA)")).toBeInTheDocument()
      expect(screen.getByText("na-us-2 (USA)")).toBeInTheDocument()
      expect(screen.getByText("ap-jp-1 (Japan)")).toBeInTheDocument()
      expect(screen.getByText("ap-au-1 (Australia)")).toBeInTheDocument()
    })

    it("should render credentials binding options", () => {
      const user = userEvent.setup()
      setup(defaultProps)

      const credentialsSelect = screen.getByTestId("credentialsBinding")
      user.click(credentialsSelect)

      expect(screen.getByText("app-cred-openstack")).toBeInTheDocument()
      expect(screen.getByText("my-openstack-secret")).toBeInTheDocument()
    })
  })

  describe("Form Data Display", () => {
    it("should display current form data values", () => {
      const formDataWithValues: ClusterFormData = {
        name: "test-cluster",
        kubernetesVersion: "1.28.0",
        region: "eu-de-1",
        cloudProfileName: "my-profile",
        credentialsBindingName: "app-cred-openstack",
        infrastructure: {
          floatingPoolName: "",
        },
        networking: {
          pods: "",
          nodes: "",
          services: "",
        },
        workers: [],
      }

      setup({ ...defaultProps, formData: formDataWithValues })

      expect(screen.getByDisplayValue("test-cluster")).toBeInTheDocument()
      expect(screen.getByDisplayValue("1.28.0")).toBeInTheDocument()
      expect(screen.getByDisplayValue("eu-de-1")).toBeInTheDocument()
      expect(screen.getByDisplayValue("my-profile")).toBeInTheDocument()
      expect(screen.getByDisplayValue("app-cred-openstack")).toBeInTheDocument()
    })
  })

  describe("Form Interactions", () => {
    it("should call onFormDataChange when cluster name changes", async () => {
      const user = userEvent.setup()
      setup(defaultProps)

      const clusterNameInput = screen.getByLabelText("Cluster Name")
      await user.type(clusterNameInput, "my-cluster")

      expect(mockOnFormDataChange).toHaveBeenCalledWith("name", "my-cluster")
    })

    it("should call onFormDataChange when kubernetes version is selected", () => {
      setup(defaultProps)

      const kubernetesSelect = screen.getByLabelText("Kubernetes Version")

      // Expand select option menu
      fireEvent.click(kubernetesSelect)

      // Select a specific option
      fireEvent.click(screen.getByText("1.28.0"))

      expect(mockOnFormDataChange).toHaveBeenCalledWith("kubernetesVersion", "1.28.0")
    })

    it("should call onFormDataChange when region is selected", () => {
      setup(defaultProps)

      const regionSelect = screen.getByTestId("region")

      // Expand select option menu
      fireEvent.click(regionSelect)

      // Select a specific option
      fireEvent.click(screen.getByText("eu-de-1 (Germany)"))

      expect(mockOnFormDataChange).toHaveBeenCalledWith("region", "eu-de-1")
    })

    it("should call onFormDataChange when credentials binding is selected", () => {
      //   const user = userEvent.setup()
      setup(defaultProps)

      const credentialsSelect = screen.getByTestId("credentialsBinding")

      // Expand select option menu
      fireEvent.click(credentialsSelect)

      // Select a specific option
      fireEvent.click(screen.getByText("my-openstack-secret"))

      expect(mockOnFormDataChange).toHaveBeenCalledWith("credentialsBindingName", "my-openstack-secret")
    })
  })

  describe("Props Handling", () => {
    it("should handle empty kubernetes versions array", () => {
      setup({ ...defaultProps, availableKubernetesVersions: [] })

      const kubernetesSelect = screen.getByLabelText("Kubernetes Version")
      fireEvent.click(kubernetesSelect)

      // Should not render any version options
      expect(screen.queryByText("1.28.0")).not.toBeInTheDocument()
    })

    it("should use default empty array when availableKubernetesVersions is not provided", () => {
      setup({ ...defaultProps, availableKubernetesVersions: undefined })

      const kubernetesSelect = screen.getByLabelText("Kubernetes Version")
      expect(kubernetesSelect).toBeInTheDocument()
    })

    it("should handle large number of kubernetes versions", () => {
      const manyVersions = Array.from({ length: 20 }, (_, i) => `1.${i}.0`)
      setup({ ...defaultProps, availableKubernetesVersions: manyVersions })

      const kubernetesSelect = screen.getByLabelText("Kubernetes Version")
      fireEvent.click(kubernetesSelect)

      // Check first and last versions are rendered
      expect(screen.getByText("1.0.0")).toBeInTheDocument()
      expect(screen.getByText("1.19.0")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("should handle cluster name with maximum length", async () => {
      const user = userEvent.setup()
      setup(defaultProps)

      const longName = "a".repeat(200)
      const clusterNameInput = screen.getByLabelText("Cluster Name")

      await user.clear(clusterNameInput)
      await user.type(clusterNameInput, longName)

      expect(mockOnFormDataChange).toHaveBeenLastCalledWith("name", longName)
    })

    it("should handle special characters in cluster name", async () => {
      const user = userEvent.setup()
      setup(defaultProps)

      const specialName = "test-cluster-123"
      const clusterNameInput = screen.getByLabelText("Cluster Name")

      await user.clear(clusterNameInput)
      await user.type(clusterNameInput, specialName)

      expect(mockOnFormDataChange).toHaveBeenLastCalledWith("name", specialName)
    })
  })
})
