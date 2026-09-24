import { describe, it, expect } from "vitest"
import { createS3Client } from "./s3Client"
import { S3Client } from "@aws-sdk/client-s3"
import { S3_CONNECTION_TIMEOUT_MS } from "../constants"

// ============================================================================
// MOCK DATA / TEST CONSTANTS
// ============================================================================

const TEST_ACCESS = "AKIAIOSFODNN7EXAMPLE"
const TEST_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
const TEST_ENDPOINT = "https://test-ceph.example.com"
const TEST_REGION = "ceph-objectstore-st1-eu-de-2"

// ============================================================================
// TESTS
// ============================================================================

describe("createS3Client", () => {
  describe("successful client creation", () => {
    it("creates S3Client with correct configuration", () => {
      const client = createS3Client(TEST_ACCESS, TEST_SECRET, TEST_ENDPOINT, TEST_REGION)

      expect(client).toBeInstanceOf(S3Client)
    })

    it("sets forcePathStyle to true for Ceph compatibility", () => {
      const client = createS3Client(TEST_ACCESS, TEST_SECRET, TEST_ENDPOINT, TEST_REGION)

      expect(client.config.forcePathStyle).toBe(true)
    })

    it("applies the Ceph connection timeout to the underlying HTTP handler", async () => {
      // The SDK accepts requestHandler as either an HttpHandler instance or the
      // NodeHttpHandler constructor options (NodeHttpHandler.create branches on
      // `typeof x.handle === "function"`), and this file passes the options object.
      // Pin the resulting behaviour so an SDK upgrade that narrowed that contract
      // would fail here rather than silently drop the timeout.
      const client = createS3Client(TEST_ACCESS, TEST_SECRET, TEST_ENDPOINT, TEST_REGION)

      const handler = (await client.config.requestHandler) as unknown as {
        handle: (request: unknown, options: { abortSignal: AbortSignal }) => Promise<unknown>
        httpHandlerConfigs: () => { connectionTimeout?: number }
      }

      // NodeHttpHandler resolves its config lazily, on the first handle() call, and
      // httpHandlerConfigs() reports {} until then. An already-aborted signal forces
      // that resolution and rejects before any socket is opened.
      const controller = new AbortController()
      controller.abort()
      await expect(
        handler.handle(
          {
            protocol: "https:",
            hostname: "test-ceph.example.com",
            port: 443,
            method: "GET",
            path: "/",
            headers: {},
            query: {},
          },
          { abortSignal: controller.signal }
        )
      ).rejects.toThrow()

      expect(handler.httpHandlerConfigs().connectionTimeout).toBe(S3_CONNECTION_TIMEOUT_MS)
    })

    it("uses provided access key, secret key, endpoint, and region", async () => {
      const client = createS3Client(TEST_ACCESS, TEST_SECRET, TEST_ENDPOINT, TEST_REGION)

      const credentialsFn = client.config.credentials
      if (typeof credentialsFn === "function") {
        const credentials = await credentialsFn()
        expect(credentials?.accessKeyId).toBe(TEST_ACCESS)
        expect(credentials?.secretAccessKey).toBe(TEST_SECRET)
      }

      const endpointFn = client.config.endpoint
      if (typeof endpointFn === "function") {
        expect(await endpointFn()).toMatchObject({
          protocol: "https:",
          hostname: "test-ceph.example.com",
        })
      }

      const regionFn = client.config.region
      if (typeof regionFn === "function") {
        expect(await regionFn()).toBe(TEST_REGION)
      }
    })

    it("defaults region to 'default' when not provided", async () => {
      const client = createS3Client(TEST_ACCESS, TEST_SECRET, TEST_ENDPOINT)

      const regionFn = client.config.region
      if (typeof regionFn === "function") {
        expect(await regionFn()).toBe("default")
      }
    })
  })

  describe("access key validation", () => {
    it("throws when access key is empty string", () => {
      expect(() => createS3Client("", TEST_SECRET, TEST_ENDPOINT, TEST_REGION)).toThrow("S3 access key is required")
    })

    it("throws when access key is whitespace only", () => {
      expect(() => createS3Client("   ", TEST_SECRET, TEST_ENDPOINT, TEST_REGION)).toThrow("S3 access key is required")
    })

    it("throws when access key is null", () => {
      expect(() => createS3Client(null as unknown as string, TEST_SECRET, TEST_ENDPOINT, TEST_REGION)).toThrow(
        "S3 access key is required"
      )
    })

    it("throws when access key is undefined", () => {
      expect(() => createS3Client(undefined as unknown as string, TEST_SECRET, TEST_ENDPOINT, TEST_REGION)).toThrow(
        "S3 access key is required"
      )
    })
  })

  describe("secret key validation", () => {
    it("throws when secret key is empty string", () => {
      expect(() => createS3Client(TEST_ACCESS, "", TEST_ENDPOINT, TEST_REGION)).toThrow("S3 secret key is required")
    })

    it("throws when secret key is whitespace only", () => {
      expect(() => createS3Client(TEST_ACCESS, "   ", TEST_ENDPOINT, TEST_REGION)).toThrow("S3 secret key is required")
    })

    it("throws when secret key is null", () => {
      expect(() => createS3Client(TEST_ACCESS, null as unknown as string, TEST_ENDPOINT, TEST_REGION)).toThrow(
        "S3 secret key is required"
      )
    })

    it("throws when secret key is undefined", () => {
      expect(() => createS3Client(TEST_ACCESS, undefined as unknown as string, TEST_ENDPOINT, TEST_REGION)).toThrow(
        "S3 secret key is required"
      )
    })
  })

  describe("endpoint validation", () => {
    it("throws when endpoint is empty string", () => {
      expect(() => createS3Client(TEST_ACCESS, TEST_SECRET, "", TEST_REGION)).toThrow("S3 endpoint is required")
    })

    it("throws when endpoint is whitespace only", () => {
      expect(() => createS3Client(TEST_ACCESS, TEST_SECRET, "   ", TEST_REGION)).toThrow("S3 endpoint is required")
    })

    it("throws when endpoint is null", () => {
      expect(() => createS3Client(TEST_ACCESS, TEST_SECRET, null as unknown as string, TEST_REGION)).toThrow(
        "S3 endpoint is required"
      )
    })

    it("throws when endpoint is undefined", () => {
      expect(() => createS3Client(TEST_ACCESS, TEST_SECRET, undefined as unknown as string, TEST_REGION)).toThrow(
        "S3 endpoint is required"
      )
    })
  })
})
