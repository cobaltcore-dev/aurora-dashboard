import { vi } from "vitest"
import type { AuroraPortalContext } from "../../../context"

// ============================================================================
// MOCK DATA
// ============================================================================

export const TEST_PROJECT_ID = "test-project-id"
export const TEST_USER_ID = "test-user-id"
export const TEST_ACCESS = "AKIAIOSFODNN7EXAMPLE"
export const TEST_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export const TEST_CEPH_REGION = "ceph-objectstore-st1-test-region"

// ============================================================================
// MOCK CONTEXT FACTORY
// ============================================================================

interface MockContextOptions {
  shouldFailAuth?: boolean
  hasCredentials?: boolean
  endpoint?: string
  region?: string
}

export const createMockContext = (options: MockContextOptions = {}) => {
  const {
    shouldFailAuth = false,
    hasCredentials = true,
    endpoint = "https://test-ceph.example.com",
    region = "test-region",
  } = options

  const credBlob = JSON.stringify({ access: TEST_ACCESS, secret: TEST_SECRET })

  const mockIdentity = {
    get: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credentials: hasCredentials
          ? [{ id: "cred-id", type: "ec2", project_id: TEST_PROJECT_ID, user_id: TEST_USER_ID, blob: credBlob }]
          : [],
      }),
    }),
    post: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credential: {
          id: "cred-id",
          type: "ec2",
          project_id: TEST_PROJECT_ID,
          user_id: TEST_USER_ID,
          blob: credBlob,
        },
      }),
    }),
    del: vi.fn().mockResolvedValue({ ok: true, status: 204 }),
    availableEndpoints: vi.fn().mockReturnValue([]),
  }

  const mockCephService = {
    getEndpoint: () => endpoint,
    availableEndpoints: () => [
      {
        region,
        url: endpoint,
        interface: "public",
        id: "test-id",
        region_id: region,
      },
    ],
  }

  const mockToken = {
    tokenData: {
      project: { id: TEST_PROJECT_ID },
      user: {
        id: TEST_USER_ID,
        domain: { id: "default", name: "Default" },
        name: "test-user",
        password_expires_at: "",
      },
      catalog: [
        {
          type: "ceph",
          name: "ceph",
          endpoints: [{ region, url: endpoint }],
        },
      ],
      expires_at: "",
      issued_at: "",
      methods: [],
      roles: [],
    },
  }

  const mockOpenstack = {
    service: (serviceName: string) => {
      if (serviceName === "ceph") return mockCephService
      return mockIdentity
    },
    getToken: vi.fn().mockReturnValue(mockToken),
  }

  return {
    req: { headers: {} },
    validateSession: vi.fn().mockReturnValue(!shouldFailAuth),
    identityEndpoint: "http://identity.example.com/",
    cephRegion: TEST_CEPH_REGION,
    imageMetadataExcludedProperties: [],
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    openstack: mockOpenstack,
    rescopeSession: vi.fn().mockResolvedValue(mockOpenstack),
    mockIdentity,
  } as unknown as AuroraPortalContext & { mockIdentity: typeof mockIdentity }
}
