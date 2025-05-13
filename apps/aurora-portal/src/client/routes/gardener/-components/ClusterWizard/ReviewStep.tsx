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
            <div className="text-aurora-white">{formData.kubernetesVersion}</div>

            <div className="text-aurora-gray-400">Cloud Profile</div>
            <div className="text-aurora-white">{formData.cloudProfileName}</div>

            <div className="text-aurora-gray-400">Credentials Binding</div>
            <div className="text-aurora-white">{formData.credentialsBindingName}</div>

            <div className="text-aurora-gray-400">Region</div>
            <div className="text-aurora-white">{formData.region}</div>
          </div>
        </div>
      </div>

      <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-aurora-white mb-4">Infrastructure Configuration</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-aurora-gray-400">Floating IP Pool</div>
            <div className="text-aurora-white">{formData.infrastructure.floatingPoolName}</div>
          </div>
        </div>
      </div>

      <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-aurora-white mb-4">Network Configuration</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-aurora-gray-400">Pods CIDR</div>
            <div className="text-aurora-white">{formData.networking.pods}</div>

            <div className="text-aurora-gray-400">Nodes CIDR</div>
            <div className="text-aurora-white">{formData.networking.nodes}</div>

            <div className="text-aurora-gray-400">Services CIDR</div>
            <div className="text-aurora-white">{formData.networking.services}</div>
          </div>
        </div>
      </div>

      <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-aurora-white mb-4">Worker Pools</h3>

        <div className="space-y-4">
          {formData.workers.map((worker, index) => (
            <div key={index} className={index > 0 ? "border-t border-aurora-gray-700 pt-4" : ""}>
              <h4 className="text-aurora-white font-medium mb-2">Worker Pool #{index + 1}</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="text-aurora-gray-400">Machine Type</div>
                <div className="text-aurora-white">{worker.machineType}</div>

                <div className="text-aurora-gray-400">Machine Image</div>
                <div className="text-aurora-white">
                  {worker.machineImage.name} ({worker.machineImage.version})
                </div>

                <div className="text-aurora-gray-400">Node Scaling</div>
                <div className="text-aurora-white">
                  Min: {worker.minimum}, Max: {worker.maximum}
                </div>

                <div className="text-aurora-gray-400">Availability Zones</div>
                <div className="text-aurora-white">{worker.zones.join(", ")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-950/20 border border-amber-800/50 rounded-lg p-4">
        <div className="flex gap-2">
          <svg
            className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h4 className="text-amber-500 font-medium">Important Note</h4>
            <p className="text-aurora-gray-300 text-sm mt-1">
              Please review all configurations carefully before creating the cluster. Once created, some settings cannot
              be changed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
