// components/CreateClusterWizard/steps/WorkerNodesStep.tsx
import React from "react"
import { WorkerPool } from "./WorkerPool"
import { ClusterFormData, WorkerConfig } from "./types"

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
      <div>
        <h2 className="text-lg font-medium text-aurora-white mb-2">Worker Configuration</h2>
        <p className="text-sm text-aurora-gray-400">
          Configure the worker pools for your cluster. These settings determine the compute resources available for your
          workloads.
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

      <div className="bg-blue-950/20 border border-blue-800/50 rounded-lg p-4">
        <div className="flex gap-2">
          <svg
            className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-blue-500 font-medium">Node Auto-scaling</h4>
            <p className="text-aurora-gray-300 text-sm mt-1">
              Each worker pool will automatically scale between its minimum and maximum node counts based on workload
              demands. Ensure your maximum node counts align with your resource quotas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
