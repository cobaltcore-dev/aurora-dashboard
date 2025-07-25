// components/CreateClusterWizard/WizardActions.tsx
import React from "react"
import { Check, Loader } from "lucide-react"

import { Button, ButtonRow, ModalFooter } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

export interface WizardActionsProps {
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
    <ModalFooter className="flex justify-end gap-3 px-8 mt-8">
      <ButtonRow>
        <Button onClick={onPrev} disabled={currentStep === 0} variant="default">
          <Trans>Back</Trans>
        </Button>
        {currentStep < totalSteps - 1 ? (
          <Button onClick={onNext} variant="primary">
            <Trans>Next</Trans>
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={isSubmitting} variant="primary">
            {isSubmitting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Create Cluster
              </>
            )}
            <Trans>Next</Trans>
          </Button>
        )}
      </ButtonRow>
    </ModalFooter>
  )
}
