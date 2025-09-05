// components/CreateClusterWizard/steps/BasicInfoStep.tsx
import React from "react"
import { ClusterFormData } from "./types"
import { t } from "@lingui/core/macro"

import { Form, FormRow, Select, SelectOption, TextInput } from "@cloudoperators/juno-ui-components"

export interface BasicInfoStepProps {
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
    <Form>
      <FormRow key={"clusterName"}>
        <TextInput
          label={t`Cluster Name`}
          type={"text"}
          value={formData.name}
          onChange={(e) => onFormDataChange("name", e.target.value)}
          placeholder={t`Lowercase alphanumeric characters, dash (-) and must start with a letter`}
          maxLength={200}
        />
      </FormRow>

      {/* Kubernetes Version */}
      <FormRow key={"kubeVersion"}>
        <Select
          required
          label={t`Kubernetes Version`}
          id="kubeVersion"
          name="kubeVersion"
          value={formData.kubernetesVersion}
          className="w-full h-10 px-3"
          onChange={(e) => onFormDataChange("kubernetesVersion", e?.toString() || "")}
          truncateOptions
        >
          {availableKubernetesVersions.map((version) => (
            <SelectOption key={version} value={version}>
              {version}
            </SelectOption>
          ))}
        </Select>
      </FormRow>
      <FormRow key={"region"}>
        <Select
          required
          id="region"
          name="region"
          data-testid="region"
          value={formData.region}
          onChange={(e) => onFormDataChange("region", e?.toString() || "")}
          className="w-full h-10 px-3 rounded-md appearance-none"
          truncateOptions
        >
          <SelectOption value="eu-de-1">eu-de-1 (Germany)</SelectOption>
          <SelectOption value="eu-de-2">eu-de-2 (Germany)</SelectOption>
          <SelectOption value="eu-nl-1">eu-nl-1 (Netherlands)</SelectOption>
          <SelectOption value="na-us-1">na-us-1 (USA)</SelectOption>
          <SelectOption value="na-us-2">na-us-2 (USA)</SelectOption>
          <SelectOption value="ap-jp-1">ap-jp-1 (Japan)</SelectOption>
          <SelectOption value="ap-au-1">ap-au-1 (Australia)</SelectOption>
        </Select>
      </FormRow>

      {/* Cloud Profile */}
      <FormRow key={"cloudProfile"}>
        <TextInput
          label={t`Cloud Profile`}
          type={"text"}
          id="cloudProfile"
          value={formData.cloudProfileName}
          className="w-full h-10 px-3 rounded-md"
          readOnly
        />
      </FormRow>

      {/* Credentials Binding */}
      <FormRow key={"credentialsBinding"}>
        <Select
          required
          id="credentialsBinding"
          data-testid="credentialsBinding"
          name="credentialsBinding"
          value={formData.credentialsBindingName}
          onChange={(e) => onFormDataChange("credentialsBindingName", e?.toString() || "")}
          className="w-full h-10 px-3 rounded-md appearance-none"
          truncateOptions
        >
          <SelectOption value="app-cred-openstack">app-cred-openstack</SelectOption>
          <SelectOption value="my-openstack-secret">my-openstack-secret</SelectOption>
        </Select>
      </FormRow>
    </Form>
  )
}
