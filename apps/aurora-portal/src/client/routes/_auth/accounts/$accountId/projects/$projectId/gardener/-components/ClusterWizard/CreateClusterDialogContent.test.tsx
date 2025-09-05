import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { CreateClusterDialogContent } from "./CreateClusterDialogContent"
import { TrpcClient } from "@/client/trpcClient"

describe("CreateClusterDialogContent", () => {
  const mockCloudProfiles = [
    {
      uid: "",
      provider: "",
      name: "converged-cloud",
      kubernetesVersions: ["1.32.2", "1.31.5", "1.30.8"],
      machineTypes: [
        { name: "g_c2_m4", architecture: "amd64", cpu: "2", memory: "4Gi" },
        { name: "g_c4_m8", architecture: "amd64", cpu: "4", memory: "8Gi" },
      ],
      machineImages: [
        { name: "gardenlinux", versions: ["1592.9.0", "1593.0.0"] },
        { name: "ubuntu", versions: ["20.04", "22.04"] },
      ],
      regions: [
        { name: "eu-de-1", zones: ["eu-de-1a", "eu-de-1b"] },
        { name: "us-west-1", zones: ["us-west-1a", "us-west-1b"] },
      ],
      volumeTypes: [],
    },
    {
      uid: "",
      provider: "",
      name: "aws-profile",
      kubernetesVersions: ["1.32.0", "1.31.3"],
      machineTypes: [{ name: "t3.medium", architecture: "amd64", cpu: "2", memory: "4Gi" }],
      machineImages: [{ name: "amazon-linux", versions: ["2023.1.0"] }],
      regions: [{ name: "us-east-1", zones: ["us-east-1a"] }],
      volumeTypes: [],
    },
  ]

  const mockClient = {
    gardener: {
      createCluster: {
        mutate: vi.fn(),
      },
    },
  }

  const defaultProps = {
    onClose: vi.fn(),
    client: mockClient as unknown as TrpcClient,
    isOpen: true,
    getCloudProfilesPromises: Promise.resolve(mockCloudProfiles),
  }

  const setup = (props = defaultProps) => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <CreateClusterDialogContent {...props} />
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
  /*
  describe("Component Rendering", () => {
    it("renders the dialog when isOpen is true", async () => {
      await act(async () => {
        setup()
      })

      await waitFor(() => {
        expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
      })
    })

    it("does not render when isOpen is false", async () => {
      await act(async () => {
        setup({ ...defaultProps, isOpen: false })
      })

      expect(screen.queryByText(/Cluster name and Kubernetes version/i)).not.toBeInTheDocument()
    })

    it("renders wizard progress with all steps", async () => {
      await act(async () => {
        setup()
      })

      await waitFor(() => {
        expect(screen.getByText("Basic Info")).toBeInTheDocument()
        expect(screen.getByText("Infrastructure")).toBeInTheDocument()
        expect(screen.getByText("Worker Nodes")).toBeInTheDocument()
        expect(screen.getByText("Review")).toBeInTheDocument()
      })
    })

    it("displays no cloud profiles message when profiles array is empty", async () => {
      await act(async () => {
        setup({
          ...defaultProps,
          getCloudProfilesPromises: Promise.resolve([]),
        })
      })

      await waitFor(() => {
        expect(screen.getByText("No cloud profiles available.")).toBeInTheDocument()
      })
    })
  })

  describe("Cloud Profile Handling", () => {
    it("sorts cloud profiles alphabetically by name", async () => {
      const unsortedProfiles = [
        { ...mockCloudProfiles[1], name: "z-profile" },
        { ...mockCloudProfiles[0], name: "a-profile" },
        { ...mockCloudProfiles[1], name: "m-profile" },
      ]

      await act(async () => {
        setup({
          ...defaultProps,
          getCloudProfilesPromises: Promise.resolve(unsortedProfiles),
        })
      })

      // The component should sort profiles and use the sorted order
      // We can verify this indirectly by checking the default form data
      await waitFor(() => {
        expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
      })
    })

    it("sets converged-cloud as default when available", async () => {
      await act(async () => {
        setup()
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue("converged-cloud")).toBeInTheDocument()
      })
    })

    it("handles missing converged-cloud profile gracefully", async () => {
      const profilesWithoutDefault = [mockCloudProfiles[1]]

      await act(async () => {
        setup({
          ...defaultProps,
          getCloudProfilesPromises: Promise.resolve(profilesWithoutDefault),
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
      })
    })
  })

  describe("Form Data Management", () => {
    it("initializes with default form data", async () => {
      await act(async () => {
        setup()
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue("test-cluster")).toBeInTheDocument()
        expect(screen.getByDisplayValue("converged-cloud")).toBeInTheDocument()
        expect(screen.getByDisplayValue("1.32.2")).toBeInTheDocument()
      })
    })

    it("updates form data when handleFormDataChange is called", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      await waitFor(() => {
        expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
      })

      const nameInput = screen.getByDisplayValue("test-cluster")
      await user.clear(nameInput)
      await user.type(nameInput, "new-cluster-name")

      expect(screen.getByDisplayValue("new-cluster-name")).toBeInTheDocument()
    })

    it("updates workers when handleWorkersChange is called", async () => {
      await act(async () => {
        setup()
      })

      // Navigate to worker nodes step
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await userEvent.setup().click(nextButton)
      await userEvent.setup().click(nextButton)

      await waitFor(() => {
        expect(screen.getByText("Worker Configuration")).toBeInTheDocument()
      })
    })
  })

  describe("Step Navigation", () => {
    it("advances to next step when nextStep is called", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      await waitFor(() => {
        expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText("Floating IP Pool")).toBeInTheDocument()
      })
    })

    it("goes back to previous step when prevStep is called", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      // Go to step 2
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText("Floating IP Pool")).toBeInTheDocument()
      })

      // Go back to step 1
      const backButton = screen.getByRole("button", { name: /back/i })
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
      })
    })

    it("prevents advancing when cluster name is empty", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      // Clear the cluster name
      await waitFor(() => {
        expect(screen.getByDisplayValue("test-cluster")).toBeInTheDocument()
      })

      const nameInput = screen.getByDisplayValue("test-cluster")
      await user.clear(nameInput)

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)

      expect(screen.getByText("Cluster name is required")).toBeInTheDocument()

      // Should still be on first step
      expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
    })

    it("allows navigation to previous steps via goToStep", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      // Navigate to step 2
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText("Floating IP Pool")).toBeInTheDocument()
      })

      // Click on first step in wizard progress
      const firstStepButton = screen.getByText("Basic Info").closest("button")
      if (firstStepButton) {
        await user.click(firstStepButton)

        await waitFor(() => {
          expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
        })
      }
    })

    it("prevents navigation to future steps via goToStep", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      await waitFor(() => {
        expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
      })

      // Try to click on a future step - this should not work
      const futureStepButton = screen.getByText("Review").closest("button")
      if (futureStepButton) {
        await user.click(futureStepButton)

        // Should still be on first step
        expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
      }
    })
  })

  describe("Step Content Rendering", () => {
    it("renders BasicInfoStep on step 0", async () => {
      await act(async () => {
        setup()
      })

      await waitFor(() => {
        expect(screen.getByLabelText("Cluster Name")).toBeInTheDocument()
        expect(screen.getByLabelText("Kubernetes Version")).toBeInTheDocument()
      })
    })

    it("renders InfrastructureStep on step 1", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText("Floating IP Pool")).toBeInTheDocument()
        expect(screen.getByText("Network Configuration")).toBeInTheDocument()
      })
    })

    it("renders WorkerNodesStep on step 2", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      // Navigate to step 2
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText("Worker Configuration")).toBeInTheDocument()
      })
    })

    it("renders ReviewStep on step 3", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      // Navigate to final step
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText("Cluster Configuration")).toBeInTheDocument()
      })
    })

    it("passes correct props to child components", async () => {
      await act(async () => {
        setup()
      })

      await waitFor(() => {
        // BasicInfoStep should receive availableKubernetesVersions
        expect(screen.getByDisplayValue("1.32.2")).toBeInTheDocument()
      })
    })
  })
*/
  describe("Cluster Creation", () => {
    it("calls createCluster mutation on submit", async () => {
      const user = userEvent.setup()

      mockClient.gardener.createCluster.mutate.mockResolvedValue({})

      await act(async () => {
        setup()
      })

      // Navigate to final step
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)

      await waitFor(() => {
        const createButton = screen.getByRole("button", { name: /create cluster/i })
        expect(createButton).toBeInTheDocument()
      })

      const createButton = screen.getByRole("button", { name: /create cluster/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockClient.gardener.createCluster.mutate).toHaveBeenCalledWith({
          name: "test-cluster",
          cloudProfileName: "openstack",
          credentialsBindingName: "app-cred-openstack",
          region: "eu-de-1",
          kubernetesVersion: "1.32.2",
          infrastructure: {
            floatingPoolName: "FloatingIP-external-monsoon3-01",
          },
          networking: {
            pods: "100.64.0.0/12",
            nodes: "10.180.0.0/16",
            services: "100.104.0.0/13",
          },
          workers: [
            {
              machineType: "g_c2_m4",
              machineImage: {
                name: "gardenlinux",
                version: "1592.9.0",
              },
              minimum: 1,
              maximum: 2,
              zones: ["eu-de-1a"],
            },
          ],
        })
      })

      expect(screen.getByText("Cluster created successfully")).toBeInTheDocument()
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it("handles cluster creation errors", async () => {
      const user = userEvent.setup()

      const error = new Error("Creation failed")
      mockClient.gardener.createCluster.mutate.mockRejectedValue(error)

      await act(async () => {
        setup()
      })

      // Navigate to final step
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)

      await waitFor(() => {
        const createButton = screen.getByRole("button", { name: /create cluster/i })
        expect(createButton).toBeInTheDocument()
      })

      const createButton = screen.getByRole("button", { name: /create cluster/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText("Failed to create cluster: Creation failed")).toBeInTheDocument()
      })

      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })

    it("handles unknown errors during cluster creation", async () => {
      const user = userEvent.setup()

      mockClient.gardener.createCluster.mutate.mockRejectedValue("Unknown error")

      await act(async () => {
        setup()
      })

      // Navigate to final step and submit
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)

      const createButton = screen.getByRole("button", { name: /create cluster/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText("Failed to create cluster: Unknown error")).toBeInTheDocument()
      })
    })

    it("shows loading state during submission", async () => {
      const user = userEvent.setup()

      // Make the mutation hang to test loading state
      mockClient.gardener.createCluster.mutate.mockImplementation(() => new Promise(() => {}))

      await act(async () => {
        setup()
      })

      // Navigate to final step
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)
      await user.click(nextButton)

      const createButton = screen.getByRole("button", { name: /create cluster/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText("Creating...")).toBeInTheDocument()
      })
    })
  })
  /*
  describe("Props Integration", () => {
    it("passes cloudProfileData correctly to WorkerNodesStep", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup()
      })

      // Navigate to worker nodes step
      await waitFor(() => {
        const nextButton = screen.getByRole("button", { name: /next/i })
        expect(nextButton).toBeInTheDocument()
      })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText("Worker Configuration")).toBeInTheDocument()
      })

      // The component should pass the machine types with architecture
      // This is tested indirectly by checking if the step renders
    })
  })

  describe("Error Boundary Cases", () => {
    it("handles promise rejection in cloud profiles", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      // The component uses React's `use()` hook which will throw on rejected promises
      // This is expected behavior, so we test that the error is thrown
      await expect(async () => {
        await act(async () => {
          setup({
            ...defaultProps,
            getCloudProfilesPromises: Promise.reject(new Error("Failed to load profiles")),
          })
        })
      }).rejects.toThrow("Failed to load profiles")

      consoleSpy.mockRestore()
    })
  })

  describe("Memory Management", () => {
    it("cleans up state properly when component unmounts", async () => {
      const { unmount } = await act(async () => {
        return setup()
      })

      await waitFor(() => {
        expect(screen.getByText(/Cluster name and Kubernetes version/i)).toBeInTheDocument()
      })

      unmount()

      // Component should unmount without errors
      expect(screen.queryByText(/Cluster name and Kubernetes version/i)).not.toBeInTheDocument()
    })
  })
    */
})
