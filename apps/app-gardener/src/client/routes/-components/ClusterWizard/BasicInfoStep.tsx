// components/CreateClusterWizard/steps/BasicInfoStep.tsx
import React from "react"
import { ClusterFormData } from "./types"
import { GardenerLabel } from "../ui/GardenerLabel"
import { GardenerInput } from "../ui/GardenerInput"
import { GardenerSelect } from "../ui/GardenerSelect"

interface BasicInfoStepProps {
  formData: ClusterFormData
  onFormDataChange: (field: keyof ClusterFormData, value: string) => void
  availableKubernetesVersions?: string[]
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  onFormDataChange,
  availableKubernetesVersions = [],
}) => {
  return (
    <div className="space-y-6">
      {/* Cluster Name */}
      <div>
        <GardenerLabel htmlFor="clusterName" className="text-aurora-gray-300 mb-2 block text-left">
          Cluster Name
        </GardenerLabel>
        <GardenerInput
          id="clusterName"
          className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
          placeholder="my-cluster"
          value={formData.name}
          onChange={(e) => onFormDataChange("name", e.target.value)}
        />
        <p className="text-xs text-left text-aurora-gray-500 mt-1">
          Lowercase alphanumeric characters, dash (-) and must start with a letter
        </p>
      </div>

      {/* Kubernetes Version */}
      <div>
        <GardenerLabel htmlFor="kubeVersion" className="text-aurora-gray-300 mb-2 block text-left">
          Kubernetes Version
        </GardenerLabel>
        <GardenerSelect
          id="kubeVersion"
          name="kubeVersion"
          value={formData.kubernetesVersion}
          onChange={(e) => onFormDataChange("kubernetesVersion", e.target.value)}
          className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md appearance-none"
        >
          {availableKubernetesVersions.map((version) => (
            <option key={version} value={version}>
              {version}
            </option>
          ))}
        </GardenerSelect>
      </div>

      {/* Region */}
      <div>
        <GardenerLabel htmlFor="region" className="text-aurora-gray-300 mb-2 block text-left">
          Region
        </GardenerLabel>
        <GardenerSelect
          id="region"
          name="region"
          value={formData.region}
          onChange={(e) => onFormDataChange("region", e.target.value)}
          className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md appearance-none"
        >
          <option value="eu-de-1">eu-de-1 (Germany)</option>
          <option value="eu-de-2">eu-de-2 (Germany)</option>
          <option value="eu-nl-1">eu-nl-1 (Netherlands)</option>
          <option value="na-us-1">na-us-1 (USA)</option>
          <option value="na-us-2">na-us-2 (USA)</option>
          <option value="ap-jp-1">ap-jp-1 (Japan)</option>
          <option value="ap-au-1">ap-au-1 (Australia)</option>
        </GardenerSelect>
      </div>

      {/* Cloud Profile */}
      <div>
        <GardenerLabel htmlFor="cloudProfile" className="text-aurora-gray-300 mb-2 block text-left">
          Cloud Profile
        </GardenerLabel>
        <GardenerInput
          id="cloudProfile"
          className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
          value={formData.cloudProfileName}
          readOnly
        />
      </div>

      {/* Credentials Binding */}
      <div>
        <GardenerLabel htmlFor="credentialsBinding" className="text-aurora-gray-300 mb-2 block text-left">
          Credentials Binding
        </GardenerLabel>
        <GardenerSelect
          id="credentialsBinding"
          name="credentialsBinding"
          value={formData.credentialsBindingName}
          onChange={(e) => onFormDataChange("credentialsBindingName", e.target.value)}
          className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md appearance-none"
        >
          <option value="app-cred-openstack">app-cred-openstack</option>
          <option value="my-openstack-secret">my-openstack-secret</option>
        </GardenerSelect>
      </div>
    </div>
  )
}
