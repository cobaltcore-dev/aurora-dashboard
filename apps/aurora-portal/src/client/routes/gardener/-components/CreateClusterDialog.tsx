// components/CreateClusterWizard/CreateClusterWizard.tsx
import React, { useState } from "react"
import { ClusterFormData, WorkerConfig } from "./ClusterWizard/types"
import { defaultWorker, steps } from "./ClusterWizard/constants"
import { toast } from "sonner"
import { BasicInfoStep } from "./ClusterWizard/BasicInfoStep"
import { InfrastructureStep } from "./ClusterWizard/InfrastructureStep"
import { WorkerNodesStep } from "./ClusterWizard/WorkerNodesStep"
import { ReviewStep } from "./ClusterWizard/ReviewStep"
import { Dialog } from "@/client/components/headless-ui/Dialog"
import { WizardHeader } from "./ClusterWizard/WizardHeader"
import { WizardProgress } from "./ClusterWizard/WizardProgress"
import { WizardActions } from "./ClusterWizard/WizardActions"
import { FieldSet } from "@/client/components/headless-ui/FieldSet"

interface CreateClusterWizardProps {
  isOpen: boolean
  onClose: () => void
}

const CreateClusterWizard: React.FC<CreateClusterWizardProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ClusterFormData>({
    name: "",
    kubernetes: {
      version: "1.31.7",
    },
    region: "eu-de-1",
    cloudProfileName: "converged-cloud",
    secretBindingName: "my-openstack-secret",
    networking: {
      type: "calico",
      pods: "100.64.0.0/12",
      nodes: "10.180.0.0/16",
      services: "100.104.0.0/13",
      ipFamilies: ["IPv4"],
    },
    provider: {
      type: "openstack",
      workers: [defaultWorker],
    },
  })

  const handleInputChange = (
    section: keyof ClusterFormData,
    field: string,
    value: string | number | boolean | string[]
  ) => {
    setFormData((prev) => {
      if (field === "") {
        return {
          ...prev,
          [section]: value,
        }
      }

      const updatedSection = { ...(prev[section as keyof typeof prev] as object) }
      ;(updatedSection as Record<string, unknown>)[field] = value

      return {
        ...prev,
        [section]: updatedSection,
      }
    })
  }

  const handleNestedInputChange = (
    section: keyof ClusterFormData,
    nestedSection: string,
    field: string,
    value: string | number | boolean | string[]
  ) => {
    setFormData((prev) => {
      if (field === "") {
        const updatedSection = { ...(prev[section as keyof typeof prev] as object) }
        ;(updatedSection as Record<string, unknown>)[nestedSection] = value

        return {
          ...prev,
          [section]: updatedSection,
        }
      }

      const sectionData = prev[section as keyof typeof prev]
      let nestedData: Record<string, unknown> = {}
      if (sectionData && typeof sectionData === "object" && nestedSection in sectionData) {
        nestedData = { ...((sectionData as Record<string, unknown>)[nestedSection] as Record<string, unknown>) }
      }
      nestedData[field] = value

      const updatedSection = { ...(sectionData as object) }
      ;(updatedSection as Record<string, unknown>)[nestedSection] = nestedData

      return {
        ...prev,
        [section]: updatedSection,
      }
    })
  }

  const handleWorkerChange = (index: number, field: keyof WorkerConfig, value: unknown) => {
    setFormData((prev) => {
      const newWorkers = [...prev.provider.workers]
      newWorkers[index] = {
        ...newWorkers[index],
        [field]: value,
      }
      return {
        ...prev,
        provider: {
          ...prev.provider,
          workers: newWorkers,
        },
      }
    })
  }

  const addWorker = () => {
    setFormData((prev) => ({
      ...prev,
      provider: {
        ...prev.provider,
        workers: [
          ...prev.provider.workers,
          {
            ...defaultWorker,
            name: `worker-pool-${prev.provider.workers.length + 1}`,
          },
        ],
      },
    }))
  }

  const removeWorker = (index: number) => {
    if (formData.provider.workers.length <= 1) {
      toast.error("At least one worker pool is required")
      return
    }

    setFormData((prev) => ({
      ...prev,
      provider: {
        ...prev.provider,
        workers: prev.provider.workers.filter((_, i) => i !== index),
      },
    }))
  }

  const nextStep = () => {
    if (currentStep === 0 && !formData.name.trim()) {
      toast.error("Cluster name is required")
      return
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (stepIndex: number) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success("Cluster created successfully")
      onClose()
    } catch (error) {
      toast.error("Failed to create cluster: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            formData={formData}
            onInputChange={handleInputChange}
            onNestedInputChange={handleNestedInputChange}
          />
        )
      case 1:
        return (
          <InfrastructureStep
            formData={formData}
            onInputChange={handleInputChange}
            onNestedInputChange={handleNestedInputChange}
          />
        )
      case 2:
        return (
          <WorkerNodesStep
            formData={formData}
            onWorkerChange={handleWorkerChange}
            onAddWorker={addWorker}
            onRemoveWorker={removeWorker}
          />
        )
      case 3:
        return <ReviewStep formData={formData} />
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-aurora-black/50">
        <div className="bg-aurora-gray-900 border border-aurora-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <WizardHeader onClose={onClose} />
            <WizardProgress steps={steps} currentStep={currentStep} onStepClick={goToStep} />
            <FieldSet>
              <div className="mb-8">{renderStepContent()}</div>
            </FieldSet>

            <WizardActions
              currentStep={currentStep}
              totalSteps={steps.length}
              isSubmitting={isSubmitting}
              onNext={nextStep}
              onPrev={prevStep}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default CreateClusterWizard
