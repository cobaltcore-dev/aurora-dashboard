import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { mapS3ErrorToTRPCError } from "./s3ErrorMapper"

// ============================================================================
// MOCK DATA / TEST CONSTANTS
// ============================================================================

const TEST_BUCKET = "my-test-bucket"
const TEST_KEY = "path/to/object.txt"
const TEST_OPERATION = "test operation"

// ============================================================================
// TESTS
// ============================================================================

describe("mapS3ErrorToTRPCError", () => {
  describe("S3 error code mapping", () => {
    it("maps NoSuchBucket to NOT_FOUND", () => {
      const error = Object.assign(new Error("The specified bucket does not exist"), { Code: "NoSuchBucket" })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET })).toThrow(
        expect.objectContaining({
          code: "NOT_FOUND",
        })
      )
    })

    it("maps NoSuchKey to NOT_FOUND", () => {
      const error = Object.assign(new Error("The specified key does not exist"), { Code: "NoSuchKey" })

      expect(() =>
        mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET, key: TEST_KEY })
      ).toThrow(
        expect.objectContaining({
          code: "NOT_FOUND",
        })
      )
    })

    it("maps NoSuchUpload to NOT_FOUND", () => {
      const error = Object.assign(new Error("The specified upload does not exist"), { Code: "NoSuchUpload" })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })).toThrow(
        expect.objectContaining({
          code: "NOT_FOUND",
        })
      )
    })

    it("maps BucketAlreadyExists to CONFLICT", () => {
      const error = Object.assign(new Error("The requested bucket name is not available"), {
        Code: "BucketAlreadyExists",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET })).toThrow(
        expect.objectContaining({
          code: "CONFLICT",
        })
      )
    })

    it("maps BucketAlreadyOwnedByYou to CONFLICT", () => {
      const error = Object.assign(new Error("Your previous request to create the named bucket succeeded"), {
        Code: "BucketAlreadyOwnedByYou",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET })).toThrow(
        expect.objectContaining({
          code: "CONFLICT",
        })
      )
    })

    it("maps BucketNotEmpty to PRECONDITION_FAILED", () => {
      const error = Object.assign(new Error("The bucket you tried to delete is not empty"), {
        Code: "BucketNotEmpty",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET })).toThrow(
        expect.objectContaining({
          code: "PRECONDITION_FAILED",
        })
      )
    })

    it("maps AccessDenied to FORBIDDEN", () => {
      const error = Object.assign(new Error("Access Denied"), { Code: "AccessDenied" })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })).toThrow(
        expect.objectContaining({
          code: "FORBIDDEN",
        })
      )
    })

    it("maps AllAccessDisabled to FORBIDDEN", () => {
      const error = Object.assign(new Error("All access to this bucket has been disabled"), {
        Code: "AllAccessDisabled",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET })).toThrow(
        expect.objectContaining({
          code: "FORBIDDEN",
        })
      )
    })

    it("maps InvalidAccessKeyId to UNAUTHORIZED", () => {
      const error = Object.assign(new Error("The AWS access key ID you provided does not exist"), {
        Code: "InvalidAccessKeyId",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })).toThrow(
        expect.objectContaining({
          code: "UNAUTHORIZED",
        })
      )
    })

    it("maps SignatureDoesNotMatch to UNAUTHORIZED", () => {
      const error = Object.assign(new Error("The request signature we calculated does not match"), {
        Code: "SignatureDoesNotMatch",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })).toThrow(
        expect.objectContaining({
          code: "UNAUTHORIZED",
        })
      )
    })

    it("maps TokenRefreshRequired to UNAUTHORIZED", () => {
      const error = Object.assign(new Error("The provided token must be refreshed"), {
        Code: "TokenRefreshRequired",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })).toThrow(
        expect.objectContaining({
          code: "UNAUTHORIZED",
        })
      )
    })

    it("maps RequestTimeTooSkewed to UNAUTHORIZED", () => {
      const error = Object.assign(new Error("The difference between request time and server time is too large"), {
        Code: "RequestTimeTooSkewed",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })).toThrow(
        expect.objectContaining({
          code: "UNAUTHORIZED",
        })
      )
    })

    it("maps InvalidBucketName to BAD_REQUEST", () => {
      const error = Object.assign(new Error("The specified bucket is not valid"), { Code: "InvalidBucketName" })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET })).toThrow(
        expect.objectContaining({
          code: "BAD_REQUEST",
        })
      )
    })

    it("maps KeyTooLongError to BAD_REQUEST", () => {
      const error = Object.assign(new Error("Your key is too long"), { Code: "KeyTooLongError" })

      expect(() =>
        mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET, key: TEST_KEY })
      ).toThrow(
        expect.objectContaining({
          code: "BAD_REQUEST",
        })
      )
    })

    it("maps EntityTooLarge to PAYLOAD_TOO_LARGE", () => {
      const error = Object.assign(new Error("Your proposed upload exceeds the maximum allowed size"), {
        Code: "EntityTooLarge",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })).toThrow(
        expect.objectContaining({
          code: "PAYLOAD_TOO_LARGE",
        })
      )
    })

    it("maps EntityTooSmall to BAD_REQUEST", () => {
      const error = Object.assign(new Error("Your proposed upload is smaller than minimum allowed size"), {
        Code: "EntityTooSmall",
      })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })).toThrow(
        expect.objectContaining({
          code: "BAD_REQUEST",
        })
      )
    })

    it("maps unmapped error codes to INTERNAL_SERVER_ERROR", () => {
      const error = Object.assign(new Error("Some unknown error"), { Code: "UnknownErrorCode" })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })).toThrow(
        expect.objectContaining({
          code: "INTERNAL_SERVER_ERROR",
        })
      )
    })

    it("reads error code from 'name' property when 'Code' is missing", () => {
      const error = Object.assign(new Error("The specified bucket does not exist"), { name: "NoSuchBucket" })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET })).toThrow(
        expect.objectContaining({
          code: "NOT_FOUND",
        })
      )
    })
  })

  describe("error message construction", () => {
    it("includes operation in error message", () => {
      const error = Object.assign(new Error("S3 error"), { Code: "NoSuchBucket" })

      expect(() => mapS3ErrorToTRPCError(error, { operation: "list buckets" })).toThrow(
        expect.objectContaining({
          message: expect.stringContaining("Failed to list buckets"),
        })
      )
    })

    it("includes bucket in error message when provided", () => {
      const error = Object.assign(new Error("S3 error"), { Code: "NoSuchBucket" })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET })).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(`bucket: ${TEST_BUCKET}`),
        })
      )
    })

    it("includes key in error message when provided", () => {
      const error = Object.assign(new Error("S3 error"), { Code: "NoSuchKey" })

      expect(() =>
        mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET, key: TEST_KEY })
      ).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(`key: ${TEST_KEY}`),
        })
      )
    })

    it("includes original S3 message when available", () => {
      const errorMessage = "The specified bucket does not exist in this region"
      const error = Object.assign(new Error(errorMessage), { Code: "NoSuchBucket" })

      expect(() => mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION, bucket: TEST_BUCKET })).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(errorMessage),
        })
      )
    })

    it("constructs message with all context parts", () => {
      const errorMessage = "Access Denied"
      const error = Object.assign(new Error(errorMessage), { Code: "AccessDenied" })

      expect(() =>
        mapS3ErrorToTRPCError(error, { operation: "delete object", bucket: TEST_BUCKET, key: TEST_KEY })
      ).toThrow(
        expect.objectContaining({
          message: `Failed to delete object — bucket: ${TEST_BUCKET} — key: ${TEST_KEY} — ${errorMessage}`,
        })
      )
    })
  })

  describe("TRPCError pass-through", () => {
    it("preserves and re-throws existing TRPCError", () => {
      const existingError = new TRPCError({
        code: "BAD_REQUEST",
        message: "Custom TRPC error",
      })

      expect(() => mapS3ErrorToTRPCError(existingError, { operation: TEST_OPERATION })).toThrow(existingError)
    })
  })

  describe("unmapped error logging", () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    })

    afterEach(() => {
      consoleWarnSpy.mockRestore()
    })

    it("logs unmapped error codes to console", () => {
      const error = Object.assign(new Error("Unknown error"), { Code: "UnmappedErrorCode" })

      try {
        mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })
      } catch {
        // Expected to throw
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith("[s3] Unmapped S3 error code: UnmappedErrorCode")
    })

    it("does not log when error code is mapped", () => {
      const error = Object.assign(new Error("Known error"), { Code: "NoSuchBucket" })

      try {
        mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })
      } catch {
        // Expected to throw
      }

      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("does not log when error code is empty", () => {
      // Create an error without Code or a meaningful name property
      const error = { message: "Error without code" }

      try {
        mapS3ErrorToTRPCError(error, { operation: TEST_OPERATION })
      } catch {
        // Expected to throw
      }

      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })
})
