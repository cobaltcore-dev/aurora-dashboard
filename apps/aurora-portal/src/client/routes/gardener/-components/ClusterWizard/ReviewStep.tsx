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
        <h3 className="text-lg font-medium text-aurora-white mb-4 text-left">Cluster Configuration</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-aurora-gray-400 text-left">Cluster Name</div>
            <div className="text-aurora-white text-left">{formData.name}</div>

            <div className="text-aurora-gray-400 text-left">Kubernetes Version</div>
            <div className="text-aurora-white text-left">{formData.kubernetesVersion}</div>

            <div className="text-aurora-gray-400 text-left">Cloud Profile</div>
            <div className="text-aurora-white text-left">{formData.cloudProfileName}</div>

            <div className="text-aurora-gray-400 text-left">Credentials Binding</div>
            <div className="text-aurora-white text-left">{formData.credentialsBindingName}</div>

            <div className="text-aurora-gray-400 text-left">Region</div>
            <div className="text-aurora-white text-left">{formData.region}</div>
          </div>
        </div>
      </div>

      <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-aurora-white mb-4 text-left">Infrastructure Configuration</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-aurora-gray-400 text-left">Floating IP Pool</div>
            <div className="text-aurora-white text-left">{formData.infrastructure.floatingPoolName}</div>
          </div>
        </div>
      </div>

      <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-aurora-white mb-4 text-left">Network Configuration</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-aurora-gray-400 text-left">Pods CIDR</div>
            <div className="text-aurora-white text-left">{formData.networking.pods}</div>

            <div className="text-aurora-gray-400 text-left">Nodes CIDR</div>
            <div className="text-aurora-white text-left">{formData.networking.nodes}</div>

            <div className="text-aurora-gray-400 text-left">Services CIDR</div>
            <div className="text-aurora-white text-left">{formData.networking.services}</div>
          </div>
        </div>
      </div>

      <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-aurora-white mb-4 text-left">Worker Pools</h3>

        <div className="space-y-4">
          {formData.workers.map((worker, index) => (
            <div key={index} className={index > 0 ? "border-t border-aurora-gray-700 pt-4" : ""}>
              <h4 className="text-aurora-gray-300/90 font-medium mb-2 text-left">Worker Pool #{index + 1}</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="text-aurora-gray-400 text-left">Machine Type</div>
                <div className="text-aurora-white text-left">{worker.machineType}</div>

                <div className="text-aurora-gray-400 text-left">Machine Image</div>
                <div className="text-aurora-white text-left">
                  {worker.machineImage.name} ({worker.machineImage.version})
                </div>

                <div className="text-aurora-gray-400 text-left">Node Scaling</div>
                <div className="text-aurora-white text-left">
                  Min: {worker.minimum}, Max: {worker.maximum}
                </div>

                <div className="text-aurora-gray-400 text-left">Availability Zones</div>
                <div className="text-aurora-white text-left">{worker.zones.join(", ")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-aurora-amber-950/20 border border-aurora-amber-800/50 rounded-lg p-4">
        <div className="flex gap-2">
          <svg
            className="w-5 h-5 text-aurora-amber-500 mt-0.5 flex-shrink-0"
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
            <h4 className="text-aurora-amber-500 font-medium text-left">Important Note</h4>
            <p className="text-aurora-gray-300 text-sm mt-1 text-left">
              Please review all configurations carefully before creating the cluster. Once created, some settings cannot
              be changed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
