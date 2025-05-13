// components/CreateClusterWizard/WizardActions.tsx
import React from "react"
import { ChevronLeft, ChevronRight, Check, Loader } from "lucide-react"
import { Button } from "@/client/components/headless-ui/Button"
import { cn } from "@/client/utils/cn"

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
        variant="secondary"
        className={cn(
          "border-aurora-gray-700 bg-aurora-gray-800 text-aurora-white hover:bg-aurora-gray-700",
          currentStep === 0 ? "opacity-50 cursor-not-allowed" : ""
        )}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {currentStep < totalSteps - 1 ? (
        <Button onClick={onNext} className="bg-aurora-blue-600 hover:bg-aurora-blue-700 text-aurora-white">
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button
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
        </Button>
      )}
    </div>
  )
}
