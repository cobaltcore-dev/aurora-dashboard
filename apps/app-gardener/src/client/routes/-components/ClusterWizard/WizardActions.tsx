// components/CreateClusterWizard/WizardActions.tsx
import React from "react"
import { ChevronLeft, ChevronRight, Check, Loader } from "lucide-react"
import { cn } from "../../-utils/cn"
import { Button } from "@cloudoperators/juno-ui-components"

interface WizardActionsProps {
  currentStep: number
  totalSteps: number
  isSubmitting: boolean
  onNext: () => void
  onPrev: () => void
  onSubmit: () => void
}

export const WizardActions: React.FC<WizardActionsProps> = ({
  currentStep,
  totalSteps,
  isSubmitting,
  onNext,
  onPrev,
  onSubmit,
}) => {
  return (
    <div className="flex justify-between">
      <Button
        onClick={onPrev}
        disabled={currentStep === 0}
        className={cn(
          "border-aurora-gray-700 bg-aurora-gray-800 text-aurora-white hover:bg-aurora-gray-700",
          currentStep === 0 ? "opacity-50 cursor-not-allowed" : ""
        )}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {currentStep < totalSteps - 1 ? (
        <Button onClick={onNext}>
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={onSubmit} disabled={isSubmitting} variant="primary">
          {isSubmitting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Create Cluster
            </>
          )}
        </Button>
      )}
    </div>
  )
}
