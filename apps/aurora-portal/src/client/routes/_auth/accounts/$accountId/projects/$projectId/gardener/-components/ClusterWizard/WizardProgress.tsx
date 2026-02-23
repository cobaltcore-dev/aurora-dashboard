// components/CreateClusterWizard/WizardProgress.tsx
import React from "react"
import { Icon } from "@cloudoperators/juno-ui-components"
import { cn } from "@/client/utils/cn"

interface WizardProgressProps {
  steps: Array<{ title: string; description: string }>
  currentStep: number
  onStepClick: (stepIndex: number) => void
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="mb-6" data-testid="wizard-progress-container">
      <div className="mb-3 flex justify-between px-1">
        {steps.map((step, index) => (
          <div key={step.title} className={cn("flex-1", index < steps.length - 1 && "pr-6")}>
            <div
              className={cn(
                "flex items-start rounded-md p-2 transition-colors duration-150 ease-in-out",
                index <= currentStep ? "cursor-pointer opacity-100" : "cursor-not-allowed opacity-40",
                index < currentStep && index <= currentStep ? "hover:bg-theme-background-lvl-0" : ""
              )}
              onClick={() => onStepClick(index)}
              role="button"
              tabIndex={index <= currentStep ? 0 : -1}
              aria-disabled={index > currentStep}
              aria-label={`Go to step ${index + 1}: ${step.title}${index > currentStep ? " (not available yet)" : ""}`}
            >
              <div className="mt-1 flex-shrink-0">
                <div
                  className={cn(
                    "mr-3 flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-150",
                    currentStep > index
                      ? "text-theme-success shadow-sm"
                      : currentStep === index
                        ? "bg-theme-info text-theme-light shadow-md"
                        : "text-theme-light border-theme-box-default border"
                  )}
                >
                  {currentStep > index ? (
                    <Icon icon="checkCircle" className="h-5 w-5" />
                  ) : (
                    <span className="text-theme-light">{index + 1}</span>
                  )}
                </div>
              </div>
              <div className="w-full min-w-0">
                <p
                  className={cn(
                    "text-left text-sm font-medium transition-colors duration-150",
                    currentStep >= index ? "text-theme-light" : "text-theme-default"
                  )}
                >
                  {step.title}
                </p>
                <p
                  className={cn(
                    "line-clamp-2 text-left text-xs transition-colors duration-150",
                    currentStep >= index ? "text-theme-default" : "text-theme-default opacity-50"
                  )}
                >
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
