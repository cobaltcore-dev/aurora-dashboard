// components/CreateClusterWizard/WizardActions.tsx
import React from "react"
import { ChevronLeft, ChevronRight, Check, Loader } from "lucide-react"
import { cn } from "../../-utils/cn"
import { GardenerButton } from "../ui/GardenerButton"

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
      <GardenerButton
        onClick={onPrev}
        disabled={currentStep === 0}
        variant="secondary"
        className={cn(
          "border-aurora-gray-700 bg-aurora-gray-800 text-aurora-white hover:bg-aurora-gray-700",
          currentStep === 0 ? "opacity-50 cursor-not-allowed" : ""
        )}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </GardenerButton>

      {currentStep < totalSteps - 1 ? (
        <GardenerButton onClick={onNext} className="bg-aurora-blue-600 hover:bg-aurora-blue-700 text-aurora-white">
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </GardenerButton>
      ) : (
        <GardenerButton
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-aurora-green-600 hover:bg-aurora-green-700 text-aurora-white"
        >
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
        </GardenerButton>
      )}
    </div>
  )
}
