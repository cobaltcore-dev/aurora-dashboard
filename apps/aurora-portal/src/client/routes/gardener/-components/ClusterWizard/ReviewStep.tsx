// components/CreateClusterWizard/steps/ReviewStep.tsx
import React from "react"
import { ClusterFormData } from "./types"

interface ReviewStepProps {
  formData: ClusterFormData
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ formData }) => {
  return (
    <div className="space-y-6">
      <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-aurora-white mb-4">Cluster Configuration</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-aurora-gray-400">Cluster Name</div>
            <div className="text-aurora-white">{formData.name}</div>

            <div className="text-aurora-gray-400">Kubernetes Version</div>
            <div className="text-aurora-white">{formData.kubernetes.version}</div>

            <div className="text-aurora-gray-400">Provider</div>
            <div className="text-aurora-white">{formData.provider.type}</div>

            <div className="text-aurora-gray-400">Region</div>
            <div className="text-aurora-white">{formData.region}</div>

            <div className="text-aurora-gray-400">Network Type</div>
            <div className="text-aurora-white">{formData.networking.type}</div>
          </div>
        </div>
      </div>

      <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-aurora-white mb-4">Worker Pools</h3>

        <div className="space-y-4">
          {formData.provider.workers.map((worker, index) => (
            <div key={index} className="border-b border-aurora-gray-700 pb-4 last:border-0 last:pb-0">
              <h4 className="font-medium text-aurora-white mb-2">{worker.name}</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="text-aurora-gray-400">Machine Type</div>
                <div className="text-aurora-white">{worker.machineType}</div>

                <div className="text-aurora-gray-400">Machine Image</div>
                <div className="text-aurora-white">
                  {worker.machineImageName} {worker.machineImageVersion}
                </div>

                <div className="text-aurora-gray-400">Architecture</div>
                <div className="text-aurora-white">{worker.architecture}</div>

                <div className="text-aurora-gray-400">Scaling</div>
                <div className="text-aurora-white">
                  Min: {worker.min}, Max: {worker.max}, Surge: {worker.maxSurge}
                </div>

                <div className="text-aurora-gray-400">Zones</div>
                <div className="text-aurora-white">{worker.zones.join(", ")}</div>

                <div className="text-aurora-gray-400">Container Runtime</div>
                <div className="text-aurora-white">{worker.containerRuntime}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
