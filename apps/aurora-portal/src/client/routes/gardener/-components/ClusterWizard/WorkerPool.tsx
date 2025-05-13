// components/CreateClusterWizard/WorkerPool.tsx
import React from "react"
import { X } from "lucide-react"
import { WorkerConfig } from "./types"
import { Button } from "@/client/components/headless-ui/Button"
import { Label } from "@/client/components/headless-ui/Label"
import { Input } from "@/client/components/headless-ui/Input"
import { Select } from "@/client/components/headless-ui/Select"

interface WorkerPoolProps {
  worker: WorkerConfig
  index: number
  onWorkerChange: (index: number, field: keyof WorkerConfig, value: unknown) => void
  onRemove: (index: number) => void
}

export const WorkerPool: React.FC<WorkerPoolProps> = ({ worker, index, onWorkerChange, onRemove }) => {
  return (
    <div className="p-4 border border-aurora-gray-700 rounded-lg bg-aurora-gray-800/50 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-aurora-white font-medium">Worker Pool #{index + 1}</h3>
        <Button
          onClick={() => onRemove(index)}
          variant="ghost"
          className="h-8 w-8 p-0 text-aurora-red-400 hover:text-aurora-red-300 hover:bg-aurora-gray-700/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`worker-name-${index}`} className="text-aurora-gray-300">
            Name
          </Label>
          <Input
            id={`worker-name-${index}`}
            className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
            value={worker.name}
            onChange={(e) => onWorkerChange(index, "name", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor={`worker-machine-${index}`} className="text-aurora-gray-300">
            Machine Type
          </Label>
          <Select
            value={worker.machineType}
            className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
            onChange={(e) => onWorkerChange(index, "machineType", e.target.value)}
          >
            <option value="active">g_c2_m4 (2 CPU, 4GB RAM)</option>
            <option value="inactive">g_c2_m8 (2 CPU, 8GB RAM)</option>
            <option value="pending">g_c4_m16 (4 CPU, 16GB RAM)</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor={`worker-image-${index}`} className="text-aurora-gray-300">
            Machine Image
          </Label>
          <Select
            value={worker.machineImageName}
            onChange={(e) => onWorkerChange(index, "machineImageName", e.target.value)}
          >
            <option value="active">Garden Linux</option>
            <option value="inactive">Ubuntu</option>
          </Select>
        </div>

        <div>
          <Label htmlFor={`worker-version-${index}`} className="text-aurora-gray-300">
            Image Version
          </Label>
          <Select
            value={worker.machineImageName}
            onChange={(e) => onWorkerChange(index, "machineImageName", e.target.value)}
          >
            <option value="active">1592.9.0</option>
            <option value="inactive">1583.5.0</option>
          </Select>
        </div>

        <div>
          <Label htmlFor={`worker-arch-${index}`} className="text-aurora-gray-300">
            Architecture
          </Label>
          <Select
            value={worker.architecture}
            className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
            onChange={(e) => onWorkerChange(index, "architecture", e.target.value)}
          >
            <option value="amd64">amd64</option>
            <option value="arm64">arm64</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor={`worker-min-${index}`} className="text-aurora-gray-300">
            Min Nodes
          </Label>
          <Input
            id={`worker-min-${index}`}
            type="number"
            min="1"
            className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
            value={worker.min}
            onChange={(e) => onWorkerChange(index, "min", parseInt(e.target.value))}
          />
        </div>

        <div>
          <Label htmlFor={`worker-max-${index}`} className="text-aurora-gray-300">
            Max Nodes
          </Label>
          <Input
            id={`worker-max-${index}`}
            type="number"
            min={worker.min}
            className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
            value={worker.max}
            onChange={(e) => onWorkerChange(index, "max", parseInt(e.target.value))}
          />
        </div>

        <div>
          <Label htmlFor={`worker-surge-${index}`} className="text-aurora-gray-300">
            Max Surge
          </Label>
          <Input
            id={`worker-surge-${index}`}
            type="number"
            min="0"
            className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
            value={worker.maxSurge}
            onChange={(e) => onWorkerChange(index, "maxSurge", parseInt(e.target.value))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`worker-runtime-${index}`} className="text-aurora-gray-300">
          Container Runtime
        </Label>
        <Select
          value={worker.containerRuntime}
          className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
          onChange={(e) => onWorkerChange(index, "containerRuntime", e.target.value)}
        >
          <option value="containerd">containerd</option>
          <option value="crio">CRI-O</option>
        </Select>
      </div>

      <div>
        <Label className="text-aurora-gray-300">Zones</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {["eu-de-1a", "eu-de-1b", "eu-de-1c", "eu-de-1d"].map((zone) => (
            <div key={zone} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`zone-${index}-${zone}`}
                checked={worker.zones.includes(zone)}
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
                className="h-4 w-4 rounded border-aurora-gray-700 bg-aurora-gray-700 text-aurora-blue-600 focus:ring-aurora-blue-600 focus:ring-offset-aurora-gray-900"
              />
              <label htmlFor={`zone-${index}-${zone}`} className="text-sm text-aurora-gray-300">
                {zone}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
