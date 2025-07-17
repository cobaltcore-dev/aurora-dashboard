// components/CreateClusterWizard/steps/ReviewStep.tsx
import React, { ReactNode } from "react"
import { ClusterFormData } from "./types"
import { Box, Stack, DataGrid, Message } from "@cloudoperators/juno-ui-components"

interface ReviewStepProps {
  formData: ClusterFormData
}

interface SectionProps {
  title: string
  rows: ReactNode[]
}

import { DataGridRow, DataGridCell } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

interface DataRowProps {
  label: React.ReactNode
  content: React.ReactNode
  tooltipText?: string
}

const DataRow: React.FC<DataRowProps> = ({ label, content, tooltipText }) => (
  <DataGridRow>
    <DataGridCell>
      <Stack direction="horizontal" gap="1" alignment="center">
        <span>{label}</span>
        {tooltipText}
      </Stack>
    </DataGridCell>
    <DataGridCell className="bg-theme-background-lvl-5">{content}</DataGridCell>
  </DataGridRow>
)
const Section: React.FC<SectionProps> = ({ title, rows }) => {
  return (
    <Stack direction="vertical" gap="3">
      <h4>{title}</h4>
      <Box>
        <DataGrid columns={2} style={{ gridTemplateColumns: "30% 70%" }}>
          {rows.map((row, index) => (
            <React.Fragment key={index}>{row}</React.Fragment>
          ))}
        </DataGrid>
      </Box>
    </Stack>
  )
}
export const ReviewStep: React.FC<ReviewStepProps> = ({ formData }) => {
  return (
    <div className="space-y-6">
      <Section
        title="Cluster Configuration"
        rows={[
          <DataRow key="cluster-name" label="Cluster Name" content={formData.name || "N/A"} />,
          <DataRow key="cluster-version" label="Kubernetes Version" content={formData.kubernetesVersion || "N/A"} />,
          <DataRow key="cloud-profile" label="Cloud Profile" content={formData.cloudProfileName || "N/A"} />,
          <DataRow
            key="credentials-binding"
            label="Credentials Binding"
            content={formData.credentialsBindingName || "N/A"}
          />,
          <DataRow key="region" label="Region" content={formData.region || "N/A"} />,
        ]}
      />

      <Section
        title="Infrastructure Configuration"
        rows={[
          <DataRow
            key="floating-ip-pool"
            label="Floating IP Pool"
            content={formData.infrastructure.floatingPoolName || "N/A"}
          />,
        ]}
      />

      <Section
        title="Network Configuration"
        rows={[
          <DataRow key="pods-cidr" label="Pods CIDR" content={formData.networking.pods || "N/A"} />,
          <DataRow key="nodes-cidr" label="Nodes CIDR" content={formData.networking.nodes || "N/A"} />,
          <DataRow key="services-cidr" label="Services CIDR" content={formData.networking.services || "N/A"} />,
        ]}
      />
      <Stack direction="vertical" gap="3">
        <h4>{"Worker Pools"}</h4>
        <Box>
          <DataGrid>
            {formData.workers.map((worker, index) => (
              <Section
                key={`worker-pool-${index}`}
                title={`Worker Pool #${index + 1}`}
                rows={[
                  <DataRow
                    key={`worker-${index}-machine-type`}
                    label="Machine Type"
                    content={worker.machineType || "N/A"}
                  />,
                  <DataRow
                    key={`worker-${index}-machine-image`}
                    label="Machine Image"
                    content={`${worker.machineImage.name} (${worker.machineImage.version})`}
                  />,
                  <DataRow
                    key={`worker-${index}-node-scaling`}
                    label="Node Scaling"
                    content={`Min: ${worker.minimum}, Max: ${worker.maximum}`}
                  />,
                  <DataRow
                    key={`worker-${index}-availability-zones`}
                    label="Availability Zones"
                    content={worker.zones.join(", ")}
                  />,
                ]}
              />
            ))}
          </DataGrid>
        </Box>
      </Stack>

      <Message dismissible={false} variant="warning" className="mt-6">
        <Trans>
          Please review all configurations carefully before creating the cluster. Once created, some settings cannot be
          changed.
        </Trans>
      </Message>
    </div>
  )
}
