// components/CreateClusterWizard/WorkerPool.tsx
import React from "react"
import { WorkerConfig } from "./types"

import {
  Button,
  Checkbox,
  CheckboxGroup,
  FormRow,
  Icon,
  Select,
  SelectOption,
  TextInput,
} from "@cloudoperators/juno-ui-components"
import { t } from "@lingui/core/macro"

interface WorkerPoolProps {
  workers: WorkerConfig[]
  onWorkerChange: (index: number, field: keyof WorkerConfig | string, value: unknown) => void
  onAddWorker: () => void
  onRemoveWorker: (index: number) => void
  machineTypes?: Array<{ name: string; architecture: string; cpu: string; memory: string }>
  machineImages?: Array<{ name: string; versions: string[] }>
  availableZones?: string[]
}

export const WorkerPool: React.FC<WorkerPoolProps> = ({
  workers,
  onWorkerChange,
  onAddWorker,
  onRemoveWorker,
  machineTypes = [],
  machineImages = [],
  availableZones = [],
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-theme-high text-left">Worker Pools</h3>
        <Button onClick={onAddWorker} variant="subdued">
          Add Worker Pool
        </Button>
      </div>

      {workers.map((worker, index) => {
        const handleMachineImageChange = (field: "name" | "version", value: string) => {
          onWorkerChange(index, "machineImage", {
            ...worker.machineImage,
            [field]: value,
          })
        }

        const selectedImage = machineImages.find((img) => img.name === worker.machineImage.name)
        const availableVersions = selectedImage?.versions || []

        return (
          <div key={index} className="p-4 border border-theme-box-default rounded-lg space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-theme-high font-medium text-left">Worker Pool #{index + 1}</h4>
              {workers.length > 1 && (
                <Button onClick={() => onRemoveWorker(index)} variant="subdued">
                  <Icon icon="close" color="text-theme-danger" className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Machine Type - Full width */}
            <FormRow key={"worker-machine-type"}>
              <Select
                required
                id={`worker-machine-type-${index}`}
                label={t`Machine Type`}
                name="workerMachineType"
                value={worker.machineType}
                onChange={(e) => onWorkerChange(index, "workerMachineType", e?.toString() || "")}
                className="w-full h-10 px-3 border border-theme-box-default text-theme-light rounded-md"
              >
                {machineTypes.map((machine) => (
                  <SelectOption key={machine.name} value={machine.name}>
                    {`${machine.name} (${machine.cpu} CPU, ${machine.memory})`}
                  </SelectOption>
                ))}
              </Select>
            </FormRow>

            {/* Machine Image and Version - Two columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Machine Type - Full width */}
              <FormRow key={"worker-machine-image"}>
                <Select
                  id={`worker-image-${index}`}
                  label={t`Machine Image`}
                  name="workerImageMachineType"
                  value={worker.machineImage.name}
                  onChange={(e) => handleMachineImageChange("name", e?.toString() || "")}
                  className="w-full h-10 px-3 border border-theme-box-default text-theme-light rounded-md"
                >
                  {machineImages.map((image) => (
                    <SelectOption key={image.name} value={image.name}>
                      {image.name}
                    </SelectOption>
                  ))}
                </Select>
              </FormRow>

              <FormRow key={"worker-image-version"}>
                <Select
                  id={`worker-version-${index}`}
                  value={worker.machineImage.version}
                  label={t`Image Version`}
                  name="workerImageMachineVersion"
                  onChange={(e) => handleMachineImageChange("version", e?.toString() || "")}
                  className="w-full h-10 px-3 border border-theme-box-default text-theme-light rounded-md"
                >
                  {availableVersions.map((version) => (
                    <SelectOption key={version} value={version}>
                      {version}
                    </SelectOption>
                  ))}
                </Select>
              </FormRow>
            </div>

            {/* Minimum and Maximum Nodes - Two columns */}
            <div className="grid grid-cols-2 gap-4">
              <FormRow key={"minimumNodes"}>
                <TextInput
                  label={t`Minimum Nodes`}
                  type="number"
                  min="1"
                  id={`worker-min-${index}`}
                  onChange={(e) => onWorkerChange(index, "minimum", parseInt(e.target.value))}
                  value={worker.minimum}
                  className="w-full h-10 px-3  border border-theme-box-default text-theme-light rounded-md"
                />
              </FormRow>

              <FormRow key={"maximumNodes"}>
                <TextInput
                  label={t`Maximum Nodes`}
                  type="number"
                  min={worker.minimum}
                  value={worker.maximum}
                  id={`worker-max-${index}`}
                  onChange={(e) => onWorkerChange(index, "maximum", parseInt(e.target.value))}
                  className="w-full h-10 px-3 border border-theme-box-default text-theme-light rounded-md"
                />
              </FormRow>
            </div>

            {/* Availability Zones */}
            <CheckboxGroup label="Availability Zones">
              <div className="grid grid-cols-2 gap-2">
                {availableZones.map((zone) => (
                  <div key={zone} className="flex items-center space-x-2">
                    <Checkbox
                      checked={worker.zones.includes(zone)}
                      className="h-4 w-4 rounded border-theme-box-default text-juno-blue-7 focus:ring-sap-blue  focus:ring-offset-sap-grey-7"
                      label={zone}
                      id={`zone-${index}-${zone}`}
                      value={zone}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onWorkerChange(index, "zones", [...worker.zones, zone])
                        } else {
                          onWorkerChange(
                            index,
                            "zones",
                            worker.zones.filter((z) => z !== zone)
                          )
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </CheckboxGroup>
          </div>
        )
      })}
    </div>
  )
}
