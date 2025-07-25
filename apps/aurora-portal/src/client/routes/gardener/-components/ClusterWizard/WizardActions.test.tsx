import { describe, it, expect, vi } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { WizardActions, WizardActionsProps } from "./WizardActions"

describe("WizardActions", () => {
  const defaultProps = {
    currentStep: 1,
    totalSteps: 3,
    isSubmitting: false,
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onSubmit: vi.fn(),
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  const setup = (props: WizardActionsProps) => {
    return render(
      <I18nProvider i18n={i18n}>
        <WizardActions {...props} />
      </I18nProvider>
    )
  }

  describe("Button rendering", () => {
    it("renders Back and Next buttons when not on final step", () => {
      setup(defaultProps)

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
    })

    it("renders Back and Create Cluster buttons on final step", () => {
      setup({ ...defaultProps, currentStep: 2 })

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /create cluster/i })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument()
    })

    it("shows check icon on Create Cluster button when not submitting", () => {
      setup({ ...defaultProps, currentStep: 2 })

      const createButton = screen.getByRole("button", { name: /create cluster/i })
      expect(createButton.querySelector("svg")).toBeInTheDocument()
    })

    it("shows loading spinner when submitting", () => {
      setup({ ...defaultProps, currentStep: 2, isSubmitting: true })

      expect(screen.getByText("Creating...")).toBeInTheDocument()
      const createButton = screen.getByRole("button", { name: /creating/i })
      expect(createButton.querySelector(".animate-spin")).toBeInTheDocument()
    })
  })

  describe("Button states", () => {
    it("disables Back button on first step", () => {
      setup({ ...defaultProps, currentStep: 0 })

      const backButton = screen.getByRole("button", { name: /back/i })
      expect(backButton).toBeDisabled()
    })

    it("enables Back button on steps after first", () => {
      setup({ ...defaultProps, currentStep: 1 })

      const backButton = screen.getByRole("button", { name: /back/i })
      expect(backButton).not.toBeDisabled()
    })

    it("disables Create Cluster button when submitting", () => {
      setup({ ...defaultProps, currentStep: 2, isSubmitting: true })

      const createButton = screen.getByRole("button", { name: /creating/i })
      expect(createButton).toBeDisabled()
    })

    it("enables Create Cluster button when not submitting", () => {
      setup({ ...defaultProps, currentStep: 2, isSubmitting: false })

      const createButton = screen.getByRole("button", { name: /create cluster/i })
      expect(createButton).not.toBeDisabled()
    })
  })

  describe("User interactions", () => {
    it("calls onPrev when Back button is clicked", async () => {
      const user = userEvent.setup()
      setup({ ...defaultProps, currentStep: 1 })

      const backButton = screen.getByRole("button", { name: /back/i })
      await user.click(backButton)

      expect(defaultProps.onPrev).toHaveBeenCalledTimes(1)
    })

    it("calls onNext when Next button is clicked", async () => {
      const user = userEvent.setup()
      setup({ ...defaultProps, currentStep: 1 })

      const nextButton = screen.getByRole("button", { name: /next/i })
      await user.click(nextButton)

      expect(defaultProps.onNext).toHaveBeenCalledTimes(1)
    })

    it("calls onSubmit when Create Cluster button is clicked", async () => {
      const user = userEvent.setup()
      setup({ ...defaultProps, currentStep: 2 })

      const createButton = screen.getByRole("button", { name: /create cluster/i })
      await user.click(createButton)

      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1)
    })

    it("does not call onPrev when Back button is disabled", async () => {
      const user = userEvent.setup()
      setup({ ...defaultProps, currentStep: 0 })

      const backButton = screen.getByRole("button", { name: /back/i })
      await user.click(backButton)

      expect(defaultProps.onPrev).not.toHaveBeenCalled()
    })

    it("does not call onSubmit when Create Cluster button is disabled", async () => {
      const user = userEvent.setup()
      setup({ ...defaultProps, currentStep: 2, isSubmitting: true })

      const createButton = screen.getByRole("button", { name: /creating/i })
      await user.click(createButton)

      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })
  })

  describe("Step progression logic", () => {
    it("shows Next button for first step", () => {
      setup({ ...defaultProps, currentStep: 0, totalSteps: 3 })

      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /create cluster/i })).not.toBeInTheDocument()
    })

    it("shows Next button for middle steps", () => {
      setup({ ...defaultProps, currentStep: 1, totalSteps: 3 })

      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /create cluster/i })).not.toBeInTheDocument()
    })

    it("shows Create Cluster button for final step", () => {
      setup({ ...defaultProps, currentStep: 2, totalSteps: 3 })

      expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /create cluster/i })).toBeInTheDocument()
    })

    it("handles single step wizard correctly", () => {
      setup({ ...defaultProps, currentStep: 0, totalSteps: 1 })

      expect(screen.getByRole("button", { name: /back/i })).toBeDisabled()
      expect(screen.getByRole("button", { name: /create cluster/i })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("has proper button roles", () => {
      setup(defaultProps)

      const buttons = screen.getAllByRole("button")
      expect(buttons).toHaveLength(2)
    })

    it("maintains focus management with disabled states", () => {
      setup({ ...defaultProps, currentStep: 0 })

      const backButton = screen.getByRole("button", { name: /back/i })
      expect(backButton).toHaveAttribute("disabled")
    })
  })

  describe("Edge cases", () => {
    it("handles zero-based step indexing correctly", () => {
      setup({ ...defaultProps, currentStep: 0, totalSteps: 2 })

      expect(screen.getByRole("button", { name: /back/i })).toBeDisabled()
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
    })

    it("handles maximum step correctly", () => {
      setup({ ...defaultProps, currentStep: 4, totalSteps: 5 })

      expect(screen.getByRole("button", { name: /back/i })).not.toBeDisabled()
      expect(screen.getByRole("button", { name: /create cluster/i })).toBeInTheDocument()
    })
  })
})
