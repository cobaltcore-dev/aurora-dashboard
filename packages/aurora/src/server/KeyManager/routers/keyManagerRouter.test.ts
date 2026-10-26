import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { keyManagerRouter } from "./keyManagerRouter"
import { AuroraPortalContext } from "@/server/context"

const TEST_PROJECT_ID = "proj-1"

const defaultSecrets = [
  {
    secret_ref: "https://barbican.example.com/v1/secrets/secret-1",
    name: "db-password",
    status: "ACTIVE",
    algorithm: "aes",
    bit_length: 256,
    mode: "cbc",
    secret_type: "opaque",
    content_types: { default: "text/plain" },
    created: "2026-01-10T08:00:00Z",
    updated: "2026-01-10T08:00:00Z",
    expiration: null,
  },
  {
    secret_ref: "https://barbican.example.com/v1/secrets/secret-2",
    name: null,
    status: "PENDING",
    algorithm: null,
    bit_length: null,
    mode: null,
    secret_type: "passphrase",
    content_types: null,
    created: "2026-01-11T08:00:00Z",
    updated: "2026-01-11T08:00:00Z",
    expiration: null,
  },
]

const defaultContainers = [
  {
    container_ref: "https://barbican.example.com/v1/containers/container-1",
    name: "tls-bundle",
    type: "certificate" as const,
    status: "ACTIVE",
    created: "2026-01-10T08:00:00Z",
    updated: "2026-01-10T08:00:00Z",
    secret_refs: [{ name: "certificate", secret_ref: "https://barbican.example.com/v1/secrets/secret-1" }],
  },
]

const defaultOrders = [
  {
    order_ref: "https://barbican.example.com/v1/orders/order-1",
    type: "key",
    status: "ACTIVE",
    sub_status: null,
    sub_status_message: null,
    created: "2026-01-10T08:00:00Z",
    updated: "2026-01-10T08:00:00Z",
    secret_ref: "https://barbican.example.com/v1/secrets/secret-1",
    meta: { name: "generated-key", algorithm: "aes" },
  },
]

const createMockContext = (opts?: {
  noService?: boolean
  invalidSession?: boolean
  parseError?: boolean
  httpStatus?: number
  statusText?: string
  mockSecrets?: unknown[]
  mockContainers?: unknown[]
  mockOrders?: unknown[]
  payloadText?: string
  payloadContentType?: string
  /** "throw" (default) mirrors signal-openstack: non-2xx rejects with SignalOpenstackApiError. "response" resolves with ok: false. */
  errorMode?: "throw" | "response"
}) => {
  const {
    noService = false,
    invalidSession = false,
    parseError = false,
    httpStatus = 200,
    statusText,
    mockSecrets = defaultSecrets,
    mockContainers = defaultContainers,
    mockOrders = defaultOrders,
    payloadText = "s3cr3t-payload",
    payloadContentType = "text/plain",
    errorMode = "throw",
  } = opts || {}

  const ok = httpStatus >= 200 && httpStatus < 300

  const response = (body: unknown, overrides: { ok?: boolean; status?: number } = {}) => ({
    ok: overrides.ok ?? ok,
    status: overrides.status ?? httpStatus,
    statusText: statusText ?? (ok ? "OK" : "Error"),
    json: vi.fn().mockResolvedValue(parseError ? { invalid: "data" } : body),
    text: vi.fn().mockResolvedValue(payloadText),
    headers: { get: vi.fn().mockReturnValue(payloadContentType) },
  })

  const reply = (body: unknown, overrides: { ok?: boolean; status?: number } = {}) => {
    const res = response(body, overrides)
    if (!res.ok && errorMode === "throw") return Promise.reject(new SignalOpenstackApiError(res.statusText, res.status))
    return Promise.resolve(res)
  }

  const getMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/payload")) return reply({})
    if (url.startsWith("v1/secrets/")) return reply(mockSecrets[0])
    if (url.startsWith("v1/secrets")) return reply({ total: mockSecrets.length, secrets: mockSecrets })
    if (url.startsWith("v1/containers/")) return reply(mockContainers[0])
    if (url.startsWith("v1/containers")) return reply({ total: mockContainers.length, containers: mockContainers })
    if (url.startsWith("v1/orders/")) return reply(mockOrders[0])
    if (url.startsWith("v1/orders")) return reply({ total: mockOrders.length, orders: mockOrders })
    return reply({})
  })

  const postMock = vi.fn().mockImplementation((url: string) => {
    if (url.startsWith("v1/secrets")) return reply({ secret_ref: "https://barbican.example.com/v1/secrets/new-secret" })
    if (url.includes("/secrets")) return reply({})
    if (url.startsWith("v1/containers"))
      return reply({ container_ref: "https://barbican.example.com/v1/containers/new-container" })
    if (url.startsWith("v1/orders")) return reply({ order_ref: "https://barbican.example.com/v1/orders/new-order" })
    return reply({})
  })

  const putMock = vi.fn().mockImplementation(() => reply({}))

  const delMock = vi.fn().mockImplementation(() => {
    const res = { ok, status: httpStatus, statusText: statusText ?? (ok ? "No Content" : "Error") }
    if (!ok && errorMode === "throw") return Promise.reject(new SignalOpenstackApiError(res.statusText, res.status))
    return Promise.resolve(res)
  })

  const mockOpenstackSession = {
    getToken: vi.fn().mockReturnValue({
      authToken: "mock-auth-token",
      tokenData: { project: { id: TEST_PROJECT_ID, name: "test-project" }, user: { id: "user-1", name: "test-user" } },
    }),
    service: vi.fn().mockImplementation((serviceName: string) => {
      if (serviceName === "key-manager" && !noService) {
        return { get: getMock, post: postMock, put: putMock, del: delMock }
      }
      return null
    }),
  }

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    identityEndpoint: "http://identity.example.com/",
    imageMetadataExcludedProperties: [],
    openstack: mockOpenstackSession,
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    rescopeSession: vi.fn().mockResolvedValue(!invalidSession ? mockOpenstackSession : null),
    getMultipartData: vi.fn(),
    __getMock: getMock,
    __postMock: postMock,
    __putMock: putMock,
    __delMock: delMock,
  } as unknown as AuroraPortalContext & {
    __getMock: typeof getMock
    __postMock: typeof postMock
    __putMock: typeof putMock
    __delMock: typeof delMock
  }
}

