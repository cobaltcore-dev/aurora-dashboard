// components/CreateClusterWizard/steps/InfrastructureStep.tsx
import { Input } from "@/client/components/headless-ui/Input"
import { Label } from "@/client/components/headless-ui/Label"
import { Select } from "@/client/components/headless-ui/Select"
import React from "react"
import { ClusterFormData } from "./types"

interface InfrastructureStepProps {
  formData: ClusterFormData
  onInputChange: (section: keyof ClusterFormData, field: string, value: string) => void
  onNestedInputChange: (section: keyof ClusterFormData, nestedSection: string, field: string, value: string) => void
}

export const InfrastructureStep: React.FC<InfrastructureStepProps> = ({
  formData,
  onInputChange,
  onNestedInputChange,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="provider" className="text-aurora-gray-300">
            Infrastructure Provider
          </Label>
          <Select
            name=""
            value={formData.provider.type}
            onChange={(e) => onInputChange("provider", "type", e.target.value)}
          >
            <div className="bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white">
              <option value="openstack">OpenStack</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
            </div>
          </Select>
        </div>

        <div>
          <Label htmlFor="region" className="text-aurora-gray-300">
            Region
          </Label>
          <Select
            name=""
            value={formData.provider.type}
            onChange={(e) => onInputChange("provider", "type", e.target.value)}
          >
            <option value="eu-de-1">EU (Germany)</option>
            <option value="eu-nl-1">EU (Netherlands)</option>
            <option value="na-us-1">NA (US)</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="networkType" className="text-aurora-gray-300">
          Network Type
        </Label>
        <Select
          name=""
          value={formData.provider.type}
          className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
          onChange={(e) => onInputChange("provider", "type", e.target.value)}
        >
          <div className="bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white">
            <option value="openstack">OpenStack</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </div>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="podsCIDR" className="text-aurora-gray-300">
            Pods CIDR
          </Label>
          <Input
            id="podsCIDR"
            className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
            value={formData.networking.pods}
            onChange={(e) => onNestedInputChange("networking", "pods", "", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="nodesCIDR" className="text-aurora-gray-300">
            Nodes CIDR
          </Label>
          <Input
            id="nodesCIDR"
            className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
            value={formData.networking.nodes}
            onChange={(e) => onNestedInputChange("networking", "nodes", "", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="servicesCIDR" className="text-aurora-gray-300">
            Services CIDR
          </Label>
          <Input
            id="servicesCIDR"
            className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
            value={formData.networking.services}
            onChange={(e) => onNestedInputChange("networking", "services", "", e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
