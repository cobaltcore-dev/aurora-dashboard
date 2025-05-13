// components/CreateClusterWizard/WizardProgress.tsx
import React from "react"
import { Check } from "lucide-react"
import { cn } from "@/client/utils/cn"

interface WizardProgressProps {
  steps: Array<{ title: string; description: string }>
  currentStep: number
  onStepClick: (stepIndex: number) => void
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between mb-3 px-1">
        {steps.map((step, index) => (
          <div key={step.title} className={`flex-1 ${index < steps.length - 1 ? "pr-6" : ""}`}>
            <div
              className={cn(
                "flex items-start p-2 rounded-md",
                index <= currentStep ? "cursor-pointer opacity-100" : "opacity-40 cursor-not-allowed",
                index < currentStep
                  ? "hover:bg-aurora-gray-800/60 hover:translate-y-[-2px] transition-all duration-200"
                  : ""
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
                    "flex items-center justify-center h-8 w-8 rounded-full mr-3 text-sm font-semibold transition-colors duration-200",
                    currentStep > index
                      ? "bg-aurora-green-600 text-aurora-white shadow-sm"
                      : currentStep === index
                        ? "bg-aurora-blue-600 text-aurora-white shadow-md"
                        : "bg-aurora-gray-800 text-aurora-gray-500 border border-aurora-gray-700"
                  )}
                >
                  {currentStep > index ? <Check className="h-5 w-5" /> : <span>{index + 1}</span>}
                </div>
              </div>
              <div className="w-full min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    currentStep >= index ? "text-aurora-white" : "text-aurora-gray-500"
                  )}
                >
                  {step.title}
                </p>
                <p
                  className={cn(
                    "text-xs line-clamp-2 max-w-[90%]",
                    currentStep >= index ? "text-aurora-gray-500" : "text-aurora-gray-600"
                  )}
                >
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-4">
        <div className="absolute left-1 right-1 top-1/2 transform -translate-y-1/2 h-1 bg-aurora-gray-700 rounded-full">
          <div
            className="h-1 bg-aurora-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>
        <div className="h-2"></div>
      </div>
    </div>
  )
}
