import { WorkerConfig } from "./types"

export const defaultWorker: WorkerConfig = {
  machineImage: {
    name: "ubuntu",
    version: "22.04",
  },
  minimum: 1,
  maximum: 2,
  machineType: "g_c2_m4",
  zones: ["eu-de-1d"],
}
export const steps = [
  { title: "Basic Info", description: "Cluster name and Kubernetes version" },
  { title: "Infrastructure", description: "Provider, region and networking" },
  { title: "Worker Nodes", description: "Configure worker node pools" },
  { title: "Review", description: "Review your configuration" },
]
