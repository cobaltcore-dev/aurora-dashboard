import React from "react"
import { ClusterFormData } from "./types"
import { GardenerLabel } from "../ui/GardenerLabel"
import { GardenerSelect } from "../ui/GardenerSelect"
import { GardenerInput } from "../ui/GardenerInput"

interface InfrastructureStepProps {
  formData: ClusterFormData
  onFormDataChange: (field: keyof ClusterFormData, value: unknown) => void
  availableFloatingPools?: string[]
}

export const InfrastructureStep: React.FC<InfrastructureStepProps> = ({
  formData,
  onFormDataChange,
  availableFloatingPools = [],
}) => {
  const handleInfrastructureChange = (field: string, value: string) => {
    onFormDataChange("infrastructure", {
      ...formData.infrastructure,
      [field]: value,
    })
  }

  const handleNetworkingChange = (field: string, value: string) => {
    onFormDataChange("networking", {
      ...formData.networking,
      [field]: value,
    })
  }

  return (
    <div className="space-y-6">
      {/* Floating IP Pool */}
      <div>
        <GardenerLabel htmlFor="floatingPool" className="text-aurora-gray-300 mb-2 block text-left">
          Floating IP Pool
        </GardenerLabel>
        <GardenerSelect
          id="floatingPool"
          name="floatingPool"
          value={formData.infrastructure.floatingPoolName}
          onChange={(e) => handleInfrastructureChange("floatingPoolName", e.target.value)}
          className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
        >
          {availableFloatingPools.length > 0 ? (
            availableFloatingPools.map((pool) => (
              <option key={pool} value={pool}>
                {pool}
              </option>
            ))
          ) : (
            <>
              <option value="FloatingIP-external-monsoon3-01">FloatingIP-external-monsoon3-01</option>
              <option value="FloatingIP-external-monsoon3-02">FloatingIP-external-monsoon3-02</option>
            </>
          )}
        </GardenerSelect>
        <p className="text-xs text-aurora-gray-500 mt-1 text-left">
          The floating IP pool to use for the cluster's external network access
        </p>
      </div>

      {/* Network Configuration Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-aurora-white text-left">Network Configuration</h3>

        <div className="space-y-6">
          {/* Pods CIDR */}
          <div>
            <GardenerLabel htmlFor="podsCIDR" className="text-aurora-gray-300 mb-2 block text-left">
              Pods CIDR
            </GardenerLabel>
            <GardenerInput
              id="podsCIDR"
              className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
              value={formData.networking.pods}
              onChange={(e) => handleNetworkingChange("pods", e.target.value)}
              placeholder="100.64.0.0/12"
            />
            <p className="text-xs text-aurora-gray-500 mt-1 text-left">IP range for pod network</p>
          </div>

          {/* Nodes CIDR */}
          <div>
            <GardenerLabel htmlFor="nodesCIDR" className="text-aurora-gray-300 mb-2 block text-left">
              Nodes CIDR
            </GardenerLabel>
            <GardenerInput
              id="nodesCIDR"
              className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
              value={formData.networking.nodes}
              onChange={(e) => handleNetworkingChange("nodes", e.target.value)}
              placeholder="10.180.0.0/16"
            />
            <p className="text-xs text-aurora-gray-500 mt-1 text-left">IP range for node network</p>
          </div>

          {/* Services CIDR */}
          <div>
            <GardenerLabel htmlFor="servicesCIDR" className="text-aurora-gray-300 mb-2 block text-left">
              Services CIDR
            </GardenerLabel>
            <GardenerInput
              id="servicesCIDR"
              className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
              value={formData.networking.services}
              onChange={(e) => handleNetworkingChange("services", e.target.value)}
              placeholder="100.104.0.0/13"
            />
            <p className="text-xs text-aurora-gray-500 mt-1 text-left">IP range for service network</p>
          </div>
        </div>

        <p className="text-sm text-aurora-gray-400 mt-4 text-left">
          <span className="font-medium">Note:</span> These network settings will be prefilled by the Kubernetes
          controller in the future.
        </p>
      </div>
    </div>
  )
}
