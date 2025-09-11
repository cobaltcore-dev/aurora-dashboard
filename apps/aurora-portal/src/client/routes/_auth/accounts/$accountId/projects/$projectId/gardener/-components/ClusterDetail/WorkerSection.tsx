import React from "react"
import {
  DataGridRow,
  DataGridCell,
  Stack,
  DataGrid,
  DataGridHeadCell,
  Badge,
  Container,
  ContentHeading,
} from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { Cluster } from "@/server/Gardener/types/cluster"
import { useLingui } from "@lingui/react/macro"

interface WorkerSectionProps {
  workers: Cluster["workers"]
}

const WorkerSection: React.FC<WorkerSectionProps> = ({ workers }) => {
  const { t } = useLingui()

  return (
    <Container px={false} py>
      <ContentHeading>{t`Workers`}</ContentHeading>
      <DataGrid columns={5}>
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Machine Type</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Image</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Scaling</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Zones</Trans>
          </DataGridHeadCell>
        </DataGridRow>
        {!workers || workers.length === 0 ? (
          <DataGridRow>
            <DataGridCell colSpan={5}>
              <p>No worker nodes configured for this cluster.</p>
            </DataGridCell>
          </DataGridRow>
        ) : (
          workers.map((worker) => {
            return (
              <DataGridRow key={`${worker.name}-${worker.machineType}-${worker.architecture}`}>
                <DataGridCell>
                  <Stack direction="vertical" gap="1">
                    <span>{worker.name}</span>
                    <span>{worker.architecture}</span>
                  </Stack>
                </DataGridCell>
                <DataGridCell>
                  <Stack direction="vertical" gap="1">
                    <span>{worker.machineType}</span>
                    <span>{worker.containerRuntime}</span>
                  </Stack>
                </DataGridCell>
                <DataGridCell>
                  <Stack direction="vertical" gap="1">
                    <span>{worker.machineImage.name}</span>
                    <Stack alignment="center">
                      <span>{worker.machineImage.version}</span>
                    </Stack>
                  </Stack>
                </DataGridCell>
                <DataGridCell>
                  <Stack direction="vertical" gap="1">
                    <span>{worker.actual !== undefined ? worker.actual : "?"} nodes</span>
                    <span>
                      <Trans>Min:</Trans> {worker.min} / <Trans>Max:</Trans> {worker.max} / <Trans>Surge:</Trans>{" "}
                      {worker.maxSurge}
                    </span>
                  </Stack>
                </DataGridCell>
                <DataGridCell>
                  <Stack gap="1.5" wrap={true}>
                    {worker.zones.map((zone) => (
                      <Badge variant="info" text={zone} key={`${worker.name}-${zone}`}></Badge>
                    ))}
                  </Stack>
                </DataGridCell>
              </DataGridRow>
            )
          })
        )}
      </DataGrid>
    </Container>
  )
}

export default WorkerSection
