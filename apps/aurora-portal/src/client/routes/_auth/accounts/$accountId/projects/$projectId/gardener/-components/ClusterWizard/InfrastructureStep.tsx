import React from "react"
import { ClusterFormData } from "./types"
import { Form, FormRow, Message, Select, SelectOption, TextInput } from "@cloudoperators/juno-ui-components"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"

export interface InfrastructureStepProps {
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
      <Message dismissible={false} variant="info">
        <Trans>
          Each worker nodes will automatically scale between its minimum and maximum number of nodes based on the
          workload demands. Ensure your maximum node counts allign with your resouce quotas.
        </Trans>
      </Message>

      <Form>
        <FormRow key={"credentialsBinding"}>
          <Select
            required
            id="floatingPool"
            label={t`Floating IP Pool`}
            name="floatingPool"
            value={formData.infrastructure.floatingPoolName}
            onChange={(e) => handleInfrastructureChange("floatingPoolName", e?.toString() || "")}
            className="h-10 w-full appearance-none rounded-md px-3"
            truncateOptions
          >
            {availableFloatingPools.length > 0 ? (
              availableFloatingPools.map((pool) => (
                <SelectOption key={pool} value={pool}>
                  {pool}
                </SelectOption>
              ))
            ) : (
              <>
                <SelectOption value="FloatingIP-external-monsoon3-01">FloatingIP-external-monsoon3-01</SelectOption>
                <SelectOption value="FloatingIP-external-monsoon3-02">FloatingIP-external-monsoon3-02</SelectOption>
              </>
            )}
          </Select>

          <p className="text-theme-light mt-1 text-left text-xs">
            <Trans>The floating IP pool to use for the cluster's external network access</Trans>
          </p>
        </FormRow>

        {/* Network Configuration Section */}
        <div className="space-y-4">
          <h3 className="text-theme-high text-left text-lg font-medium">
            <Trans>Network Configuration</Trans>
          </h3>
          <div className="space-y-6">
            {/* Pods CIDR */}
            <FormRow key={"podsCIDR"}>
              <TextInput
                label={t`Pods CIDR`}
                type={"text"}
                id="podsCIDR"
                placeholder="100.64.0.0/12"
                onChange={(e) => handleNetworkingChange("pods", e.target.value)}
                value={formData.networking.pods}
                className="h-10 w-full rounded-md px-3"
              />
              <p className="text-theme-light mt-1 text-left text-xs">
                <Trans>The floating IP pool to use for the cluster's external network access</Trans>
              </p>
            </FormRow>

            <FormRow key={"nodesCIDR"}>
              <TextInput
                label={t`Nodes CIDR`}
                type={"text"}
                id="nodesCIDR"
                placeholder="10.180.0.0/16"
                onChange={(e) => handleNetworkingChange("nodes", e.target.value)}
                value={formData.networking.nodes}
                className="h-10 w-full rounded-md px-3"
              />
              <p className="text-theme-light mt-1 text-left text-xs">IP range for node network</p>
            </FormRow>

            {/* Services CIDR */}
            <FormRow key={"servicesCIDR"}>
              <TextInput
                label={t`Services CIDR`}
                type={"text"}
                id="servicesCIDR"
                placeholder="100.104.0.0/13"
                onChange={(e) => handleNetworkingChange("services", e.target.value)}
                value={formData.networking.services}
                className="h-10 w-full rounded-md px-3"
              />
              <p className="text-theme-light mt-1 text-left text-xs">IP range for service network</p>
            </FormRow>
          </div>

          <p className="text-theme-light mt-4 text-left text-sm">
            <Trans>Note: These network settings will be prefilled by the Kubernetes controller in the future.</Trans>
          </p>
        </div>
      </Form>
    </div>
  )
}
