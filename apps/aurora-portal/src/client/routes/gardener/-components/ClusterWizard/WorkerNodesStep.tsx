// components/CreateClusterWizard/steps/WorkerNodesStep.tsx
import { Button } from "@/client/components/headless-ui/Button"
import React from "react"
import { WorkerPool } from "./WorkerPool"
import { ClusterFormData, WorkerConfig } from "./types"

interface WorkerNodesStepProps {
  formData: ClusterFormData
  onWorkerChange: (index: number, field: keyof WorkerConfig, value: unknown) => void
  onAddWorker: () => void
  onRemoveWorker: (index: number) => void
}

export const WorkerNodesStep: React.FC<WorkerNodesStepProps> = ({
  formData,
  onWorkerChange,
  onAddWorker,
  onRemoveWorker,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={onAddWorker}
          variant="secondary"
          className="border-aurora-gray-700 bg-aurora-gray-800 text-aurora-white hover:bg-aurora-gray-700"
        >
          Add Worker Pool
        </Button>
      </div>

      {formData.provider.workers.map((worker: WorkerConfig, index: number) => (
        <WorkerPool
          key={index}
          worker={worker}
          index={index}
          onWorkerChange={onWorkerChange}
          onRemove={onRemoveWorker}
        />
      ))}
    </div>
  )
}
