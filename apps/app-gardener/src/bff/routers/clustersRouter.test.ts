import { describe, it, expect, vi, beforeEach } from "vitest"
import { clustersRouter } from "./clustersRouter"
import { Cluster } from "../types/cluster"
import { K8sClient } from "../k8sClient"
import { ShootApiResponse } from "../types/shootApiSchema"
import { createCallerFactory, router } from "./trpc"
import { uuid } from "zod/v4"

// Create a comprehensive mock K8sClient with all methods
const k8sClientMock: K8sClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  WATCH_ADDED: "ADDED",
  WATCH_MODIFIED: "MODIFIED",
  WATCH_DELETED: "DELETED",
  WATCH_ERROR: "ERROR",
  watch: vi.fn().mockReturnValue({
    on: vi.fn(),
    off: vi.fn(),
    close: vi.fn(),
  }),
  head: vi.fn(),
  refreshToken: vi.fn(),
  currentToken: vi.fn(),
}

// Mock environment variable
const originalEnv = process.env
beforeEach(() => {
  process.env = { ...originalEnv, GARDENER_PROJECT: "test-project" }
})

const createCaller = createCallerFactory(router(clustersRouter(k8sClientMock)))
const caller = createCaller({})

describe("clustersRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getClusters", () => {
    const validShootApiResponseMock: ShootApiResponse = {
      metadata: {
        name: "test-cluster",
        namespace: "garden-test-project",
        uid: "123e4567-e89b-12d3-a456-426614174000",
        resourceVersion: "12345",
        generation: 1,
        creationTimestamp: "2023-01-01T00:00:00Z",
        labels: {
          "gardener.cloud/role": "shoot",
        },
        annotations: {
          "gardener.cloud/created-by": "test-user",
        },
      },
      spec: {
        cloudProfileName: "aws-eu-west-1",
        kubernetes: {
          version: "1.27.3",
        },
        networking: {
          type: "calico",
          pods: "10.244.0.0/16",
          nodes: "10.250.0.0/16",
          services: "10.96.0.0/12",
          ipFamilies: ["IPv4"],
        },
        provider: {
          type: "aws",
          controlPlaneConfig: {
            kind: "ControlPlaneConfig",
            apiVersion: "aws.provider.extensions.gardener.cloud/v1alpha1",
          },
          infrastructureConfig: {
            kind: "InfrastructureConfig",
            apiVersion: "aws.provider.extensions.gardener.cloud/v1alpha1",
          },
          workers: [
            {
              name: "worker-1",
              cri: {
                name: "containerd",
              },
              machine: {
                type: "m5.large",
                image: {
                  name: "gardenlinux",
                  version: "934.8.0",
                },
                architecture: "amd64",
              },
              maximum: 3,
              minimum: 1,
              maxSurge: 1,
              maxUnavailable: 0,
              zones: ["eu-west-1a", "eu-west-1b"],
              systemComponents: {
                allow: true,
              },
              updateStrategy: "RollingUpdate",
            },
          ],
        },
        region: "eu-west-1",
        maintenance: {
          autoUpdate: {
            kubernetesVersion: true,
            machineImageVersion: false,
          },
          timeWindow: {
            begin: "220000+0000",
            end: "230000+0000",
          },
        },
        hibernation: {
          schedules: [
            {
              start: "00 20 * * 1-5",
              location: "Europe/Berlin",
            },
          ],
        },
      },
      status: {
        conditions: [
          {
            type: "APIServerAvailable",
            status: "True",
            lastTransitionTime: "2023-01-01T00:00:00Z",
            lastUpdateTime: "2023-01-01T00:00:00Z",
            reason: "Available",
            message: "API server is available",
          },
        ],
        lastOperation: {
          description: "Creating shoot cluster",
          lastUpdateTime: "2023-01-01T00:00:00Z",
          progress: 100,
          state: "Succeeded",
          type: "Create",
        },
      },
    }

    const validShootListApiResponseMock = {
      apiVersion: "core.gardener.cloud/v1beta1",
      kind: "ShootList",
      metadata: {
        resourceVersion: "12345",
      },
      items: [validShootApiResponseMock],
    }

    const expectedClusters: Cluster[] = [
      {
        uid: "123e4567-e89b-12d3-a456-426614174000",
        name: "test-cluster",
        region: "eu-west-1",
        infrastructure: "aws",
        status: "Operational",
        version: "1.27.3",
        readiness: "1/1",
        stateDetails: {
          state: "Succeeded",
          progress: 100,
          type: "Create",
          description: "Creating shoot cluster",
          lastTransitionTime: "2023-01-01T00:00:00Z",
        },
        workers: [
          {
            name: "worker-1",
            architecture: "amd64",
            machineType: "m5.large",
            machineImage: {
              name: "gardenlinux",
              version: "934.8.0",
            },
            containerRuntime: "containerd",
            min: 1,
            max: 3,
            maxSurge: 1,
            zones: ["eu-west-1a", "eu-west-1b"],
          },
        ],
        maintenance: {
          startTime: "220000+0000",
          timezone: "Europe/Berlin",
          windowTime: "230000+0000",
        },
        autoUpdate: {
          os: false,
          kubernetes: true,
        },
      },
    ]

    it("should successfully fetch and convert clusters", async () => {
      // Arrange
      vi.mocked(k8sClientMock.get).mockResolvedValue(validShootListApiResponseMock)

      // Act
      const result = await caller.getClusters()
      // Assert
      expect(k8sClientMock.get).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots"
      )
      expect(result).toEqual(expectedClusters)
    })
  })

  describe("getClusterByName", () => {
    const validShootApiResponseMock: ShootApiResponse = {
      metadata: {
        name: "specific-cluster",
        namespace: "garden-test-project",
        uid: "123e4567-e89b-12d3-a456-426614174000",
        resourceVersion: "12345",
        generation: 1,
        creationTimestamp: "2023-01-01T00:00:00Z",
        labels: {
          "gardener.cloud/role": "shoot",
        },
        annotations: {
          "gardener.cloud/created-by": "test-user",
        },
      },
      spec: {
        cloudProfileName: "aws-eu-west-1",
        kubernetes: {
          version: "1.27.3",
        },
        networking: {
          type: "calico",
          pods: "10.244.0.0/16",
          nodes: "10.250.0.0/16",
          services: "10.96.0.0/12",
          ipFamilies: ["IPv4"],
        },
        provider: {
          type: "aws",
          controlPlaneConfig: {
            kind: "ControlPlaneConfig",
            apiVersion: "aws.provider.extensions.gardener.cloud/v1alpha1",
          },
          infrastructureConfig: {
            kind: "InfrastructureConfig",
            apiVersion: "aws.provider.extensions.gardener.cloud/v1alpha1",
          },
          workers: [
            {
              name: "worker-1",
              cri: {
                name: "containerd",
              },
              machine: {
                type: "m5.large",
                image: {
                  name: "gardenlinux",
                  version: "934.8.0",
                },
                architecture: "amd64",
              },
              maximum: 3,
              minimum: 1,
              maxSurge: 1,
              maxUnavailable: 0,
              zones: ["eu-west-1a", "eu-west-1b"],
              systemComponents: {
                allow: true,
              },
              updateStrategy: "RollingUpdate",
            },
          ],
        },
        region: "eu-west-1",
        maintenance: {
          autoUpdate: {
            kubernetesVersion: true,
            machineImageVersion: false,
          },
          timeWindow: {
            begin: "220000+0000",
            end: "230000+0000",
          },
        },
        hibernation: {
          schedules: [
            {
              start: "00 20 * * 1-5",
              location: "Europe/Berlin",
            },
          ],
        },
      },
      status: {
        conditions: [
          {
            type: "APIServerAvailable",
            status: "True",
            lastTransitionTime: "2023-01-01T00:00:00Z",
            lastUpdateTime: "2023-01-01T00:00:00Z",
            reason: "Available",
            message: "API server is available",
          },
        ],
        lastOperation: {
          description: "Creating shoot cluster",
          lastUpdateTime: "2023-01-01T00:00:00Z",
          progress: 100,
          state: "Succeeded",
          type: "Create",
        },
      },
    }

    const expectedCluster: Cluster = {
      uid: "123e4567-e89b-12d3-a456-426614174000",
      name: "specific-cluster",
      region: "eu-west-1",
      infrastructure: "aws",
      status: "Operational",
      version: "1.27.3",
      readiness: "1/1",
      stateDetails: {
        state: "Succeeded",
        progress: 100,
        type: "Create",
        description: "Creating shoot cluster",
        lastTransitionTime: "2023-01-01T00:00:00Z",
      },
      workers: [
        {
          name: "worker-1",
          architecture: "amd64",
          machineType: "m5.large",
          machineImage: {
            name: "gardenlinux",
            version: "934.8.0",
          },
          containerRuntime: "containerd",
          min: 1,
          max: 3,
          maxSurge: 1,
          zones: ["eu-west-1a", "eu-west-1b"],
        },
      ],
      maintenance: {
        startTime: "220000+0000",
        timezone: "Europe/Berlin",
        windowTime: "230000+0000",
      },
      autoUpdate: {
        os: false,
        kubernetes: true,
      },
    }

    it("should successfully fetch cluster by name", async () => {
      // Arrange
      vi.mocked(k8sClientMock.get).mockResolvedValue(validShootApiResponseMock)

      // Act
      const result = await caller.getClusterByName({ name: "specific-cluster" })

      // Assert
      expect(k8sClientMock.get).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots/specific-cluster"
      )
      expect(result).toEqual(expectedCluster)
    })
  })

  describe("deleteCluster", () => {
    const validShootApiResponseMock: ShootApiResponse = {
      metadata: {
        name: "cluster-to-delete",
        namespace: "garden-test-project",
        uid: "12345678-3456-789a-bcde-f123456789ab",
        resourceVersion: "12345",
        generation: 1,
        creationTimestamp: "2023-01-01T00:00:00Z",
        annotations: {
          "confirmation.gardener.cloud/deletion": "true",
        },
      },
      spec: {
        cloudProfileName: "aws-eu-west-1",
        kubernetes: { version: "1.27.3" },
        networking: {
          type: "calico",
          pods: "10.244.0.0/16",
          nodes: "10.250.0.0/16",
          services: "10.96.0.0/12",
          ipFamilies: ["IPv4"],
        },
        provider: {
          type: "aws",
          controlPlaneConfig: {},
          infrastructureConfig: {},
          workers: [
            {
              name: "worker-1",
              cri: { name: "containerd" },
              machine: {
                type: "m5.large",
                image: { name: "gardenlinux", version: "934.8.0" },
                architecture: "amd64",
              },
              maximum: 1,
              minimum: 1,
              maxSurge: 1,
              maxUnavailable: 0,
              zones: ["eu-west-1a"],
              systemComponents: { allow: true },
              updateStrategy: "RollingUpdate",
            },
          ],
        },
        region: "eu-west-1",
      },
      status: {
        lastOperation: {
          description: "Deleting shoot cluster",
          lastUpdateTime: "2023-01-01T00:00:00Z",
          progress: 50,
          state: "Processing",
          type: "Delete",
        },
      },
    }

    const expectedDeletedCluster: Cluster = {
      uid: "12345678-3456-789a-bcde-f123456789ab",
      name: "cluster-to-delete",
      region: "eu-west-1",
      infrastructure: "aws",
      status: "Reconciling",
      version: "1.27.3",
      readiness: "Unknown",
      stateDetails: {
        state: "Processing",
        progress: 50,
        type: "Delete",
        description: "Deleting shoot cluster",
        lastTransitionTime: "2023-01-01T00:00:00Z",
      },
      workers: [
        {
          name: "worker-1",
          architecture: "amd64",
          machineType: "m5.large",
          machineImage: {
            name: "gardenlinux",
            version: "934.8.0",
          },
          containerRuntime: "containerd",
          min: 1,
          max: 1,
          maxSurge: 1,
          zones: ["eu-west-1a"],
        },
      ],
      maintenance: {
        startTime: "",
        timezone: "",
        windowTime: "",
      },
      autoUpdate: {
        os: false,
        kubernetes: false,
      },
    }

    it("should successfully delete cluster", async () => {
      // Arrange
      vi.mocked(k8sClientMock.patch).mockResolvedValue(true)
      vi.mocked(k8sClientMock.delete).mockResolvedValue(validShootApiResponseMock)

      // Act
      const result = await caller.deleteCluster({
        name: "cluster-to-delete",
      })

      // Assert
      expect(k8sClientMock.patch).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots/cluster-to-delete",
        [
          {
            op: "add",
            path: "/metadata/annotations/confirmation.gardener.cloud~1deletion",
            value: "true",
          },
        ],
        {
          headers: {
            "Content-Type": "application/json-patch+json",
          },
        }
      )
      expect(k8sClientMock.delete).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots/cluster-to-delete"
      )
      expect(result).toEqual(expectedDeletedCluster)
    })
  })

  describe("createCluster", () => {
    const createClusterInput = {
      name: "new-cluster",
      region: "eu-west-1",
      kubernetesVersion: "1.27.3",
      cloudProfileName: "aws-eu-west-1",
      infrastructure: {
        type: "aws",
        loadBalancerProvider: "aws",
        floatingPoolName: "floating-pool",
      },
      networking: {
        type: "calico",
        pods: "10.244.0.0/16",
        nodes: "10.250.0.0/16",
        services: "10.96.0.0/12",
      },
      workers: [
        {
          name: "worker-group-1",
          machineType: "m5.large",
          machineImage: {
            name: "gardenlinux",
            version: "934.8.0",
          },
          minimum: 1,
          maximum: 3,
          zones: ["eu-west-1a", "eu-west-1b"],
        },
      ],
      secretBindingName: "aws-credentials",
      credentialsBindingName: "aws-creds",
      updateStrategy: "RollingUpdate" as const,
    }

    const expectedShootPayload = {
      metadata: {
        name: "new-cluster",
        namespace: "garden-test-project",
      },
      spec: {
        kubernetes: {
          version: "1.27.3",
        },
        networking: {
          type: "calico",
          pods: "10.244.0.0/16",
          nodes: "10.250.0.0/16",
          services: "10.96.0.0/12",
          ipFamilies: ["IPv4"],
        },
        provider: {
          type: "aws",
          controlPlaneConfig: {
            apiVersion: "aws.provider.extensions.gardener.cloud/v1alpha1",
            kind: "ControlPlaneConfig",
            loadBalancerProvider: "aws",
          },
          infrastructureConfig: {
            apiVersion: "aws.provider.extensions.gardener.cloud/v1alpha1",
            kind: "InfrastructureConfig",
            networks: {
              workers: "10.250.0.0/16",
            },
            floatingPoolName: "floating-pool",
          },
          workers: [
            {
              name: "worker-group-1",
              machine: {
                type: "m5.large",
                image: {
                  name: "gardenlinux",
                  version: "934.8.0",
                },
                architecture: "amd64" as "amd64",
              },
              minimum: 1,
              maximum: 3,
              maxSurge: 1,
              maxUnavailable: 0,
              zones: ["eu-west-1a", "eu-west-1b"],
              cri: {
                name: "containerd",
              },
              systemComponents: {
                allow: true,
              },
              updateStrategy: "RollingUpdate" as "RollingUpdate",
            },
          ],
        },
        cloudProfileName: "aws-eu-west-1",
        secretBindingName: "aws-credentials",
        credentialsBindingName: "aws-creds",
        region: "eu-west-1",
      },
    }

    const validCreateResponse: ShootApiResponse = {
      metadata: {
        name: "new-cluster",
        namespace: "garden-test-project",
        uid: "12345678-3456-789a-bcde-f123456789cd",
        resourceVersion: "1",
        generation: 1,
        creationTimestamp: "2023-01-01T00:00:00Z",
      },
      spec: {
        cloudProfileName: "aws-eu-west-1",
        kubernetes: { version: "1.27.3" },
        networking: {
          type: "calico",
          pods: "10.244.0.0/16",
          nodes: "10.250.0.0/16",
          services: "10.96.0.0/12",
          ipFamilies: ["IPv4"],
        },
        provider: {
          type: "aws",
          controlPlaneConfig: expectedShootPayload.spec.provider.controlPlaneConfig,
          infrastructureConfig: expectedShootPayload.spec.provider.infrastructureConfig,
          workers: expectedShootPayload.spec.provider.workers,
        },
        region: "eu-west-1",
      },
      status: {
        lastOperation: {
          description: "Creating shoot cluster",
          lastUpdateTime: "2023-01-01T00:00:00Z",
          progress: 0,
          state: "Processing",
          type: "Create",
        },
      },
    }

    const expectedCreatedCluster: Cluster = {
      uid: "12345678-3456-789a-bcde-f123456789cd",
      name: "new-cluster",
      region: "eu-west-1",
      infrastructure: "aws",
      status: "Reconciling",
      version: "1.27.3",
      readiness: "Unknown",
      stateDetails: {
        state: "Processing",
        progress: 0,
        type: "Create",
        description: "Creating shoot cluster",
        lastTransitionTime: "2023-01-01T00:00:00Z",
      },
      workers: [
        {
          name: "worker-group-1",
          architecture: "amd64",
          machineType: "m5.large",
          machineImage: {
            name: "gardenlinux",
            version: "934.8.0",
          },
          containerRuntime: "containerd",
          min: 1,
          max: 3,
          maxSurge: 1,
          zones: ["eu-west-1a", "eu-west-1b"],
        },
      ],
      maintenance: {
        startTime: "",
        timezone: "",
        windowTime: "",
      },
      autoUpdate: {
        os: false,
        kubernetes: false,
      },
    }

    it("should successfully create cluster", async () => {
      // Arrange
      vi.mocked(k8sClientMock.post).mockResolvedValue(validCreateResponse)

      // Act
      const result = await caller.createCluster(createClusterInput)

      // Assert
      expect(k8sClientMock.post).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots",
        expectedShootPayload
      )
      expect(result).toEqual(expectedCreatedCluster)
    })
  })
})
