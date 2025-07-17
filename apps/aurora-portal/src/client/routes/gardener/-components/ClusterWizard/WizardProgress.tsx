// components/CreateClusterWizard/WizardProgress.tsx
import React from "react"
import { cn } from "../../-utils/cn"
import { Icon } from "@cloudoperators/juno-ui-components/index"

interface WizardProgressProps {
  steps: Array<{ title: string; description: string }>
  currentStep: number
  onStepClick: (stepIndex: number) => void
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-3 px-1">
        {steps.map((step, index) => (
          <div key={step.title} className={`flex-1 ${index < steps.length - 1 ? "pr-6" : ""}`}>
            <div
              className={cn(
                "flex items-start p-2 rounded-md transition-colors duration-150 ease-in-out",
                index <= currentStep ? "cursor-pointer opacity-100" : "opacity-40 cursor-not-allowed",
                index < currentStep && index <= currentStep ? "hover:bg-theme-background-lvl-0" : ""
              )}
              onClick={() => onStepClick(index)}
              role="button"
              tabIndex={index <= currentStep ? 0 : -1}
              aria-disabled={index > currentStep}
              aria-label={`Go to step ${index + 1}: ${step.title}${index > currentStep ? " (not available yet)" : ""}`}
            >
              <div className="flex-shrink-0 mt-1">
                <div
                  className={cn(
                    "flex items-center justify-center h-6 w-6 rounded-full mr-3 text-sm font-semibold transition-colors duration-150",
                    currentStep > index
                      ? "text-theme-success shadow-sm"
                      : currentStep === index
                        ? "bg-theme-info text-theme-light shadow-md"
                        : "text-theme-light border border-theme-box-default"
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
                    "text-sm font-medium text-left transition-colors duration-150",
                    currentStep >= index ? "text-theme-light" : "text-theme-default"
                  )}
                >
                  {step.title}
                </p>
                <p
                  className={cn(
                    "text-xs line-clamp-2 text-left transition-colors duration-150",
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
