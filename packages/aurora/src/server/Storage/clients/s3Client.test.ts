import { describe, it, expect } from "vitest"
import { createS3Client } from "./s3Client"
import { S3Client } from "@aws-sdk/client-s3"

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
