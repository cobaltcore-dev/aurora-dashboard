import React, { use, useState } from "react"
import { ClusterFormData, WorkerConfig } from "./types"
import { steps } from "./constants"
import { toast } from "sonner"
import { BasicInfoStep } from "./BasicInfoStep"
import { InfrastructureStep } from "./InfrastructureStep"
import { WorkerNodesStep } from "./WorkerNodesStep"
import { ReviewStep } from "./ReviewStep"
import { WizardProgress } from "./WizardProgress"
import { WizardActions } from "./WizardActions"
import { TrpcClient } from "@/client/trpcClient"
type CloudProfile = Awaited<ReturnType<TrpcClient["gardener"]["getCloudProfiles"]["query"]>>[number]

export const CreateClusterDialogContent: React.FC<{
  onClose: () => void
  client: TrpcClient
  isOpen: boolean
  getCloudProfilesPromises: Promise<CloudProfile[]>
}> = ({ onClose, getCloudProfilesPromises, isOpen, client }) => {
  const cloudProfiles = use(getCloudProfilesPromises)
  cloudProfiles.sort((a, b) => a.name.localeCompare(b.name))
  const defaultCloudProfile = cloudProfiles.find((profile) => profile.name === "converged-cloud")

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<ClusterFormData>({
    name: "test-cluster",
    cloudProfileName: "converged-cloud",
    credentialsBindingName: "app-cred-openstack",
    region: "eu-de-1",
    kubernetesVersion: "1.32.2",
    infrastructure: {
      floatingPoolName: "FloatingIP-external-monsoon3-01",
    },
    networking: {
      pods: "100.64.0.0/12",
      nodes: "10.180.0.0/16",
      services: "100.104.0.0/13",
    },
    workers: [
      {
        machineType: "g_c2_m4",
        machineImage: {
          name: "gardenlinux",
          version: "1592.9.0",
        },
        minimum: 1,
        maximum: 2,
        zones: ["eu-de-1a"],
      },
    ],
  })

  const handleFormDataChange = (field: keyof ClusterFormData, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleWorkersChange = (workers: WorkerConfig[]) => {
    setFormData((prev) => ({
      ...prev,
      workers,
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
      await client.gardener.createCluster.mutate({
        ...formData,
      }) // Adjust the type as needed
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
    const selectedCloudProfile =
      cloudProfiles.find((cp) => cp.name === formData.cloudProfileName) || defaultCloudProfile

    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            formData={formData}
            onFormDataChange={handleFormDataChange}
            availableKubernetesVersions={selectedCloudProfile?.kubernetesVersions || []}
          />
        )
      case 1:
        return <InfrastructureStep formData={formData} onFormDataChange={handleFormDataChange} />
      case 2:
        return (
          <WorkerNodesStep
            formData={formData}
            onWorkersChange={handleWorkersChange}
            cloudProfileData={{
              machineTypes: (selectedCloudProfile?.machineTypes || []).map((mt) => ({
                ...mt,
                architecture: mt.architecture ?? "",
              })),
              machineImages: selectedCloudProfile?.machineImages || [],
              regions: (selectedCloudProfile?.regions || []).map((region) => ({
                ...region,
                zones: region.zones ?? [],
              })),
            }}
          />
        )
      case 3:
        return <ReviewStep formData={formData} />
      default:
        return null
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!cloudProfiles || cloudProfiles.length === 0) {
    return <p className="text-theme-light">No cloud profiles available.</p>
  }

  return (
    <div className="p-6">
      <WizardProgress steps={steps} currentStep={currentStep} onStepClick={goToStep} />
      <div className="mb-8">{renderStepContent()}</div>

      <WizardActions
        currentStep={currentStep}
        totalSteps={steps.length}
        isSubmitting={isSubmitting}
        onNext={nextStep}
        onPrev={prevStep}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
