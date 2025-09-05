import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { WizardProgress } from "./WizardProgress"

const mockSteps = [
  { title: "Basic Info", description: "Enter cluster name and description" },
  { title: "Configuration", description: "Set up cluster configuration" },
  { title: "Review", description: "Review and confirm settings" },
]

describe("WizardProgress", () => {
  describe("Rendering", () => {
    it("renders all steps with correct titles and descriptions", () => {
      render(<WizardProgress steps={mockSteps} currentStep={0} onStepClick={vi.fn()} />)

      expect(screen.getByText("Basic Info")).toBeInTheDocument()
      expect(screen.getByText("Enter cluster name and description")).toBeInTheDocument()
      expect(screen.getByText("Configuration")).toBeInTheDocument()
      expect(screen.getByText("Set up cluster configuration")).toBeInTheDocument()
      expect(screen.getByText("Review")).toBeInTheDocument()
      expect(screen.getByText("Review and confirm settings")).toBeInTheDocument()
    })

    it("renders step numbers for incomplete steps", () => {
      render(<WizardProgress steps={mockSteps} currentStep={0} onStepClick={vi.fn()} />)

      expect(screen.getByText("1")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("3")).toBeInTheDocument()
    })

    it("renders check icons for completed steps", () => {
      render(<WizardProgress steps={mockSteps} currentStep={2} onStepClick={vi.fn()} />)

      // First two steps should have check icons (completed)
      const checkIcons = screen.getAllByRole("img")
      expect(checkIcons).toHaveLength(2)

      // Current step (step 3) should still show number
      expect(screen.getByText("3")).toBeInTheDocument()
    })
  })

  describe("Step States", () => {
    it("applies correct accessibility attributes for current step", () => {
      render(<WizardProgress steps={mockSteps} currentStep={1} onStepClick={vi.fn()} />)

      const currentStepButton = screen.getByLabelText("Go to step 2: Configuration")
      expect(currentStepButton).toHaveAttribute("tabIndex", "0")
      expect(currentStepButton).toHaveAttribute("aria-disabled", "false")
    })

    it("applies correct accessibility attributes for completed steps", () => {
      render(<WizardProgress steps={mockSteps} currentStep={2} onStepClick={vi.fn()} />)

      const completedStepButton = screen.getByLabelText("Go to step 1: Basic Info")
      expect(completedStepButton).toHaveAttribute("tabIndex", "0")
      expect(completedStepButton).toHaveAttribute("aria-disabled", "false")
    })

    it("applies correct accessibility attributes for future steps", () => {
      render(<WizardProgress steps={mockSteps} currentStep={0} onStepClick={vi.fn()} />)

      const futureStepButton = screen.getByLabelText("Go to step 2: Configuration (not available yet)")
      expect(futureStepButton).toHaveAttribute("tabIndex", "-1")
      expect(futureStepButton).toHaveAttribute("aria-disabled", "true")
    })

    it("applies cursor-pointer class to clickable steps", () => {
      render(<WizardProgress steps={mockSteps} currentStep={1} onStepClick={vi.fn()} />)

      const currentStep = screen.getByLabelText("Go to step 2: Configuration")
      const completedStep = screen.getByLabelText("Go to step 1: Basic Info")

      expect(currentStep).toHaveClass("cursor-pointer")
      expect(completedStep).toHaveClass("cursor-pointer")
    })

    it("applies cursor-not-allowed class to future steps", () => {
      render(<WizardProgress steps={mockSteps} currentStep={0} onStepClick={vi.fn()} />)

      const futureStep = screen.getByLabelText("Go to step 2: Configuration (not available yet)")
      expect(futureStep).toHaveClass("cursor-not-allowed")
    })
  })

  describe("Click Handling", () => {
    it("calls onStepClick when clicking on current step", () => {
      const mockOnStepClick = vi.fn()
      render(<WizardProgress steps={mockSteps} currentStep={1} onStepClick={mockOnStepClick} />)

      const currentStepButton = screen.getByLabelText("Go to step 2: Configuration")
      fireEvent.click(currentStepButton)

      expect(mockOnStepClick).toHaveBeenCalledWith(1)
      expect(mockOnStepClick).toHaveBeenCalledTimes(1)
    })

    it("calls onStepClick when clicking on completed step", () => {
      const mockOnStepClick = vi.fn()
      render(<WizardProgress steps={mockSteps} currentStep={2} onStepClick={mockOnStepClick} />)

      const completedStepButton = screen.getByLabelText("Go to step 1: Basic Info")
      fireEvent.click(completedStepButton)

      expect(mockOnStepClick).toHaveBeenCalledWith(0)
      expect(mockOnStepClick).toHaveBeenCalledTimes(1)
    })

    it("calls onStepClick when clicking on future step (even though disabled)", () => {
      const mockOnStepClick = vi.fn()
      render(<WizardProgress steps={mockSteps} currentStep={0} onStepClick={mockOnStepClick} />)

      const futureStepButton = screen.getByLabelText("Go to step 2: Configuration (not available yet)")
      fireEvent.click(futureStepButton)

      expect(mockOnStepClick).toHaveBeenCalledWith(1)
      expect(mockOnStepClick).toHaveBeenCalledTimes(1)
    })

    it("calls onStepClick with correct step index for multiple clicks", () => {
      const mockOnStepClick = vi.fn()
      render(<WizardProgress steps={mockSteps} currentStep={2} onStepClick={mockOnStepClick} />)

      const step1Button = screen.getByLabelText("Go to step 1: Basic Info")
      const step2Button = screen.getByLabelText("Go to step 2: Configuration")
      const step3Button = screen.getByLabelText("Go to step 3: Review")

      fireEvent.click(step1Button)
      fireEvent.click(step2Button)
      fireEvent.click(step3Button)

      expect(mockOnStepClick).toHaveBeenNthCalledWith(1, 0)
      expect(mockOnStepClick).toHaveBeenNthCalledWith(2, 1)
      expect(mockOnStepClick).toHaveBeenNthCalledWith(3, 2)
      expect(mockOnStepClick).toHaveBeenCalledTimes(3)
    })
  })

  describe("Edge Cases", () => {
    it("handles single step", () => {
      const singleStep = [{ title: "Only Step", description: "The only step" }]
      render(<WizardProgress steps={singleStep} currentStep={0} onStepClick={vi.fn()} />)

      expect(screen.getByText("Only Step")).toBeInTheDocument()
      expect(screen.getByText("The only step")).toBeInTheDocument()
      expect(screen.getByText("1")).toBeInTheDocument()
    })

    it("handles currentStep beyond last step", () => {
      render(<WizardProgress steps={mockSteps} currentStep={5} onStepClick={vi.fn()} />)

      // All steps should be completed (show check icons)
      const checkIcons = screen.getAllByRole("img")
      expect(checkIcons).toHaveLength(3)
    })

    it("handles negative currentStep", () => {
      render(<WizardProgress steps={mockSteps} currentStep={-1} onStepClick={vi.fn()} />)

      // All steps should be disabled/future steps
      mockSteps.forEach((_, index) => {
        const stepButton = screen.getByLabelText(
          `Go to step ${index + 1}: ${mockSteps[index].title} (not available yet)`
        )
        expect(stepButton).toHaveAttribute("aria-disabled", "true")
        expect(stepButton).toHaveAttribute("tabIndex", "-1")
      })
    })

    it("handles empty steps array", () => {
      render(<WizardProgress steps={[]} currentStep={0} onStepClick={vi.fn()} />)

      // Should render without crashing and show empty container
      const container = screen.getByTestId("wizard-progress-container")
      expect(container).toBeInTheDocument()
    })

    it("handles long step titles and descriptions", () => {
      const longSteps = [
        {
          title: "Very Long Step Title That Exceeds Normal Length",
          description:
            "This is a very long description that should be handled properly by the component and potentially truncated with line-clamp-2 class",
        },
      ]

      render(<WizardProgress steps={longSteps} currentStep={0} onStepClick={vi.fn()} />)

      expect(screen.getByText("Very Long Step Title That Exceeds Normal Length")).toBeInTheDocument()
      expect(screen.getByText(/This is a very long description/)).toBeInTheDocument()
    })
  })

  describe("Visual States", () => {
    it("applies correct opacity classes based on step state", () => {
      render(<WizardProgress steps={mockSteps} currentStep={1} onStepClick={vi.fn()} />)

      const completedStep = screen.getByLabelText("Go to step 1: Basic Info")
      const currentStep = screen.getByLabelText("Go to step 2: Configuration")
      const futureStep = screen.getByLabelText("Go to step 3: Review (not available yet)")

      expect(completedStep).toHaveClass("opacity-100")
      expect(currentStep).toHaveClass("opacity-100")
      expect(futureStep).toHaveClass("opacity-40")
    })
  })
})
