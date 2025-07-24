import React from "react"
import { DataGridRow, DataGridCell, Stack, DataGrid, DataGridHeadCell, Badge } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { Cluster } from "@/server/Gardener/types/cluster"

interface WorkerSectionProps {
  workers: Cluster["workers"]
}

const WorkerSection: React.FC<WorkerSectionProps> = ({ workers }) => (
  <Stack direction="vertical" gap="3">
    <h3 className={"text-2xl font-semibold leading-none tracking-tight text-theme-highest text-lg"}>Workers</h3>
    <DataGrid>
      <DataGridRow className="flex">
        <DataGridHeadCell className="w-1/5">
          <Trans>Name</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell className="w-1/5">
          <Trans>Machine Type</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell className="w-1/5">
          <Trans>Image</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell className="w-1/5">
          <Trans>Scaling</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell className="w-1/5">
          <Trans>Zones</Trans>
        </DataGridHeadCell>
      </DataGridRow>
      {!workers || workers.length === 0 ? (
        <DataGridRow>
          <DataGridCell colSpan={5}>
            <p className="text-theme-high mb-1">No worker nodes configured for this cluster.</p>
          </DataGridCell>
        </DataGridRow>
      ) : (
        workers.map((worker) => {
          return (
            <DataGridRow className="flex">
              <DataGridCell className="w-1/5">
                <Stack direction="vertical" gap="1">
                  <span className="text-theme-high">{worker.name}</span>
                  <span className="text-xs text-theme-light mt-1">{worker.architecture}</span>
                </Stack>
              </DataGridCell>
              <DataGridCell className="w-1/5">
                <Stack direction="vertical" gap="1">
                  <span className="ttext-theme-high">{worker.machineType}</span>
                  <span className="text-xs text-theme-link mt-1">{worker.containerRuntime}</span>
                </Stack>
              </DataGridCell>
              <DataGridCell className="w-1/5">
                <Stack direction="vertical" gap="1">
                  <span className="text-theme-high">{worker.machineImage.name}</span>
                  <Stack alignment="center">
                    <span className="text-theme-link text-xs">v</span>
                    <span className="text-xs text-theme-light">{worker.machineImage.version}</span>
                  </Stack>
                </Stack>
              </DataGridCell>
              <DataGridCell className="w-1/5">
                <Stack direction="vertical" gap="1">
                  <span className="text-theme-high">{worker.actual !== undefined ? worker.actual : "?"} nodes</span>
                  <span className="text-xs text-theme-light mt-1">
                    <Trans>Min:</Trans> {worker.min} / <Trans>Max:</Trans> {worker.max} / <Trans>Surge:</Trans>{" "}
                    {worker.maxSurge}
                  </span>
                </Stack>
              </DataGridCell>
              <DataGridCell className="w-1/5">
                <Stack gap="1.5" wrap={true}>
                  {worker.zones.map((zone) => (
                    <Badge variant="info" text={zone}></Badge>
                  ))}
                </Stack>
              </DataGridCell>
            </DataGridRow>
          )
        })
      )}
    </DataGrid>
  </Stack>
)

export default WorkerSection
