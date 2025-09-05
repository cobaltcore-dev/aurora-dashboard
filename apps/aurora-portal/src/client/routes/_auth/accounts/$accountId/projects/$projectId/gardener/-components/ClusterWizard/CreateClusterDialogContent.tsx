import React, { use, useState } from "react"
import { t } from "@lingui/core/macro"
import { Toast, ToastProps } from "@cloudoperators/juno-ui-components"
import { TrpcClient } from "@/client/trpcClient"
import { ClusterFormData, WorkerConfig } from "./types"
import { steps } from "./constants"
import { BasicInfoStep } from "./BasicInfoStep"
import { InfrastructureStep } from "./InfrastructureStep"
import { WorkerNodesStep } from "./WorkerNodesStep"
import { ReviewStep } from "./ReviewStep"
import { WizardProgress } from "./WizardProgress"
import { WizardActions } from "./WizardActions"

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
    cloudProfileName: "openstack",
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
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const handleToastDismiss = () => setToastData(null)

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
      setToastData({
        variant: "error",
        text: t`Cluster name is required`,
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })
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

      setToastData({
        variant: "success",
        text: t`Cluster created successfully`,
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })

      onClose()
    } catch (error) {
      setToastData({
        variant: "error",
        text: `${t`Failed to create cluster:`} ${error instanceof Error ? error.message : t`Unknown error`}`,
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })
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

      {toastData && (
        <Toast {...toastData} className="fixed top-5 right-5 z-50 border border-theme-light rounded-lg shadow-lg" />
      )}
    </div>
  )
}
