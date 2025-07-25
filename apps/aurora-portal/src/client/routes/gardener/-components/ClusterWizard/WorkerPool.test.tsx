import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { WorkerPool, WorkerPoolProps } from "./WorkerPool"
import { WorkerConfig } from "./types"

describe("WorkerPool", () => {
  const mockMachineTypes = [
    { name: "m1.small", architecture: "x86_64", cpu: "1", memory: "2GB" },
    { name: "m1.medium", architecture: "x86_64", cpu: "2", memory: "4GB" },
    { name: "m1.large", architecture: "x86_64", cpu: "4", memory: "8GB" },
  ]

  const mockMachineImages = [
    { name: "ubuntu-20.04", versions: ["v1.0.0", "v1.1.0", "v1.2.0"] },
    { name: "ubuntu-22.04", versions: ["v2.0.0", "v2.1.0"] },
  ]

  const mockAvailableZones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  const mockWorkers: WorkerConfig[] = [
    {
      machineType: "m1.small",
      machineImage: { name: "ubuntu-20.04", version: "v1.0.0" },
      minimum: 1,
      maximum: 3,
      zones: ["us-east-1a"],
    },
  ]

  const defaultProps = {
    workers: mockWorkers,
    onWorkerChange: vi.fn(),
    onAddWorker: vi.fn(),
    onRemoveWorker: vi.fn(),
    machineTypes: mockMachineTypes,
    machineImages: mockMachineImages,
    availableZones: mockAvailableZones,
  }

  const setup = (props: WorkerPoolProps) => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <WorkerPool {...props} />
        </PortalProvider>
      </I18nProvider>
    )
  }

  beforeEach(async () => {
    cleanup()
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    it("renders the worker pool title and add button", async () => {
      await act(async () => {
        setup(defaultProps)
      })

      expect(screen.getByText("Worker Pools")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add worker pool/i })).toBeInTheDocument()
    })

    it("renders worker pools with correct numbering", async () => {
      const multipleWorkers = [
        ...mockWorkers,
        {
          machineType: "m1.medium",
          machineImage: { name: "ubuntu-22.04", version: "v2.0.0" },
          minimum: 2,
          maximum: 5,
          zones: ["us-east-1b"],
        },
      ]

      await act(async () => {
        setup({ ...defaultProps, workers: multipleWorkers })
      })

      expect(screen.getByText("Worker Pool #1")).toBeInTheDocument()
      expect(screen.getByText("Worker Pool #2")).toBeInTheDocument()
    })

    it("renders all form fields for each worker", async () => {
      await act(async () => {
        setup(defaultProps)
      })

      expect(screen.getByLabelText(/machine type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/machine image/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/image version/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/minimum nodes/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/maximum nodes/i)).toBeInTheDocument()
      expect(screen.getByText(/availability zones/i)).toBeInTheDocument()
    })

    it("shows remove button only when there are multiple workers", async () => {
      const { rerender } = await act(async () => {
        return setup(defaultProps)
      })

      // Single worker - no remove button
      expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument()

      // Multiple workers - remove button appears
      const multipleWorkers = [...mockWorkers, { ...mockWorkers[0] }]

      await act(async () => {
        rerender(
          <I18nProvider i18n={i18n}>
            <PortalProvider>
              <WorkerPool {...defaultProps} workers={multipleWorkers} />
            </PortalProvider>
          </I18nProvider>
        )
      })

      expect(screen.getAllByRole("button", { name: /close/i })).toHaveLength(2)
    })
  })

  describe("Machine Type Selection", () => {
    it("displays machine type options with CPU and memory info", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const machineTypeSelect = screen.getByLabelText(/machine type/i)

      await user.click(machineTypeSelect)

      expect(screen.getByTestId("m1.small")).toHaveTextContent("m1.small (1 CPU, 2GB)")
      expect(screen.getByTestId("m1.medium")).toHaveTextContent("m1.medium (2 CPU, 4GB)")
      expect(screen.getByTestId("m1.large")).toHaveTextContent("m1.large (4 CPU, 8GB)")
    })

    it("calls onWorkerChange when machine type is selected", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const machineTypeSelect = screen.getByLabelText(/machine type/i)

      // Expand select option menu
      await user.click(machineTypeSelect)

      // Select a specific option
      await user.click(screen.getByTestId("m1.medium"))

      expect(defaultProps.onWorkerChange).toHaveBeenCalledWith(0, "workerMachineType", "m1.medium")
    })
  })

  describe("Machine Image and Version Selection", () => {
    it("displays available machine images", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const imageSelect = screen.getByLabelText(/machine image/i)
      await user.click(imageSelect)

      expect(screen.getByTestId("ubuntu-20.04")).toBeInTheDocument()
      expect(screen.getByTestId("ubuntu-22.04")).toBeInTheDocument()
    })

    it("updates available versions when image is changed", async () => {
      const user = userEvent.setup()

      const { rerender } = await act(async () => {
        return setup(defaultProps)
      })

      // Initially shows versions for ubuntu-20.04
      const versionSelect = screen.getByLabelText(/image version/i)
      await user.click(versionSelect)
      expect(screen.getByTestId("v1.0.0")).toBeInTheDocument()

      // Change to ubuntu-22.04
      const updatedWorkers = [
        {
          ...mockWorkers[0],
          machineImage: { name: "ubuntu-22.04", version: "v2.0.0" },
        },
      ]

      await act(async () => {
        rerender(
          <I18nProvider i18n={i18n}>
            <PortalProvider>
              <WorkerPool {...defaultProps} workers={updatedWorkers} />
            </PortalProvider>
          </I18nProvider>
        )
      })

      await user.click(versionSelect)
      expect(screen.getByTestId("v2.0.0")).toBeInTheDocument()
      expect(screen.getByTestId("v2.1.0")).toBeInTheDocument()
    })

    it("calls onWorkerChange when image name is changed", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const imageSelect = screen.getByLabelText(/machine image/i)

      // Expand select option menu
      await user.click(imageSelect)

      // Select a specific option
      await user.click(screen.getByTestId("ubuntu-22.04"))

      expect(defaultProps.onWorkerChange).toHaveBeenCalledWith(0, "machineImage", {
        name: "ubuntu-22.04",
        version: "v1.0.0",
      })
    })

    it("calls onWorkerChange when image version is changed", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const versionSelect = screen.getByLabelText(/image version/i)

      // Expand select option menu
      await user.click(versionSelect)

      // Select a specific option
      await user.click(screen.getByTestId("v1.1.0"))

      expect(defaultProps.onWorkerChange).toHaveBeenCalledWith(0, "machineImage", {
        name: "ubuntu-20.04",
        version: "v1.1.0",
      })
    })
  })

  describe("Node Count Configuration", () => {
    it("displays current minimum and maximum values", async () => {
      await act(async () => {
        setup(defaultProps)
      })

      const minInput: HTMLInputElement = screen.getByLabelText(/minimum nodes/i)
      const maxInput: HTMLInputElement = screen.getByLabelText(/maximum nodes/i)

      expect(minInput.value).toBe("1")
      expect(maxInput.value).toBe("3")
    })

    it("calls onWorkerChange when minimum nodes is changed", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const minInput = screen.getByLabelText(/minimum nodes/i)
      await user.clear(minInput)
      await user.type(minInput, "2")

      expect(defaultProps.onWorkerChange).toHaveBeenCalledWith(0, "minimum", 2)
    })

    it("calls onWorkerChange when maximum nodes is changed", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const maxInput = screen.getByLabelText(/maximum nodes/i)
      await user.clear(maxInput)
      await user.type(maxInput, "5")

      expect(defaultProps.onWorkerChange).toHaveBeenCalledWith(0, "maximum", 5)
    })

    it("sets minimum constraint on maximum nodes input", async () => {
      await act(async () => {
        setup(defaultProps)
      })

      const maxInput: HTMLInputElement = screen.getByLabelText(/maximum nodes/i)
      expect(maxInput.min).toBe("1") // Should match worker.minimum
    })
  })

  describe("Availability Zones", () => {
    it("renders all available zones as checkboxes", async () => {
      await act(async () => {
        setup(defaultProps)
      })

      mockAvailableZones.forEach((zone) => {
        expect(screen.getByLabelText(zone)).toBeInTheDocument()
      })
    })

    it("shows selected zones as checked", async () => {
      await act(async () => {
        setup(defaultProps)
      })

      const selectedZone: HTMLInputElement = screen.getByLabelText("us-east-1a")
      const unselectedZone: HTMLInputElement = screen.getByLabelText("us-east-1b")

      expect(selectedZone.checked).toBe(true)
      expect(unselectedZone.checked).toBe(false)
    })

    it("adds zone when checkbox is checked", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const zoneCheckbox = screen.getByLabelText("us-east-1b")
      await user.click(zoneCheckbox)

      expect(defaultProps.onWorkerChange).toHaveBeenCalledWith(0, "zones", ["us-east-1a", "us-east-1b"])
    })

    it("removes zone when checkbox is unchecked", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const zoneCheckbox = screen.getByLabelText("us-east-1a")
      await user.click(zoneCheckbox)

      expect(defaultProps.onWorkerChange).toHaveBeenCalledWith(0, "zones", [])
    })
  })

  describe("Worker Pool Management", () => {
    it("calls onAddWorker when add button is clicked", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const addButton = screen.getByRole("button", { name: /add worker pool/i })
      await user.click(addButton)

      expect(defaultProps.onAddWorker).toHaveBeenCalledTimes(1)
    })

    it("calls onRemoveWorker when remove button is clicked", async () => {
      const user = userEvent.setup()
      const multipleWorkers = [...mockWorkers, { ...mockWorkers[0] }]

      await act(async () => {
        setup({ ...defaultProps, workers: multipleWorkers })
      })

      const removeButtons = screen.getAllByRole("button", { name: /close/i })
      await user.click(removeButtons[0])

      expect(defaultProps.onRemoveWorker).toHaveBeenCalledWith(0)
    })
  })

  describe("Edge Cases", () => {
    it("handles empty machine types array", async () => {
      await act(async () => {
        setup({ ...defaultProps, machineTypes: [] })
      })

      const machineTypeSelect = screen.getByLabelText(/machine type/i)
      fireEvent.click(machineTypeSelect)

      // Should not crash and should render empty options
      expect(machineTypeSelect).toBeInTheDocument()
    })

    it("handles empty machine images array", async () => {
      await act(async () => {
        setup({ ...defaultProps, machineImages: [] })
      })

      const imageSelect = screen.getByLabelText(/machine image/i)
      fireEvent.click(imageSelect)

      expect(imageSelect).toBeInTheDocument()
    })

    it("handles empty available zones array", async () => {
      await act(async () => {
        setup({ ...defaultProps, availableZones: [] })
      })

      expect(screen.getByText(/availability zones/i)).toBeInTheDocument()
    })

    it("handles machine image with no versions", async () => {
      const imageWithNoVersions = [{ name: "test-image", versions: [] }]
      const workerWithTestImage = [
        {
          ...mockWorkers[0],
          machineImage: { name: "test-image", version: "" },
        },
      ]

      await act(async () => {
        setup({ ...defaultProps, machineImages: imageWithNoVersions, workers: workerWithTestImage })
      })

      const versionSelect = screen.getByLabelText(/image version/i)
      expect(versionSelect).toBeInTheDocument()
    })

    it("handles non-numeric input for node counts gracefully", async () => {
      const user = userEvent.setup()

      await act(async () => {
        setup(defaultProps)
      })

      const minInput = screen.getByLabelText(/minimum nodes/i)
      await user.clear(minInput)
      await user.type(minInput, "invalid")

      // Should call onWorkerChange with NaN, letting parent handle validation
      expect(defaultProps.onWorkerChange).toHaveBeenCalledWith(0, "minimum", NaN)
    })
  })

  describe("Accessibility", () => {
    it("has proper labels for all form inputs", async () => {
      await act(async () => {
        setup(defaultProps)
      })

      expect(screen.getByLabelText(/machine type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/machine image/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/image version/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/minimum nodes/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/maximum nodes/i)).toBeInTheDocument()

      mockAvailableZones.forEach((zone) => {
        expect(screen.getByLabelText(zone)).toBeInTheDocument()
      })
    })

    it("has unique IDs for form elements across multiple workers", async () => {
      const multipleWorkers = [...mockWorkers, { ...mockWorkers[0] }]

      await act(async () => {
        setup({ ...defaultProps, workers: multipleWorkers })
      })

      const machineTypeSelects = screen.getAllByLabelText(/machine type/i)
      expect(machineTypeSelects[0]).toHaveAttribute("id", "worker-machine-type-0")
      expect(machineTypeSelects[1]).toHaveAttribute("id", "worker-machine-type-1")
    })
  })
})
