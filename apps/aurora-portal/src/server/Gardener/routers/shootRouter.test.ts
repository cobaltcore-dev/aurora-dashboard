import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { shootRouter } from "./shootRouter"
import { client } from "../client"
import { createCallerFactory, router } from "../../trpc"
import { AuroraPortalContext } from "../../context"
import { ShootApiResponse, ShootListApiResponse } from "../types/shootApiSchema"
import { TRPCError } from "@trpc/server"

// Mock the K8s client
vi.mock("../client", () => ({
  client: {
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
  },
}))

const mockClient = vi.mocked(client)

// Create tRPC caller
const createCaller = createCallerFactory(router(shootRouter))
const caller = createCaller({} as AuroraPortalContext)

describe("shootRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set default environment variable
    process.env.GARDENER_PROJECT = "test-project"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const validShootApiResponse: ShootApiResponse = {
    metadata: {
      name: "test-cluster",
      namespace: "garden-test-project",
      uid: "123e4567-e89b-12d3-a456-426614174000",
      resourceVersion: "12345",
      generation: 1,
      creationTimestamp: "2023-01-01T00:00:00Z",
      labels: {
        "project.gardener.cloud/name": "test-project",
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
        pods: "10.96.0.0/11",
        nodes: "10.250.0.0/16",
        services: "10.112.0.0/12",
        ipFamilies: ["IPv4"],
      },
      provider: {
        type: "aws",
        controlPlaneConfig: {
          loadBalancerProvider: "aws",
        },
        infrastructureConfig: {
          networks: {
            workers: "10.250.0.0/16",
          },
        },
        workers: [
          {
            name: "worker-pool-1",
            machine: {
              type: "m5.large",
              image: {
                name: "gardenlinux",
                version: "934.8.0",
              },
              architecture: "amd64",
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
            updateStrategy: "RollingUpdate",
          },
        ],
      },
      region: "eu-west-1",
      secretBindingName: "aws-secret",
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
        description: "Cluster reconciliation in progress",
        lastUpdateTime: "2023-01-01T00:00:00Z",
        progress: 100,
        state: "Succeeded",
        type: "Reconcile",
      },
    },
  }

  const validShootListApiResponse: ShootListApiResponse = {
    apiVersion: "core.gardener.cloud/v1beta1",
    kind: "ShootList",
    metadata: {
      resourceVersion: "12345",
    },
    items: [validShootApiResponse],
  }

  describe("getClusters", () => {
    it("should successfully fetch and convert clusters", async () => {
      // Arrange
      mockClient.get.mockResolvedValue(validShootListApiResponse)

      // Act
      const result = await caller.getClusters()

      // Assert
      expect(mockClient.get).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots"
      )
      expect(result).toBeInstanceOf(Array)
    })

    it("should handle empty cluster list", async () => {
      // Arrange
      const emptyResponse = { ...validShootListApiResponse, items: [] }
      mockClient.get.mockResolvedValue(emptyResponse)

      // Act
      const result = await caller.getClusters()

      // Assert
      expect(result).toEqual([])
    })

    it("should handle API error with error field", async () => {
      // Arrange
      const mockError = {
        response: {
          json: vi.fn().mockResolvedValue({
            error: "Unauthorized access",
          }),
        },
      }
      mockClient.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(caller.getClusters()).rejects.toThrow("Error fetching clusters: Unauthorized access")
    })

    it("should handle API error with message field", async () => {
      // Arrange
      const mockError = {
        response: {
          json: vi.fn().mockResolvedValue({
            message: "Request timeout",
          }),
        },
      }
      mockClient.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(caller.getClusters()).rejects.toThrow("Error fetching clusters: Request timeout")
    })

    it("should handle API error without response body", async () => {
      // Arrange
      const mockError = {
        message: "Network error",
        response: {
          json: vi.fn().mockResolvedValue({}),
        },
      }
      mockClient.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(caller.getClusters()).rejects.toThrow("Error fetching clusters: Network error")
    })

    it("should handle JSON parsing error in error response", async () => {
      // Arrange
      const mockError = {
        message: "Original error message",
        response: {
          json: vi.fn().mockRejectedValue(new Error("JSON parse error")),
        },
      }
      mockClient.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(caller.getClusters()).rejects.toThrow("Error fetching clusters: Original error message")
    })

    it("should use correct namespace from environment variable", async () => {
      // Arrange
      process.env.GARDENER_PROJECT = "my-custom-project"
      mockClient.get.mockResolvedValue(validShootListApiResponse)

      // Act
      await caller.getClusters()

      // Assert
      expect(mockClient.get).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-my-custom-project/shoots"
      )
    })

    it("should handle invalid schema response", async () => {
      // Arrange
      const invalidResponse = { invalid: "data" }
      mockClient.get.mockResolvedValue(invalidResponse)

      // Act
      const result = await caller.getClusters()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe("getClusterByName", () => {
    it("should successfully fetch and convert a specific cluster", async () => {
      // Arrange
      mockClient.get.mockResolvedValue(validShootApiResponse)

      // Act
      const result = await caller.getClusterByName({ name: "test-cluster" })

      // Assert
      expect(mockClient.get).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots/test-cluster"
      )
      expect(result).toBeDefined()
    })

    it("should return undefined when schema validation fails", async () => {
      // Arrange
      const invalidResponse = { invalid: "data" }
      mockClient.get.mockResolvedValue(invalidResponse)

      // Act
      const result = await caller.getClusterByName({ name: "test-cluster" })

      // Assert
      expect(result).toBeUndefined()
    })

    it("should use correct namespace and cluster name", async () => {
      // Arrange
      process.env.GARDENER_PROJECT = "another-project"
      mockClient.get.mockResolvedValue(validShootApiResponse)

      // Act
      await caller.getClusterByName({ name: "my-cluster" })

      // Assert
      expect(mockClient.get).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-another-project/shoots/my-cluster"
      )
    })
  })

  describe("deleteCluster", () => {
    it("should successfully delete a cluster", async () => {
      // Arrange
      mockClient.patch.mockResolvedValue({ success: true })
      mockClient.delete.mockResolvedValue(validShootApiResponse)

      // Act
      const result = await caller.deleteCluster({ name: "test-cluster" })

      // Assert
      expect(mockClient.patch).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots/test-cluster",
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
      expect(mockClient.delete).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots/test-cluster"
      )
      expect(result).toBeDefined()
    })

    it("should handle error during annotation patch", async () => {
      // Arrange
      const mockError = {
        response: {
          json: vi.fn().mockResolvedValue({
            error: "Permission denied for patch operation",
          }),
        },
      }
      mockClient.patch.mockRejectedValue(mockError)

      // Act & Assert
      await expect(caller.deleteCluster({ name: "test-cluster" })).rejects.toThrow(
        "Error adding deletion confirmation: Permission denied for patch operation"
      )
    })

    it("should handle error during cluster deletion", async () => {
      // Arrange
      mockClient.patch.mockResolvedValue({ success: true })
      const mockError = {
        response: {
          json: vi.fn().mockResolvedValue({
            message: "Cluster not found",
          }),
        },
      }
      mockClient.delete.mockRejectedValue(mockError)

      // Act & Assert
      await expect(caller.deleteCluster({ name: "test-cluster" })).rejects.toThrow(
        "Error deleting cluster: Cluster not found"
      )
    })

    it("should return undefined when delete response schema validation fails", async () => {
      // Arrange
      mockClient.patch.mockResolvedValue({ success: true })
      mockClient.delete.mockResolvedValue({ invalid: "response" })

      // Act
      const result = await caller.deleteCluster({ name: "test-cluster" })

      // Assert
      expect(result).toBeUndefined()
    })

    it("should use correct namespace and cluster name", async () => {
      // Arrange
      process.env.GARDENER_PROJECT = "delete-project"
      mockClient.patch.mockResolvedValue({ success: true })
      mockClient.delete.mockResolvedValue(validShootApiResponse)

      // Act
      await caller.deleteCluster({ name: "cluster-to-delete" })

      // Assert
      expect(mockClient.patch).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-delete-project/shoots/cluster-to-delete",
        expect.any(Array),
        expect.any(Object)
      )
      expect(mockClient.delete).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-delete-project/shoots/cluster-to-delete"
      )
    })
  })

  describe("createCluster", () => {
    const validCreateInput = {
      name: "new-cluster",
      region: "eu-west-1",
      kubernetesVersion: "1.27.3",
      cloudProfileName: "aws-eu-west-1",
      infrastructure: {
        type: "openstack",
        loadBalancerProvider: "f5",
        floatingPoolName: "public-pool",
      },
      networking: {
        type: "calico",
        pods: "10.96.0.0/11",
        nodes: "10.250.0.0/16",
        services: "10.112.0.0/12",
      },
      workers: [
        {
          name: "containerd",
          machineType: "m5.large",
          machineImage: {
            name: "gardenlinux",
            version: "934.8.0",
          },
          minimum: 1,
          maximum: 3,
          zones: ["eu-west-1a"],
        },
      ],
      secretBindingName: "openstack-secret",
      credentialsBindingName: "openstack-credentials",
      updateStrategy: "AutoRollingUpdate" as const,
    }

    const expectedShootObject = {
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
          pods: "10.96.0.0/11",
          nodes: "10.250.0.0/16",
          services: "10.112.0.0/12",
          ipFamilies: ["IPv4"],
        },
        provider: {
          type: "openstack",
          controlPlaneConfig: {
            apiVersion: "openstack.provider.extensions.gardener.cloud/v1alpha1",
            kind: "ControlPlaneConfig",
            loadBalancerProvider: "f5",
          },
          infrastructureConfig: {
            apiVersion: "openstack.provider.extensions.gardener.cloud/v1alpha1",
            kind: "InfrastructureConfig",
            networks: {
              workers: "10.250.0.0/16",
            },
            floatingPoolName: "public-pool",
          },
          workers: [
            {
              name: "containerd",
              machine: {
                type: "m5.large",
                image: {
                  name: "gardenlinux",
                  version: "934.8.0",
                },
                architecture: "amd64",
              },
              minimum: 1,
              maximum: 3,
              maxSurge: 1,
              maxUnavailable: 0,
              zones: ["eu-west-1a"],
              cri: {
                name: "containerd",
              },
              systemComponents: {
                allow: true,
              },
              updateStrategy: "AutoRollingUpdate",
            },
          ],
        },
        cloudProfileName: "aws-eu-west-1",
        secretBindingName: "openstack-secret",
        credentialsBindingName: "openstack-credentials",
        region: "eu-west-1",
      },
    }

    it("should successfully create a cluster", async () => {
      // Arrange
      mockClient.post.mockResolvedValue(validShootApiResponse)

      // Act
      const result = await caller.createCluster(validCreateInput)

      // Assert
      expect(mockClient.post).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-test-project/shoots",
        expectedShootObject
      )
      expect(result).toBeDefined()
    })

    it("should create cluster with minimal required fields", async () => {
      // Arrange
      const minimalInput = {
        name: "minimal-cluster",
        region: "eu-west-1",
        kubernetesVersion: "1.27.3",
        cloudProfileName: "aws-eu-west-1",
        infrastructure: {
          floatingPoolName: "public-pool",
        },
        networking: {
          pods: "10.96.0.0/11",
          nodes: "10.250.0.0/16",
          services: "10.112.0.0/12",
        },
        workers: [
          {
            machineType: "m5.large",
            machineImage: {
              name: "gardenlinux",
              version: "934.8.0",
            },
            minimum: 1,
            maximum: 3,
            zones: ["eu-west-1a"],
          },
        ],
      }

      mockClient.post.mockResolvedValue(validShootApiResponse)

      // Act
      const result = await caller.createCluster(minimalInput)

      // Assert
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: expect.objectContaining({
            name: "minimal-cluster",
          }),
          spec: expect.objectContaining({
            provider: expect.objectContaining({
              type: "openstack", // default value
              workers: expect.arrayContaining([
                expect.objectContaining({
                  name: "containerd", // default value
                  updateStrategy: "AutoRollingUpdate", // default value
                }),
              ]),
            }),
          }),
        })
      )
      expect(result).toBeDefined()
    })

    it("should handle create cluster API error", async () => {
      // Arrange
      const mockError = {
        response: {
          json: vi.fn().mockResolvedValue({
            error: "Insufficient permissions to create cluster",
          }),
        },
      }
      mockClient.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(caller.createCluster(validCreateInput)).rejects.toThrow(
        "Error creating cluster: Insufficient permissions to create cluster"
      )
    })

    it("should throw TRPCError when response schema validation fails", async () => {
      // Arrange
      mockClient.post.mockResolvedValue({ invalid: "response" })

      // Act & Assert
      await expect(caller.createCluster(validCreateInput)).rejects.toThrow(TRPCError)
      await expect(caller.createCluster(validCreateInput)).rejects.toThrow("Failed to parse the API response")
    })

    it("should use correct namespace from environment variable", async () => {
      // Arrange
      process.env.GARDENER_PROJECT = "create-project"
      mockClient.post.mockResolvedValue(validShootApiResponse)

      // Act
      await caller.createCluster(validCreateInput)

      // Assert
      expect(mockClient.post).toHaveBeenCalledWith(
        "apis/core.gardener.cloud/v1beta1/namespaces/garden-create-project/shoots",
        expect.objectContaining({
          metadata: expect.objectContaining({
            namespace: "garden-create-project",
          }),
        })
      )
    })

    it("should handle multiple workers", async () => {
      // Arrange
      const inputWithMultipleWorkers = {
        ...validCreateInput,
        workers: [
          {
            name: "worker-1",
            machineType: "m5.large",
            machineImage: {
              name: "gardenlinux",
              version: "934.8.0",
            },
            minimum: 1,
            maximum: 3,
            zones: ["eu-west-1a"],
          },
          {
            name: "worker-2",
            machineType: "m5.xlarge",
            machineImage: {
              name: "ubuntu",
              version: "20.04",
            },
            minimum: 2,
            maximum: 5,
            zones: ["eu-west-1b", "eu-west-1c"],
          },
        ],
      }

      mockClient.post.mockResolvedValue(validShootApiResponse)

      // Act
      await caller.createCluster(inputWithMultipleWorkers)

      // Assert
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          spec: expect.objectContaining({
            provider: expect.objectContaining({
              workers: expect.arrayContaining([
                expect.objectContaining({
                  name: "worker-1",
                  machine: expect.objectContaining({
                    type: "m5.large",
                  }),
                  zones: ["eu-west-1a"],
                }),
                expect.objectContaining({
                  name: "worker-2",
                  machine: expect.objectContaining({
                    type: "m5.xlarge",
                  }),
                  zones: ["eu-west-1b", "eu-west-1c"],
                }),
              ]),
            }),
          }),
        })
      )
    })
  })
})