const createCaller = createCallerFactory(auroraRouter({ keyManager: keyManagerRouter }))

const splitUrl = (url: string) => {
  const [path, query] = url.split("?")
  return { path, params: new URLSearchParams(query) }
}

describe("keyManagerRouter secrets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("listSecrets", () => {
    it("returns the list of secrets on success", async () => {
      const caller = createCaller(createMockContext())

      const result = await caller.keyManager.listSecrets({ project_id: TEST_PROJECT_ID })

      expect(result.total).toBe(2)
      expect(result.secrets).toHaveLength(2)
      expect(result.secrets[0].secret_ref).toContain("secret-1")
      expect(result.secrets[1].name).toBeNull()
    })

    it("forwards pagination, name and sort query params", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.keyManager.listSecrets({
        project_id: TEST_PROJECT_ID,
        offset: 50,
        limit: 25,
        name: "db",
        sort: "created:desc",
      })

      const { path, params } = splitUrl(ctx.__getMock.mock.calls[0][0] as string)
      expect(path).toBe("v1/secrets")
      expect(params.get("offset")).toBe("50")
      expect(params.get("limit")).toBe("25")
      expect(params.get("name")).toBe("db")
      expect(params.get("sort")).toBe("created:desc")
    })

    it("omits name and sort when not provided", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.keyManager.listSecrets({ project_id: TEST_PROJECT_ID })

      const { params } = splitUrl(ctx.__getMock.mock.calls[0][0] as string)
      expect(params.has("name")).toBe(false)
      expect(params.has("sort")).toBe(false)
    })

    it("throws INTERNAL_SERVER_ERROR when the key-manager service is unavailable", async () => {
      const caller = createCaller(createMockContext({ noService: true }))

      await expect(caller.keyManager.listSecrets({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
        new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Key-manager service is not available" })
      )
    })

    it("throws PARSE_ERROR when the response cannot be parsed", async () => {
      const caller = createCaller(createMockContext({ parseError: true }))

      await expect(caller.keyManager.listSecrets({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
        new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in keyManager.listSecrets" })
      )
    })

    it("maps a 403 to FORBIDDEN", async () => {
      const caller = createCaller(createMockContext({ httpStatus: 403, statusText: "Forbidden" }))

      await expect(caller.keyManager.listSecrets({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
    })
  })

  describe("getSecret", () => {
    it("requests the secret detail endpoint with the encoded id", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.keyManager.getSecret({ project_id: TEST_PROJECT_ID, secretId: "secret 1" })

      expect(ctx.__getMock).toHaveBeenCalledWith("v1/secrets/secret%201")
    })

    it("returns the secret on success", async () => {
      const caller = createCaller(createMockContext())

      const result = await caller.keyManager.getSecret({ project_id: TEST_PROJECT_ID, secretId: "secret-1" })

      expect(result.name).toBe("db-password")
      expect(result.secret_type).toBe("opaque")
    })

    it("maps a 404 to NOT_FOUND", async () => {
      const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Not Found" }))

      await expect(
        caller.keyManager.getSecret({ project_id: TEST_PROJECT_ID, secretId: "missing" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" })
    })
  })

  describe("getSecretPayload", () => {
    it("returns the raw payload text and content type", async () => {
      const caller = createCaller(
        createMockContext({ payloadText: "my-key", payloadContentType: "application/octet-stream" })
      )

      const result = await caller.keyManager.getSecretPayload({ project_id: TEST_PROJECT_ID, secretId: "secret-1" })

      expect(result).toEqual({ payload: "my-key", contentType: "application/octet-stream" })
    })

    it("requests the payload endpoint with an octet-stream Accept header and debugging disabled", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.keyManager.getSecretPayload({ project_id: TEST_PROJECT_ID, secretId: "secret-1" })

      expect(ctx.__getMock).toHaveBeenCalledWith("v1/secrets/secret-1/payload", {
        headers: { Accept: "application/octet-stream" },
        debug: false,
      })
    })
  })

  describe("createSecret", () => {
    it("posts the secret body and returns the new id derived from the ref", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      const result = await caller.keyManager.createSecret({
        project_id: TEST_PROJECT_ID,
        name: "api-key",
        secret_type: "opaque",
        payload: "value",
        payload_content_type: "text/plain",
      })

      expect(ctx.__postMock).toHaveBeenCalledWith(
        "v1/secrets",
        expect.objectContaining({ name: "api-key", secret_type: "opaque", payload: "value" })
      )
      expect(result).toEqual({
        secretId: "new-secret",
        secret_ref: "https://barbican.example.com/v1/secrets/new-secret",
      })
    })

    it("maps a 409 to CONFLICT when the client resolves a non-ok response", async () => {
      const caller = createCaller(createMockContext({ httpStatus: 409, statusText: "Conflict", errorMode: "response" }))

      await expect(caller.keyManager.createSecret({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
        code: "CONFLICT",
      })
    })
  })

  describe("updateSecret", () => {
    it("puts the payload with the content-type header", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.keyManager.updateSecret({
        project_id: TEST_PROJECT_ID,
        secretId: "secret-1",
        payload: "new-value",
        payload_content_type: "text/plain",
      })

      expect(ctx.__putMock).toHaveBeenCalledWith("v1/secrets/secret-1", "new-value", {
        headers: { "Content-Type": "text/plain" },
      })
    })
  })

  describe("deleteSecret", () => {
    it("calls the delete endpoint with the encoded id", async () => {
      const ctx = createMockContext({ httpStatus: 204 })
      const caller = createCaller(ctx)

      await caller.keyManager.deleteSecret({ project_id: TEST_PROJECT_ID, secretId: "secret-1" })

      expect(ctx.__delMock).toHaveBeenCalledWith("v1/secrets/secret-1")
    })

    it("maps a 404 to NOT_FOUND", async () => {
      const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Not Found" }))

      await expect(
        caller.keyManager.deleteSecret({ project_id: TEST_PROJECT_ID, secretId: "missing" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" })
    })
  })
})

describe("keyManagerRouter containers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("listContainers", () => {
    it("returns the list of containers on success", async () => {
      const caller = createCaller(createMockContext())

      const result = await caller.keyManager.listContainers({ project_id: TEST_PROJECT_ID })

      expect(result.total).toBe(1)
      expect(result.containers[0].type).toBe("certificate")
    })

    it("forwards pagination and name params but not sort", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.keyManager.listContainers({ project_id: TEST_PROJECT_ID, offset: 20, limit: 10, name: "tls" })

      const { path, params } = splitUrl(ctx.__getMock.mock.calls[0][0] as string)
      expect(path).toBe("v1/containers")
      expect(params.get("offset")).toBe("20")
      expect(params.get("limit")).toBe("10")
      expect(params.get("name")).toBe("tls")
      expect(params.has("sort")).toBe(false)
    })
  })

  describe("getContainer", () => {
    it("returns the container on success", async () => {
      const caller = createCaller(createMockContext())

      const result = await caller.keyManager.getContainer({ project_id: TEST_PROJECT_ID, containerId: "container-1" })

      expect(result.name).toBe("tls-bundle")
      expect(result.secret_refs).toHaveLength(1)
    })
  })

  describe("createContainer", () => {
    it("posts the container body and returns the new id", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      const result = await caller.keyManager.createContainer({
        project_id: TEST_PROJECT_ID,
        name: "bundle",
        type: "generic",
        secret_refs: [{ name: "cert", secret_ref: "https://barbican.example.com/v1/secrets/secret-1" }],
      })

      expect(ctx.__postMock).toHaveBeenCalledWith(
        "v1/containers",
        expect.objectContaining({ name: "bundle", type: "generic" })
      )
      expect(result.containerId).toBe("new-container")
    })

    it("rejects an invalid container type before calling Barbican", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await expect(
        // @ts-expect-error intentionally invalid type
        caller.keyManager.createContainer({ project_id: TEST_PROJECT_ID, type: "bogus" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" })
      expect(ctx.__postMock).not.toHaveBeenCalled()
    })
  })

  describe("deleteContainer", () => {
    it("calls the delete endpoint", async () => {
      const ctx = createMockContext({ httpStatus: 204 })
      const caller = createCaller(ctx)

      await caller.keyManager.deleteContainer({ project_id: TEST_PROJECT_ID, containerId: "container-1" })

      expect(ctx.__delMock).toHaveBeenCalledWith("v1/containers/container-1")
    })
  })
})

describe("keyManagerRouter orders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("listOrders", () => {
    it("returns the list of orders on success", async () => {
      const caller = createCaller(createMockContext())

      const result = await caller.keyManager.listOrders({ project_id: TEST_PROJECT_ID })

      expect(result.total).toBe(1)
      expect(result.orders[0].type).toBe("key")
    })

    it("splits a combined sort into sort_key and sort_dir", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.keyManager.listOrders({ project_id: TEST_PROJECT_ID, sort: "created:desc" })

      const { path, params } = splitUrl(ctx.__getMock.mock.calls[0][0] as string)
      expect(path).toBe("v1/orders")
      expect(params.get("sort_key")).toBe("created")
      expect(params.get("sort_dir")).toBe("desc")
      expect(params.has("sort")).toBe(false)
    })
  })

  describe("getOrder", () => {
    it("returns the order on success", async () => {
      const caller = createCaller(createMockContext())

      const result = await caller.keyManager.getOrder({ project_id: TEST_PROJECT_ID, orderId: "order-1" })

      expect(result.type).toBe("key")
      expect(result.secret_ref).toContain("secret-1")
    })
  })

  describe("createOrder", () => {
    it("posts the order body and returns the new id", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      const result = await caller.keyManager.createOrder({
        project_id: TEST_PROJECT_ID,
        type: "key",
        meta: { name: "my-key", algorithm: "aes" },
      })

      expect(ctx.__postMock).toHaveBeenCalledWith("v1/orders", {
        type: "key",
        meta: { name: "my-key", algorithm: "aes" },
      })
      expect(result.orderId).toBe("new-order")
    })
  })

  describe("deleteOrder", () => {
    it("calls the delete endpoint", async () => {
      const ctx = createMockContext({ httpStatus: 204 })
      const caller = createCaller(ctx)

      await caller.keyManager.deleteOrder({ project_id: TEST_PROJECT_ID, orderId: "order-1" })

      expect(ctx.__delMock).toHaveBeenCalledWith("v1/orders/order-1")
    })
  })
})

describe("keyManagerRouter error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([400, 401, 403, 404])("maps status %i thrown by signal-openstack to a non-500 code", async (status) => {
    const caller = createCaller(createMockContext({ httpStatus: status, statusText: "Barbican error" }))

    await expect(caller.keyManager.getSecret({ project_id: TEST_PROJECT_ID, secretId: "s" })).rejects.not.toMatchObject(
      {
        code: "INTERNAL_SERVER_ERROR",
      }
    )
  })

  it("maps a thrown 409 to INTERNAL_SERVER_ERROR (the shared middleware does not special-case 409)", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 409, statusText: "Conflict" }))

    await expect(caller.keyManager.getSecret({ project_id: TEST_PROJECT_ID, secretId: "s" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    })
  })

  it("maps an unknown status to INTERNAL_SERVER_ERROR", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 500, statusText: "Server Error" }))

    await expect(caller.keyManager.getSecret({ project_id: TEST_PROJECT_ID, secretId: "s" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    })
  })

  it("still maps non-ok responses from clients that resolve instead of throwing", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Not Found", errorMode: "response" }))

    await expect(caller.keyManager.getSecret({ project_id: TEST_PROJECT_ID, secretId: "s" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
