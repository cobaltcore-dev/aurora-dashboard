// components/CreateClusterWizard/steps/InfrastructureStep.tsx
import { Input } from "@/client/components/headless-ui/Input"
import { Label } from "@/client/components/headless-ui/Label"
import { Select } from "@/client/components/headless-ui/Select"
import React from "react"
import { ClusterFormData } from "./types"

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
      <div>
        <Label htmlFor="floatingPool" className="text-aurora-gray-300">
          Floating IP Pool
        </Label>
        <Select
          id="floatingPool"
          name="floatingPool"
          value={formData.infrastructure.floatingPoolName}
          onChange={(e) => handleInfrastructureChange("floatingPoolName", e.target.value)}
          className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
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
        </Select>
        <p className="text-xs text-aurora-gray-500 mt-1">
          The floating IP pool to use for the cluster's external network access
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-aurora-white">Network Configuration</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="podsCIDR" className="text-aurora-gray-300">
              Pods CIDR
            </Label>
            <Input
              id="podsCIDR"
              className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
              value={formData.networking.pods}
              onChange={(e) => handleNetworkingChange("pods", e.target.value)}
              placeholder="100.64.0.0/12"
            />
            <p className="text-xs text-aurora-gray-500 mt-1">IP range for pod network</p>
          </div>

          <div>
            <Label htmlFor="nodesCIDR" className="text-aurora-gray-300">
              Nodes CIDR
            </Label>
            <Input
              id="nodesCIDR"
              className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
              value={formData.networking.nodes}
              onChange={(e) => handleNetworkingChange("nodes", e.target.value)}
              placeholder="10.180.0.0/16"
            />
            <p className="text-xs text-aurora-gray-500 mt-1">IP range for node network</p>
          </div>

          <div>
            <Label htmlFor="servicesCIDR" className="text-aurora-gray-300">
              Services CIDR
            </Label>
            <Input
              id="servicesCIDR"
              className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
              value={formData.networking.services}
              onChange={(e) => handleNetworkingChange("services", e.target.value)}
              placeholder="100.104.0.0/13"
            />
            <p className="text-xs text-aurora-gray-500 mt-1">IP range for service network</p>
          </div>
        </div>

        <p className="text-sm text-aurora-gray-400 mt-4">
          <span className="font-medium">Note:</span> These network settings will be prefilled by the Kubernetes
          controller in the future.
        </p>
      </div>
    </div>
  )
}
