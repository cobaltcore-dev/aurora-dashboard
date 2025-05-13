// components/CreateClusterWizard/steps/BasicInfoStep.tsx
import { Input, Label } from "@headlessui/react"
import React from "react"
import { ClusterFormData } from "./types"
import { Select } from "@/client/components/headless-ui/Select"

interface BasicInfoStepProps {
  formData: ClusterFormData
  onInputChange: (section: keyof ClusterFormData, field: string, value: string) => void
  onNestedInputChange: (section: keyof ClusterFormData, nestedSection: string, field: string, value: string) => void
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ formData, onInputChange, onNestedInputChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="clusterName" className="text-aurora-gray-300">
          Cluster Name
        </Label>
        <Input
          id="clusterName"
          className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
          placeholder="my-cluster"
          value={formData.name}
          onChange={(e) => onInputChange("name", "", e.target.value)}
        />
        <p className="text-xs text-aurora-gray-500 mt-1">
          Lowercase alphanumeric characters, dash (-) and must start with a letter
        </p>
      </div>

      <div>
        <Label htmlFor="kubeVersion" className="text-aurora-gray-300">
          Kubernetes Version
        </Label>
        <Select
          name="kubeVersion"
          value={formData.kubernetes.version}
          onChange={(e) => onNestedInputChange("kubernetes", "version", "", e.target.value)}
        >
          <div className="bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white">
            <option value="1.31.7">1.31.7</option>
            <option value="1.30.9">1.30.9</option>
            <option value="1.29.12">1.29.12</option>
          </div>
        </Select>
      </div>
    </div>
  )
}
