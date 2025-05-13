export type ClusterFormData = {
  name: string
  cloudProfileName: string
  credentialsBindingName: string
  region: string
  kubernetesVersion: string
  infrastructure: {
    floatingPoolName: string
  }
  networking: {
    pods: string
    nodes: string
    services: string
  }
  workers: WorkerConfig[]
}

export type WorkerConfig = {
  machineType: string
  machineImage: {
    name: string
    version: string
  }
  minimum: number
  maximum: number
  zones: string[]
}
