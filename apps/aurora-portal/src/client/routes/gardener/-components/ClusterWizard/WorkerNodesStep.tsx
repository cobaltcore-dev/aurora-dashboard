// components/CreateClusterWizard/steps/WorkerNodesStep.tsx
import React from "react"
import { WorkerPool } from "./WorkerPool"
import { ClusterFormData, WorkerConfig } from "./types"
import { Trans } from "@lingui/react/macro"
import { Message } from "@cloudoperators/juno-ui-components/index"

interface WorkerNodesStepProps {
  formData: ClusterFormData
  onWorkersChange: (workers: WorkerConfig[]) => void
  cloudProfileData?: {
    machineTypes: Array<{ name: string; architecture: string; cpu: string; memory: string }>
    machineImages: Array<{ name: string; versions: string[] }>
    regions: Array<{ name: string; zones: string[] }>
  }
}

export const WorkerNodesStep: React.FC<WorkerNodesStepProps> = ({ formData, onWorkersChange, cloudProfileData }) => {
  // Get available zones for the selected region
  const selectedRegion = cloudProfileData?.regions.find((r) => r.name === formData.region)
  const availableZones = selectedRegion?.zones || []

  const handleWorkerChange = (index: number, field: keyof WorkerConfig | string, value: unknown) => {
    const newWorkers = [...formData.workers]
    if (field === "machineImage") {
      newWorkers[index] = {
        ...newWorkers[index],
        machineImage: value as { name: string; version: string },
      }
    } else {
      newWorkers[index] = {
        ...newWorkers[index],
        [field]: value,
      }
    }
    onWorkersChange(newWorkers)
  }

  const handleAddWorker = () => {
    const defaultWorker: WorkerConfig = {
      machineType: "g_c2_m4",
      machineImage: {
        name: "gardenlinux",
        version: "1592.9.0",
      },
      minimum: 1,
      maximum: 2,
      zones: availableZones.length > 0 ? [availableZones[0]] : [],
    }

    onWorkersChange([...formData.workers, defaultWorker])
  }

  const handleRemoveWorker = (index: number) => {
    if (formData.workers.length <= 1) {
      // You might want to show an error toast here
      console.error("At least one worker pool is required")
      return
    }

    onWorkersChange(formData.workers.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <Message dismissible={false} variant="info">
        <Trans>
          Each worker pool will automatically scale between its minimum and maximum node counts based on workload
          demands. Ensure your maximum node counts align with your resource quotas.
        </Trans>
      </Message>
      <div>
        <h2 className="text-lg font-medium text-theme-high mb-2 text-left">
          <Trans>Worker Configuration</Trans>
        </h2>
        <p className="text-sm text-theme-light text-left">
          <Trans>
            Configure the worker pools for your cluster. These settings determine the compute resources available for
            your workloads.
          </Trans>
        </p>
      </div>

      <WorkerPool
        workers={formData.workers}
        onWorkerChange={handleWorkerChange}
        onAddWorker={handleAddWorker}
        onRemoveWorker={handleRemoveWorker}
        machineTypes={cloudProfileData?.machineTypes || []}
        machineImages={cloudProfileData?.machineImages || []}
        availableZones={availableZones}
      />
    </div>
  )
}
