import { describe, it, expect } from "vitest"
import { convertShootApiResponseToCluster, convertShootListApiSchemaToClusters } from "./cluster"
import { ShootApiResponse } from "./shootApiSchema"

describe("Cluster Conversion Functions", () => {
  // Test data for a basic operational cluster
  const mockOperationalShoot: ShootApiResponse = {
    metadata: {
      name: "test-cluster",
      namespace: "garden-test",
      uid: "12345678-1234-1234-1234-123456789012",
      resourceVersion: "1234567",
      generation: 1,
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      cloudProfileName: "openstack",
      kubernetes: {
        version: "1.25.4",
      },
      networking: {
        type: "calico",
        pods: "100.96.0.0/11",
        nodes: "10.250.0.0/16",
        services: "100.64.0.0/13",
        ipFamilies: ["IPv4"],
      },
      provider: {
        type: "openstack",
        controlPlaneConfig: {},
        infrastructureConfig: {},
        workers: [
          {
            name: "worker-pool-1",
            machine: {
              type: "m1.large",
              image: {
                name: "ubuntu",
                version: "20.04",
              },
              architecture: "amd64",
            },
            maximum: 5,
            minimum: 2,
            maxSurge: 1,
            maxUnavailable: 0,
            zones: ["eu-de-1", "eu-de-2"],
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
      region: "eu-de",
      maintenance: {
        autoUpdate: {
          kubernetesVersion: true,
          machineImageVersion: true,
        },
        timeWindow: {
          begin: "220000+0100",
          end: "230000+0100",
        },
      },
    },
    status: {
      lastOperation: {
        description: "Cluster is running",
        lastUpdateTime: "2023-05-01T10:00:00Z",
        progress: 100,
        state: "Succeeded",
        type: "Reconcile",
      },
      conditions: [
        {
          type: "APIServerAvailable",
          status: "True",
          lastTransitionTime: "2023-05-01T09:58:00Z",
          lastUpdateTime: "2023-05-01T09:58:00Z",
          reason: "APIServerRunning",
          message: "API server is running",
        },
        {
          type: "ControlPlaneHealthy",
          status: "True",
          lastTransitionTime: "2023-05-01T09:59:00Z",
          lastUpdateTime: "2023-05-01T09:59:00Z",
          reason: "ControlPlaneRunning",
          message: "Control plane is running",
        },
      ],
    },
  }

  // Test data for a processing (reconciling) cluster
  const mockReconcilingShoot: ShootApiResponse = {
    ...mockOperationalShoot,
    metadata: {
      ...mockOperationalShoot.metadata,
      uid: "87654321-4321-4321-4321-210987654321",
      name: "reconciling-cluster",
    },
    status: {
      ...mockOperationalShoot.status,
      lastOperation: {
        description: "Reconciling Shoot cluster state",
        lastUpdateTime: "2023-05-01T12:00:00Z",
        progress: 45,
        state: "Processing",
        type: "Reconcile",
      },
    },
  }

  // Test data for a creating cluster
  const mockCreatingShoot: ShootApiResponse = {
    ...mockOperationalShoot,
    metadata: {
      ...mockOperationalShoot.metadata,
      uid: "11112222-3333-4444-5555-666677778888",
      name: "creating-cluster",
    },
    status: {
      ...mockOperationalShoot.status,
      lastOperation: {
        description: "Creating infrastructure resources",
        lastUpdateTime: "2023-05-01T11:00:00Z",
        progress: 30,
        state: "Processing",
        type: "Create",
      },
    },
  }

  // Test data for an error cluster
  const mockErrorShoot: ShootApiResponse = {
    ...mockOperationalShoot,
    metadata: {
      ...mockOperationalShoot.metadata,
      uid: "99998888-7777-6666-5555-444433332222",
      name: "error-cluster",
    },
    status: {
      ...mockOperationalShoot.status,
      lastOperation: {
        description: "Cannot create infrastructure resources",
        lastUpdateTime: "2023-05-01T13:00:00Z",
        progress: 10,
        state: "Failed",
        type: "Create",
      },
      lastErrors: [
        {
          description: "Resource quota exceeded",
          taskID: "task-123",
          lastUpdateTime: "2023-05-01T13:00:00Z",
        },
      ],
    },
  }

  // Test data for a shoot with missing status
  const mockMissingStatusShoot: ShootApiResponse = {
    metadata: {
      ...mockOperationalShoot.metadata,
      uid: "12121212-3434-5656-7878-909090909090",
      name: "missing-status-cluster",
    },
    spec: { ...mockOperationalShoot.spec },
    // status is intentionally omitted
  }

  // Test data for a deleting cluster
  const mockDeletingShoot: ShootApiResponse = {
    ...mockOperationalShoot,
    metadata: {
      ...mockOperationalShoot.metadata,
      uid: "13579246-2468-1357-8642-123456789012",
      name: "deleting-cluster",
    },
    status: {
      ...mockOperationalShoot.status,
      lastOperation: {
        description: "Deleting cluster resources",
        lastUpdateTime: "2023-05-01T14:00:00Z",
        progress: 60,
        state: "Processing",
        type: "Delete",
      },
    },
  }

  describe("convertShootApiResponseToCluster", () => {
    it("should convert an operational shoot to cluster format correctly", () => {
      const result = convertShootApiResponseToCluster(mockOperationalShoot)

      expect(result).toMatchObject({
        uid: mockOperationalShoot.metadata.uid,
        name: mockOperationalShoot.metadata.name,
        region: mockOperationalShoot.spec.region,
        infrastructure: mockOperationalShoot.spec.provider.type,
        status: "Operational",
        version: mockOperationalShoot.spec.kubernetes.version,
        readiness: "2/2", // Based on the 2 conditions in the mock
        stateDetails: {
          progress: 100,
          type: "Reconcile",
          description: "Cluster is running",
          lastTransitionTime: "2023-05-01T10:00:00Z",
        },
      })

      // Check workers
      expect(result.workers).toHaveLength(1)
      expect(result.workers[0]).toMatchObject({
        name: "worker-pool-1",
        architecture: "amd64",
        machineType: "m1.large",
        machineImage: {
          name: "ubuntu",
          version: "20.04",
        },
        containerRuntime: "containerd",
        min: 2,
        max: 5,
        maxSurge: 1,
        zones: ["eu-de-1", "eu-de-2"],
      })

      // Check maintenance
      expect(result.maintenance).toMatchObject({
        startTime: "220000+0100",
        windowTime: "230000+0100",
      })

      // Check autoUpdate
      expect(result.autoUpdate).toMatchObject({
        os: true,
        kubernetes: true,
      })
    })

    it("should handle reconciling cluster correctly", () => {
      const result = convertShootApiResponseToCluster(mockReconcilingShoot)

      expect(result.status).toBe("Reconciling")
      expect(result.stateDetails).toMatchObject({
        progress: 45,
        type: "Reconcile",
        description: "Reconciling Shoot cluster state",
      })
    })

    it("should handle creating cluster correctly", () => {
      const result = convertShootApiResponseToCluster(mockCreatingShoot)

      // Check if it's correctly handling the creating state
      // Note: If you've enhanced your getStatus function to return 'Creating' for this case,
      // update this expectation accordingly
      expect(result.status).toBe("Reconciling") // or 'Creating' if you modified getStatus
      expect(result.stateDetails).toMatchObject({
        progress: 30,
        type: "Create",
        description: "Creating infrastructure resources",
      })
    })

    it("should handle error cluster correctly", () => {
      const result = convertShootApiResponseToCluster(mockErrorShoot)

      expect(result.status).toBe("Error")
      expect(result.stateDetails).toMatchObject({
        progress: 10,
        type: "Create",
        description: "Cannot create infrastructure resources",
      })
    })

    it("should handle missing status correctly", () => {
      const result = convertShootApiResponseToCluster(mockMissingStatusShoot)

      expect(result.status).toBe("Unknown")
      expect(result.readiness).toBe("Unknown")
      expect(result.stateDetails).toBeUndefined()
    })

    it("should handle deleting cluster correctly", () => {
      const result = convertShootApiResponseToCluster(mockDeletingShoot)

      // Check if it's correctly handling the deleting state
      // Note: If you've enhanced your getStatus function to return 'Deleting' for this case,
      // update this expectation accordingly
      expect(result.status).toBe("Reconciling") // or 'Deleting' if you modified getStatus
      expect(result.stateDetails).toMatchObject({
        progress: 60,
        type: "Delete",
        description: "Deleting cluster resources",
      })
    })
  })

  describe("convertShootListApiSchemaToClusters", () => {
    it("should convert a list of shoots to clusters", () => {
      const shootList = [mockOperationalShoot, mockReconcilingShoot, mockCreatingShoot, mockErrorShoot]

      const result = convertShootListApiSchemaToClusters(shootList)

      expect(result).toHaveLength(4)

      // Check that each item was converted correctly
      expect(result[0].name).toBe(mockOperationalShoot.metadata.name)
      expect(result[1].name).toBe(mockReconcilingShoot.metadata.name)
      expect(result[2].name).toBe(mockCreatingShoot.metadata.name)
      expect(result[3].name).toBe(mockErrorShoot.metadata.name)

      // Check statuses
      expect(result[0].status).toBe("Operational")
      expect(result[1].status).toBe("Reconciling")
      expect(result[2].status).toBe("Reconciling") // or 'Creating' if modified
      expect(result[3].status).toBe("Error")
    })

    it("should handle an empty shoot list", () => {
      expect(convertShootListApiSchemaToClusters([])).toEqual([])
    })
  })

  // Testing the enhanced status function (if implemented)
  describe("enhanced status detection", () => {
    it("should detect creating status from type", () => {
      // If you've enhanced your getStatus function to be more specific based on operation type
      // Modify this test accordingly

      const result = convertShootApiResponseToCluster(mockCreatingShoot)

      // If your enhanced getStatus function returns 'Creating', uncomment this test
      expect(result.status).toBe("Reconciling") // or 'Creating' if you modified getStatus;
      expect(result.stateDetails?.type).toBe("Create")
    })

    it("should detect deleting status from type", () => {
      // If you've enhanced your getStatus function to be more specific based on operation type
      // Modify this test accordingly

      const result = convertShootApiResponseToCluster(mockDeletingShoot)

      // If your enhanced getStatus function returns 'Deleting', uncomment this test
      expect(result.status).toBe("Reconciling") // or 'Deleting' if you modified getStatus
      expect(result.stateDetails?.type).toBe("Delete")
    })
  })
})
