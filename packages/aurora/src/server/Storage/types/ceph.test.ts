import { describe, it, expect } from "vitest"
import {
  // EC2 credential schemas
  ec2CredentialSchema,
  ec2CredentialWithSecretSchema,
  listEc2CredentialsInputSchema,
  createEc2CredentialInputSchema,
  deleteEc2CredentialInputSchema,
  // Container / bucket schemas
  containerSchema,
  listContainersInputSchema,
  bucketNameSchema,
  existingBucketNameSchema,
  createBucketInputSchema,
  createBucketOutputSchema,
  deleteBucketInputSchema,
  // S3 status schema
  s3StatusSchema,
  // S3 object schemas
  s3ObjectSchema,
  s3ObjectVersionSchema,
  s3FolderPrefixSchema,
  listObjectsInputSchema,
  listObjectsOutputSchema,
  getObjectDetailsInputSchema,
  s3ObjectDetailsSchema,
  // Object operation schemas
  deleteObjectInputSchema,
  createFolderInputSchema,
  copyObjectInputSchema,
  copyObjectOutputSchema,
  moveObjectInputSchema,
  updateMetadataInputSchema,
  downloadObjectInputSchema,
  watchDownloadProgressInputSchema,
  generatePresignedUrlInputSchema,
  // Service info schemas
  s3ServiceInfoSchema,
  getServiceInfoInputSchema,
  // Bucket policy schemas
  bucketPolicyStatementSchema,
  bucketPolicyDocumentSchema,
  getBucketPolicyInputSchema,
  getBucketPolicyOutputSchema,
  setBucketPolicyInputSchema,
  deleteBucketPolicyInputSchema,
  // Lifecycle configuration schemas
  lifecycleRuleStatusSchema,
  lifecycleExpirationSchema,
  lifecycleTransitionSchema,
  lifecycleNoncurrentVersionExpirationSchema,
  lifecycleNoncurrentVersionTransitionSchema,
  lifecycleAbortIncompleteMultipartUploadSchema,
  lifecycleTagSchema,
  lifecycleFilterSchema,
  lifecycleRuleSchema,
  lifecycleRuleReadSchema,
  lifecycleConfigurationSchema,
  getLifecycleInputSchema,
  getLifecycleOutputSchema,
  setLifecycleInputSchema,
  deleteLifecycleInputSchema,
} from "./ceph"
import { S3_PRESIGN_MAX_EXPIRY_SECONDS } from "../constants"

describe("Ceph Object Storage Schema Validation", () => {
  // Common test data
  const projectId = "e9141fb24eee4b3e9f25ae69cda31132"
  const bucketName = "test-bucket"
  const objectKey = "folder/test-object.txt"

  describe("EC2 Credential Schemas", () => {
    describe("ec2CredentialSchema", () => {
      it("should validate a valid credential", () => {
        const input = {
          id: "cred-1",
          access: "AKIAIOSFODNN7EXAMPLE",
          user_id: "user-abc",
          project_id: projectId,
        }
        const result = ec2CredentialSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject when a required field is missing", () => {
        const input = { id: "cred-1", access: "AKIA...", user_id: "user-abc" }
        const result = ec2CredentialSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("ec2CredentialWithSecretSchema", () => {
      it("should validate a credential including the secret", () => {
        const input = {
          id: "cred-1",
          access: "AKIAIOSFODNN7EXAMPLE",
          user_id: "user-abc",
          project_id: projectId,
          secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        }
        const result = ec2CredentialWithSecretSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject when secret is missing", () => {
        const input = { id: "cred-1", access: "AKIA...", user_id: "user-abc", project_id: projectId }
        const result = ec2CredentialWithSecretSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("listEc2CredentialsInputSchema", () => {
      it("should validate with project_id", () => {
        const result = listEc2CredentialsInputSchema.safeParse({ project_id: projectId })
        expect(result.success).toBe(true)
      })

      it("should reject without project_id", () => {
        const result = listEc2CredentialsInputSchema.safeParse({})
        expect(result.success).toBe(false)
      })
    })

    describe("createEc2CredentialInputSchema", () => {
      it("should validate with project_id", () => {
        const result = createEc2CredentialInputSchema.safeParse({ project_id: projectId })
        expect(result.success).toBe(true)
      })
    })

    describe("deleteEc2CredentialInputSchema", () => {
      it("should validate with project_id and credentialId", () => {
        const input = { project_id: projectId, credentialId: "cred-1" }
        const result = deleteEc2CredentialInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject missing credentialId", () => {
        const result = deleteEc2CredentialInputSchema.safeParse({ project_id: projectId })
        expect(result.success).toBe(false)
      })

      it("should reject empty credentialId", () => {
        const input = { project_id: projectId, credentialId: "" }
        const result = deleteEc2CredentialInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })
  })

  describe("Container / Bucket Schemas", () => {
    describe("containerSchema", () => {
      it("should validate a minimal container (defaults applied)", () => {
        const result = containerSchema.safeParse({ name: bucketName })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.count).toBe(0)
          expect(result.data.bytes).toBe(0)
        }
      })

      it("should validate a complete container", () => {
        const input = {
          name: bucketName,
          count: 42,
          bytes: 1073741824,
          last_modified: "2025-03-01T12:00:00Z",
          creationDate: "2024-01-01T00:00:00Z",
        }
        const result = containerSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject missing name", () => {
        const result = containerSchema.safeParse({ count: 0, bytes: 0 })
        expect(result.success).toBe(false)
      })
    })

    describe("listContainersInputSchema", () => {
      it("should validate with just project_id (includeMetadata defaults false)", () => {
        const result = listContainersInputSchema.safeParse({ project_id: projectId })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.includeMetadata).toBe(false)
        }
      })

      it("should validate with includeMetadata true", () => {
        const input = { project_id: projectId, includeMetadata: true }
        const result = listContainersInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("bucketNameSchema (strict — for creation)", () => {
      it("should accept a minimal valid name", () => {
        expect(bucketNameSchema.safeParse("abc").success).toBe(true)
      })

      it("should accept names with hyphens and periods", () => {
        expect(bucketNameSchema.safeParse("my-bucket.backup-01").success).toBe(true)
      })

      it("should reject names shorter than 3 characters", () => {
        expect(bucketNameSchema.safeParse("ab").success).toBe(false)
      })

      it("should reject names longer than 63 characters", () => {
        expect(bucketNameSchema.safeParse("a".repeat(64)).success).toBe(false)
      })

      it("should accept exactly 63 characters", () => {
        // "a" + 61 middle chars + "a" = 63, all valid per the regex
        const name = "a" + "a".repeat(61) + "a"
        expect(bucketNameSchema.safeParse(name).success).toBe(true)
      })

      it("should reject uppercase letters", () => {
        expect(bucketNameSchema.safeParse("My-Bucket").success).toBe(false)
      })

      it("should reject names starting with a hyphen", () => {
        expect(bucketNameSchema.safeParse("-my-bucket").success).toBe(false)
      })

      it("should reject names ending with a period", () => {
        expect(bucketNameSchema.safeParse("my-bucket.").success).toBe(false)
      })

      it("should reject consecutive periods", () => {
        expect(bucketNameSchema.safeParse("my..bucket").success).toBe(false)
      })

      it("should reject names formatted as an IP address", () => {
        expect(bucketNameSchema.safeParse("192.168.1.1").success).toBe(false)
      })

      it("should reject spaces", () => {
        expect(bucketNameSchema.safeParse("my bucket").success).toBe(false)
      })

      it("should reject underscores", () => {
        expect(bucketNameSchema.safeParse("my_bucket").success).toBe(false)
      })
    })

    describe("existingBucketNameSchema (permissive — for existing buckets)", () => {
      it("should accept a single character", () => {
        expect(existingBucketNameSchema.safeParse("a").success).toBe(true)
      })

      it("should accept uppercase and spaces (legacy Swift-created buckets)", () => {
        expect(existingBucketNameSchema.safeParse("My Bucket Name").success).toBe(true)
      })

      it("should accept up to 255 characters", () => {
        expect(existingBucketNameSchema.safeParse("a".repeat(255)).success).toBe(true)
      })

      it("should reject more than 255 characters", () => {
        expect(existingBucketNameSchema.safeParse("a".repeat(256)).success).toBe(false)
      })

      it("should reject an empty string", () => {
        expect(existingBucketNameSchema.safeParse("").success).toBe(false)
      })
    })

    describe("createBucketInputSchema", () => {
      it("should validate with a valid bucket name (enableVersioning defaults false)", () => {
        const input = { project_id: projectId, bucketName }
        const result = createBucketInputSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.enableVersioning).toBe(false)
        }
      })

      it("should validate with enableVersioning true", () => {
        const input = { project_id: projectId, bucketName, enableVersioning: true }
        const result = createBucketInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject an invalid bucket name", () => {
        const input = { project_id: projectId, bucketName: "Invalid_Bucket!" }
        const result = createBucketInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("createBucketOutputSchema", () => {
      it("should validate a success output", () => {
        const result = createBucketOutputSchema.safeParse({ success: true })
        expect(result.success).toBe(true)
      })

      it("should validate a success output with a versioning error", () => {
        const input = { success: true, versioningError: "Failed to enable versioning" }
        const result = createBucketOutputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("deleteBucketInputSchema", () => {
      it("should validate with project_id and bucketName", () => {
        const input = { project_id: projectId, bucketName }
        const result = deleteBucketInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject an empty bucketName", () => {
        const input = { project_id: projectId, bucketName: "" }
        const result = deleteBucketInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })
  })

  describe("S3 Status Schema", () => {
    describe("s3StatusSchema", () => {
      it("should validate hasCredentials true", () => {
        expect(s3StatusSchema.safeParse({ hasCredentials: true }).success).toBe(true)
      })

      it("should validate hasCredentials false", () => {
        expect(s3StatusSchema.safeParse({ hasCredentials: false }).success).toBe(true)
      })

      it("should reject missing hasCredentials", () => {
        expect(s3StatusSchema.safeParse({}).success).toBe(false)
      })
    })
  })

  describe("S3 Object Schemas", () => {
    describe("s3ObjectSchema", () => {
      it("should validate a minimal object", () => {
        const input = { key: objectKey, size: 1024 }
        expect(s3ObjectSchema.safeParse(input).success).toBe(true)
      })

      it("should validate a complete object", () => {
        const input = {
          key: objectKey,
          lastModified: "2025-03-01T12:00:00Z",
          size: 2048,
          etag: '"abc123"',
          storageClass: "STANDARD",
        }
        expect(s3ObjectSchema.safeParse(input).success).toBe(true)
      })

      it("should reject missing key", () => {
        expect(s3ObjectSchema.safeParse({ size: 1024 }).success).toBe(false)
      })

      it("should reject missing size", () => {
        expect(s3ObjectSchema.safeParse({ key: objectKey }).success).toBe(false)
      })
    })

    describe("s3ObjectVersionSchema", () => {
      it("should validate a version (isDeleteMarker defaults false)", () => {
        const input = { key: objectKey, versionId: "v1", isLatest: true, size: 1024 }
        const result = s3ObjectVersionSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.isDeleteMarker).toBe(false)
        }
      })

      it("should validate a delete marker with size 0", () => {
        const input = {
          key: objectKey,
          versionId: "v2",
          isLatest: true,
          size: 0,
          isDeleteMarker: true,
        }
        expect(s3ObjectVersionSchema.safeParse(input).success).toBe(true)
      })

      it("should reject missing versionId", () => {
        const input = { key: objectKey, isLatest: true, size: 1024 }
        expect(s3ObjectVersionSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing isLatest", () => {
        const input = { key: objectKey, versionId: "v1", size: 1024 }
        expect(s3ObjectVersionSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("s3FolderPrefixSchema", () => {
      it("should validate a folder prefix", () => {
        expect(s3FolderPrefixSchema.safeParse({ prefix: "photos/2024/" }).success).toBe(true)
      })

      it("should reject missing prefix", () => {
        expect(s3FolderPrefixSchema.safeParse({}).success).toBe(false)
      })
    })

    describe("listObjectsInputSchema", () => {
      it("should validate with only required fields (defaults applied)", () => {
        const input = { project_id: projectId, containerName: bucketName }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.maxKeys).toBe(1000)
          expect(result.data.showVersions).toBe(false)
        }
      })

      it("should validate with prefix, delimiter, and pagination tokens", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          prefix: "photos/",
          delimiter: "/",
          maxKeys: 100,
          continuationToken: "token-abc",
          keyMarker: "marker-key",
          versionIdMarker: "marker-version",
          showVersions: true,
        }
        expect(listObjectsInputSchema.safeParse(input).success).toBe(true)
      })

      it("should accept maxKeys of 1 (lower bound)", () => {
        const input = { project_id: projectId, containerName: bucketName, maxKeys: 1 }
        expect(listObjectsInputSchema.safeParse(input).success).toBe(true)
      })

      it("should accept maxKeys of 1000 (upper bound)", () => {
        const input = { project_id: projectId, containerName: bucketName, maxKeys: 1000 }
        expect(listObjectsInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject maxKeys of 0", () => {
        const input = { project_id: projectId, containerName: bucketName, maxKeys: 0 }
        expect(listObjectsInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject maxKeys greater than 1000", () => {
        const input = { project_id: projectId, containerName: bucketName, maxKeys: 1001 }
        expect(listObjectsInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject an empty containerName", () => {
        const input = { project_id: projectId, containerName: "" }
        expect(listObjectsInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("listObjectsOutputSchema", () => {
      it("should validate a minimal output", () => {
        const input = { objects: [], folders: [], isTruncated: false }
        expect(listObjectsOutputSchema.safeParse(input).success).toBe(true)
      })

      it("should validate a paginated output with versions", () => {
        const input = {
          objects: [{ key: objectKey, size: 1024 }],
          folders: [{ prefix: "photos/" }],
          isTruncated: true,
          nextContinuationToken: "token-xyz",
          versions: [{ key: objectKey, versionId: "v1", isLatest: true, size: 1024 }],
          nextKeyMarker: "marker-key",
          nextVersionIdMarker: "marker-version",
        }
        expect(listObjectsOutputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject missing isTruncated", () => {
        const input = { objects: [], folders: [] }
        expect(listObjectsOutputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("getObjectDetailsInputSchema", () => {
      it("should validate with project_id, containerName, objectKey", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey }
        expect(getObjectDetailsInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject an empty objectKey", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey: "" }
        expect(getObjectDetailsInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("s3ObjectDetailsSchema", () => {
      it("should validate details extending the base object schema", () => {
        const input = {
          key: objectKey,
          size: 1024,
          contentType: "application/pdf",
          metadata: { author: "jane", version: "1.0" },
        }
        expect(s3ObjectDetailsSchema.safeParse(input).success).toBe(true)
      })

      it("should validate without contentType or metadata", () => {
        const input = { key: objectKey, size: 1024 }
        expect(s3ObjectDetailsSchema.safeParse(input).success).toBe(true)
      })

      it("should reject non-string metadata values", () => {
        const input = {
          key: objectKey,
          size: 1024,
          metadata: { count: 5 },
        }
        expect(s3ObjectDetailsSchema.safeParse(input).success).toBe(false)
      })
    })
  })

  describe("Object Operation Schemas", () => {
    describe("deleteObjectInputSchema", () => {
      it("should validate a basic delete", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey }
        expect(deleteObjectInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject an empty objectKey", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey: "" }
        expect(deleteObjectInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("createFolderInputSchema", () => {
      it("should validate a folder creation", () => {
        const input = { project_id: projectId, containerName: bucketName, folderPath: "documents/reports/" }
        expect(createFolderInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject an empty folderPath", () => {
        const input = { project_id: projectId, containerName: bucketName, folderPath: "" }
        expect(createFolderInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("copyObjectInputSchema", () => {
      it("should validate a copy (copyMetadata defaults true)", () => {
        const input = {
          project_id: projectId,
          sourceBucket: "src-bucket",
          sourceKey: "src/file.txt",
          destinationBucket: "dest-bucket",
          destinationKey: "dest/file.txt",
        }
        const result = copyObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.copyMetadata).toBe(true)
        }
      })

      it("should validate with copyMetadata false", () => {
        const input = {
          project_id: projectId,
          sourceBucket: "src-bucket",
          sourceKey: "src/file.txt",
          destinationBucket: "dest-bucket",
          destinationKey: "dest/file.txt",
          copyMetadata: false,
        }
        expect(copyObjectInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject missing destinationKey", () => {
        const input = {
          project_id: projectId,
          sourceBucket: "src-bucket",
          sourceKey: "src/file.txt",
          destinationBucket: "dest-bucket",
        }
        expect(copyObjectInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("copyObjectOutputSchema", () => {
      it("should validate a minimal output", () => {
        expect(copyObjectOutputSchema.safeParse({ key: objectKey }).success).toBe(true)
      })

      it("should validate a complete output", () => {
        const input = { key: objectKey, etag: '"abc"', lastModified: "2025-03-01T12:00:00Z" }
        expect(copyObjectOutputSchema.safeParse(input).success).toBe(true)
      })
    })

    describe("moveObjectInputSchema", () => {
      it("should validate a move", () => {
        const input = {
          project_id: projectId,
          sourceBucket: "src-bucket",
          sourceKey: "src/file.txt",
          destinationBucket: "dest-bucket",
          destinationKey: "dest/file.txt",
        }
        expect(moveObjectInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject missing sourceKey", () => {
        const input = {
          project_id: projectId,
          sourceBucket: "src-bucket",
          destinationBucket: "dest-bucket",
          destinationKey: "dest/file.txt",
        }
        expect(moveObjectInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("updateMetadataInputSchema", () => {
      it("should validate a metadata update", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey,
          metadata: { version: "2.0", updated: "2025-03-01" },
        }
        expect(updateMetadataInputSchema.safeParse(input).success).toBe(true)
      })

      it("should validate with empty metadata record", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey, metadata: {} }
        expect(updateMetadataInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject non-string metadata values", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey,
          metadata: { count: 5 },
        }
        expect(updateMetadataInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("downloadObjectInputSchema", () => {
      it("should validate valid input with all required fields", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey,
          filename: "test-object.txt",
          downloadId: `${bucketName}:${objectKey}:uuid-1`,
        }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject missing project_id", () => {
        const input = {
          containerName: bucketName,
          objectKey,
          filename: "test-object.txt",
          downloadId: "d1",
        }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing containerName", () => {
        const input = { project_id: projectId, objectKey, filename: "f.txt", downloadId: "d1" }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing objectKey", () => {
        const input = { project_id: projectId, containerName: bucketName, filename: "f.txt", downloadId: "d1" }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing filename", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey, downloadId: "d1" }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject an empty filename", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey, filename: "", downloadId: "d1" }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing downloadId", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey, filename: "f.txt" }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject an empty downloadId", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey,
          filename: "f.txt",
          downloadId: "",
        }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject an empty objectKey", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey: "",
          filename: "f.txt",
          downloadId: "d1",
        }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject an empty containerName", () => {
        const input = {
          project_id: projectId,
          containerName: "",
          objectKey,
          filename: "f.txt",
          downloadId: "d1",
        }
        expect(downloadObjectInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("watchDownloadProgressInputSchema", () => {
      it("should validate with project_id and downloadId", () => {
        const input = { project_id: projectId, downloadId: `${bucketName}:${objectKey}:uuid-1` }
        expect(watchDownloadProgressInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject missing downloadId", () => {
        expect(watchDownloadProgressInputSchema.safeParse({ project_id: projectId }).success).toBe(false)
      })

      it("should reject an empty downloadId", () => {
        const input = { project_id: projectId, downloadId: "" }
        expect(watchDownloadProgressInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing project_id", () => {
        const input = { downloadId: "d1" }
        expect(watchDownloadProgressInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("generatePresignedUrlInputSchema", () => {
      it("should validate valid input with all required fields", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey, expiresIn: 3600 }
        expect(generatePresignedUrlInputSchema.safeParse(input).success).toBe(true)
      })

      it("should accept the maximum expiry (7 days)", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey,
          expiresIn: S3_PRESIGN_MAX_EXPIRY_SECONDS,
        }
        expect(generatePresignedUrlInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject an expiry beyond the 7-day maximum", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey,
          expiresIn: S3_PRESIGN_MAX_EXPIRY_SECONDS + 1,
        }
        expect(generatePresignedUrlInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject a zero or negative expiry", () => {
        expect(
          generatePresignedUrlInputSchema.safeParse({
            project_id: projectId,
            containerName: bucketName,
            objectKey,
            expiresIn: 0,
          }).success
        ).toBe(false)
        expect(
          generatePresignedUrlInputSchema.safeParse({
            project_id: projectId,
            containerName: bucketName,
            objectKey,
            expiresIn: -60,
          }).success
        ).toBe(false)
      })

      it("should reject a non-integer expiry", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey, expiresIn: 1.5 }
        expect(generatePresignedUrlInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing project_id", () => {
        const input = { containerName: bucketName, objectKey, expiresIn: 3600 }
        expect(generatePresignedUrlInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing containerName", () => {
        const input = { project_id: projectId, objectKey, expiresIn: 3600 }
        expect(generatePresignedUrlInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject an empty objectKey", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey: "", expiresIn: 3600 }
        expect(generatePresignedUrlInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing expiresIn", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey }
        expect(generatePresignedUrlInputSchema.safeParse(input).success).toBe(false)
      })
    })
  })

  describe("Service Info Schemas", () => {
    describe("s3ServiceInfoSchema", () => {
      it("should validate an empty limits/capabilities object (all fields optional)", () => {
        const input = { limits: {}, capabilities: {} }
        expect(s3ServiceInfoSchema.safeParse(input).success).toBe(true)
      })

      it("should validate a fully populated service info", () => {
        const input = {
          limits: {
            maxFileSize: 5368709120,
            maxBucketNameLength: 63,
            maxObjectNameLength: 1024,
            bucketListingLimit: 1000,
            maxDeletesPerRequest: 1000,
            maxMultipartParts: 10000,
            minMultipartPartSize: 5242880,
          },
          capabilities: {
            bucketVersioning: true,
            objectLocking: false,
            bucketReplication: false,
            bucketPolicies: true,
            bucketACLs: true,
            objectACLs: false,
            lifecycleRules: false,
            objectExpiration: false,
            corsConfiguration: true,
            staticWebsiteHosting: false,
            multipartUpload: true,
            presignedUrls: false,
            rangeRequests: true,
            bucketTagging: false,
            objectTagging: false,
            serverAccessLogging: false,
            eventNotifications: false,
            objectMetadata: true,
            serverSideEncryption: false,
          },
          version: "18.2.0",
          region: "default",
        }
        expect(s3ServiceInfoSchema.safeParse(input).success).toBe(true)
      })

      it("should reject missing limits", () => {
        expect(s3ServiceInfoSchema.safeParse({ capabilities: {} }).success).toBe(false)
      })

      it("should reject missing capabilities", () => {
        expect(s3ServiceInfoSchema.safeParse({ limits: {} }).success).toBe(false)
      })
    })

    describe("getServiceInfoInputSchema", () => {
      it("should validate an empty object (no input required)", () => {
        expect(getServiceInfoInputSchema.safeParse({}).success).toBe(true)
      })
    })
  })

  describe("Bucket Policy Schemas", () => {
    describe("bucketPolicyStatementSchema", () => {
      it("should validate a minimal Allow statement with string principal", () => {
        const input = { Effect: "Allow", Principal: "*", Action: "s3:GetObject", Resource: "arn:aws:s3:::bucket/*" }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(true)
      })

      it("should validate a Deny statement", () => {
        const input = { Effect: "Deny", Action: "s3:DeleteObject", Resource: "arn:aws:s3:::bucket/*" }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(true)
      })

      it("should reject an invalid Effect value", () => {
        const input = { Effect: "Maybe", Action: "s3:GetObject", Resource: "arn:aws:s3:::bucket/*" }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(false)
      })

      it("should validate multiple actions and resources as arrays", () => {
        const input = {
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject", "s3:PutObject"],
          Resource: ["arn:aws:s3:::bucket/*", "arn:aws:s3:::bucket"],
        }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(true)
      })

      it("should validate a Principal object with a valid AWS root ARN", () => {
        const input = {
          Effect: "Allow",
          Principal: { AWS: "arn:aws:iam::123456789012:root" },
          Action: "s3:GetObject",
          Resource: "arn:aws:s3:::bucket/*",
        }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(true)
      })

      it("should validate a Principal object with a valid user ARN", () => {
        const input = {
          Effect: "Allow",
          Principal: { AWS: "arn:aws:iam::123456789012:user/alice" },
          Action: "s3:GetObject",
          Resource: "arn:aws:s3:::bucket/*",
        }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(true)
      })

      it("should reject a Principal object with an invalid AWS ARN format", () => {
        const input = {
          Effect: "Allow",
          Principal: { AWS: "not-an-arn" },
          Action: "s3:GetObject",
          Resource: "arn:aws:s3:::bucket/*",
        }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(false)
      })

      it("should reject an empty Principal object (no AWS/Service/Federated)", () => {
        const input = {
          Effect: "Allow",
          Principal: {},
          Action: "s3:GetObject",
          Resource: "arn:aws:s3:::bucket/*",
        }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(false)
      })

      it("should validate a Condition block", () => {
        const input = {
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: "arn:aws:s3:::bucket/*",
          Condition: {
            IpAddress: { "aws:SourceIp": "203.0.113.0/24" },
          },
        }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(true)
      })

      it("should reject unknown top-level fields (strict schema)", () => {
        const input = {
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: "arn:aws:s3:::bucket/*",
          UnknownField: "value",
        }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(false)
      })

      it("should validate a Sid identifier", () => {
        const input = {
          Sid: "AllowPublicRead",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: "arn:aws:s3:::bucket/*",
        }
        expect(bucketPolicyStatementSchema.safeParse(input).success).toBe(true)
      })
    })

    describe("bucketPolicyDocumentSchema", () => {
      const validStatement = {
        Effect: "Allow" as const,
        Principal: "*",
        Action: "s3:GetObject",
        Resource: "arn:aws:s3:::bucket/*",
      }

      it("should validate a document with one statement (Version defaults)", () => {
        const input = { Statement: [validStatement] }
        const result = bucketPolicyDocumentSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.Version).toBe("2012-10-17")
        }
      })

      it("should validate a document with an explicit Version and Id", () => {
        const input = { Version: "2012-10-17", Id: "MyPolicy", Statement: [validStatement] }
        expect(bucketPolicyDocumentSchema.safeParse(input).success).toBe(true)
      })

      it("should reject an empty Statement array", () => {
        const input = { Statement: [] }
        expect(bucketPolicyDocumentSchema.safeParse(input).success).toBe(false)
      })

      it("should reject missing Statement", () => {
        expect(bucketPolicyDocumentSchema.safeParse({}).success).toBe(false)
      })

      it("should reject unknown top-level fields (strict schema)", () => {
        const input = { Statement: [validStatement], UnknownField: "value" }
        expect(bucketPolicyDocumentSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("getBucketPolicyInputSchema", () => {
      it("should validate with project_id and bucketName", () => {
        const input = { project_id: projectId, bucketName }
        expect(getBucketPolicyInputSchema.safeParse(input).success).toBe(true)
      })

      it("should accept a permissive existing bucket name (spaces, uppercase)", () => {
        const input = { project_id: projectId, bucketName: "Legacy Bucket" }
        expect(getBucketPolicyInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject an empty bucketName", () => {
        const input = { project_id: projectId, bucketName: "" }
        expect(getBucketPolicyInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("getBucketPolicyOutputSchema", () => {
      it("should validate a null policy (no policy set)", () => {
        const input = { policy: null, policyText: null }
        expect(getBucketPolicyOutputSchema.safeParse(input).success).toBe(true)
      })

      it("should validate a populated policy", () => {
        const input = {
          policy: {
            Version: "2012-10-17",
            Statement: [
              { Effect: "Allow" as const, Principal: "*", Action: "s3:GetObject", Resource: "arn:aws:s3:::b/*" },
            ],
          },
          policyText: '{"Version":"2012-10-17","Statement":[...]}',
        }
        expect(getBucketPolicyOutputSchema.safeParse(input).success).toBe(true)
      })
    })

    describe("setBucketPolicyInputSchema", () => {
      it("should validate a small policy document", () => {
        const input = { project_id: projectId, bucketName, policy: '{"Version":"2012-10-17","Statement":[]}' }
        expect(setBucketPolicyInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject an empty policy string", () => {
        const input = { project_id: projectId, bucketName, policy: "" }
        expect(setBucketPolicyInputSchema.safeParse(input).success).toBe(false)
      })

      it("should accept a policy string right at the 20KB limit", () => {
        const input = { project_id: projectId, bucketName, policy: "a".repeat(20480) }
        expect(setBucketPolicyInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject a policy string exceeding the 20KB limit", () => {
        const input = { project_id: projectId, bucketName, policy: "a".repeat(20481) }
        expect(setBucketPolicyInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("deleteBucketPolicyInputSchema", () => {
      it("should validate with project_id and bucketName", () => {
        const input = { project_id: projectId, bucketName }
        expect(deleteBucketPolicyInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject missing bucketName", () => {
        expect(deleteBucketPolicyInputSchema.safeParse({ project_id: projectId }).success).toBe(false)
      })
    })
  })

  describe("Edge Cases and Validation Rules", () => {
    describe("Container Name Validation (existing-bucket permissive rules)", () => {
      it("should accept a container name with 1 character", () => {
        const input = { project_id: projectId, bucketName: "a" }
        expect(getBucketPolicyInputSchema.safeParse(input).success).toBe(true)
      })

      it("should accept a container name with 255 characters", () => {
        const input = { project_id: projectId, bucketName: "a".repeat(255) }
        expect(getBucketPolicyInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject a container name with 256 characters", () => {
        const input = { project_id: projectId, bucketName: "a".repeat(256) }
        expect(getBucketPolicyInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("Object Name Validation", () => {
      it("should accept an object key with 1 character", () => {
        const input = { project_id: projectId, containerName: bucketName, objectKey: "x" }
        expect(getObjectDetailsInputSchema.safeParse(input).success).toBe(true)
      })

      it("should accept an object key with path separators and special characters", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey: "path/to/deeply/nested/object-v2.1_final.txt",
        }
        expect(getObjectDetailsInputSchema.safeParse(input).success).toBe(true)
      })
    })

    describe("Pagination Parameters", () => {
      it("should accept maxKeys of 500", () => {
        const input = { project_id: projectId, containerName: bucketName, maxKeys: 500 }
        expect(listObjectsInputSchema.safeParse(input).success).toBe(true)
      })

      it("should default maxKeys to 1000 when omitted", () => {
        const input = { project_id: projectId, containerName: bucketName }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.maxKeys).toBe(1000)
        }
      })
    })

    describe("Metadata Record Validation", () => {
      it("should accept various string key-value pairs", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey,
          metadata: {
            "X-Custom-Header": "value",
            project: "test",
            "key-with-dashes": "value",
            key_with_underscores: "value",
          },
        }
        expect(updateMetadataInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject non-string metadata values", () => {
        const input = {
          project_id: projectId,
          containerName: bucketName,
          objectKey,
          metadata: { key1: "valid", key2: 123 },
        }
        expect(updateMetadataInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("Optional Field Behavior", () => {
      it("should not require optional fields on s3ObjectSchema", () => {
        const input = { key: objectKey, size: 0 }
        expect(s3ObjectSchema.safeParse(input).success).toBe(true)
      })

      it("should preserve undefined optional fields", () => {
        const input = { key: objectKey, size: 1024, lastModified: undefined }
        expect(s3ObjectSchema.safeParse(input).success).toBe(true)
      })

      it("should accept a zero-byte object (e.g. folder marker)", () => {
        const input = { key: "documents/", size: 0 }
        expect(s3ObjectSchema.safeParse(input).success).toBe(true)
      })
    })
  })

  describe("Lifecycle Configuration Schemas", () => {
    describe("lifecycleRuleStatusSchema", () => {
      it("should accept Enabled status", () => {
        expect(lifecycleRuleStatusSchema.safeParse("Enabled").success).toBe(true)
      })

      it("should accept Disabled status", () => {
        expect(lifecycleRuleStatusSchema.safeParse("Disabled").success).toBe(true)
      })

      it("should reject invalid status", () => {
        expect(lifecycleRuleStatusSchema.safeParse("Active").success).toBe(false)
        expect(lifecycleRuleStatusSchema.safeParse("").success).toBe(false)
      })
    })

    describe("lifecycleExpirationSchema", () => {
      it("should accept Days expiration", () => {
        const input = { Days: 30 }
        expect(lifecycleExpirationSchema.safeParse(input).success).toBe(true)
      })

      it("should accept Date expiration", () => {
        const input = { Date: "2024-12-31T00:00:00.000Z" }
        expect(lifecycleExpirationSchema.safeParse(input).success).toBe(true)
      })

      it("should accept ExpiredObjectDeleteMarker", () => {
        const input = { ExpiredObjectDeleteMarker: true }
        expect(lifecycleExpirationSchema.safeParse(input).success).toBe(true)
      })

      it("should reject Days less than 1", () => {
        const input = { Days: 0 }
        expect(lifecycleExpirationSchema.safeParse(input).success).toBe(false)
      })

      it("should reject both Days and Date", () => {
        const input = { Days: 30, Date: "2024-12-31T00:00:00.000Z" }
        expect(lifecycleExpirationSchema.safeParse(input).success).toBe(false)
      })

      it("should reject empty expiration object", () => {
        const input = {}
        expect(lifecycleExpirationSchema.safeParse(input).success).toBe(false)
      })

      it("should reject invalid ISO date", () => {
        const input = { Date: "2024-12-31" } // Missing time
        expect(lifecycleExpirationSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("lifecycleTransitionSchema", () => {
      it("should accept Days with StorageClass", () => {
        const input = { Days: 30, StorageClass: "GLACIER" }
        expect(lifecycleTransitionSchema.safeParse(input).success).toBe(true)
      })

      it("should accept Date with StorageClass", () => {
        const input = { Date: "2024-12-31T00:00:00.000Z", StorageClass: "STANDARD_IA" }
        expect(lifecycleTransitionSchema.safeParse(input).success).toBe(true)
      })

      it("should reject transition without StorageClass", () => {
        const input = { Days: 30 }
        expect(lifecycleTransitionSchema.safeParse(input).success).toBe(false)
      })

      it("should reject transition with both Days and Date", () => {
        const input = { Days: 30, Date: "2024-12-31T00:00:00.000Z", StorageClass: "GLACIER" }
        expect(lifecycleTransitionSchema.safeParse(input).success).toBe(false)
      })

      it("should reject transition with neither Days nor Date", () => {
        const input = { StorageClass: "GLACIER" }
        expect(lifecycleTransitionSchema.safeParse(input).success).toBe(false)
      })

      it("should reject empty StorageClass", () => {
        const input = { Days: 30, StorageClass: "" }
        expect(lifecycleTransitionSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("lifecycleNoncurrentVersionExpirationSchema", () => {
      it("should accept NoncurrentDays", () => {
        const input = { NoncurrentDays: 90 }
        expect(lifecycleNoncurrentVersionExpirationSchema.safeParse(input).success).toBe(true)
      })

      it("should accept NoncurrentDays with NewerNoncurrentVersions", () => {
        const input = { NoncurrentDays: 90, NewerNoncurrentVersions: 3 }
        expect(lifecycleNoncurrentVersionExpirationSchema.safeParse(input).success).toBe(true)
      })

      it("should reject NoncurrentDays less than 1", () => {
        const input = { NoncurrentDays: 0 }
        expect(lifecycleNoncurrentVersionExpirationSchema.safeParse(input).success).toBe(false)
      })

      it("should reject NewerNoncurrentVersions less than 1", () => {
        const input = { NoncurrentDays: 90, NewerNoncurrentVersions: 0 }
        expect(lifecycleNoncurrentVersionExpirationSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("lifecycleNoncurrentVersionTransitionSchema", () => {
      it("should accept valid noncurrent version transition", () => {
        const input = { NoncurrentDays: 30, StorageClass: "GLACIER" }
        expect(lifecycleNoncurrentVersionTransitionSchema.safeParse(input).success).toBe(true)
      })

      it("should accept with NewerNoncurrentVersions", () => {
        const input = { NoncurrentDays: 30, StorageClass: "GLACIER", NewerNoncurrentVersions: 5 }
        expect(lifecycleNoncurrentVersionTransitionSchema.safeParse(input).success).toBe(true)
      })

      it("should reject without StorageClass", () => {
        const input = { NoncurrentDays: 30 }
        expect(lifecycleNoncurrentVersionTransitionSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("lifecycleAbortIncompleteMultipartUploadSchema", () => {
      it("should accept DaysAfterInitiation", () => {
        const input = { DaysAfterInitiation: 7 }
        expect(lifecycleAbortIncompleteMultipartUploadSchema.safeParse(input).success).toBe(true)
      })

      it("should reject DaysAfterInitiation less than 1", () => {
        const input = { DaysAfterInitiation: 0 }
        expect(lifecycleAbortIncompleteMultipartUploadSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("lifecycleTagSchema", () => {
      it("should accept valid tag", () => {
        const input = { Key: "Environment", Value: "Production" }
        expect(lifecycleTagSchema.safeParse(input).success).toBe(true)
      })

      it("should reject Key over 128 characters", () => {
        const input = { Key: "a".repeat(129), Value: "test" }
        expect(lifecycleTagSchema.safeParse(input).success).toBe(false)
      })

      it("should reject Value over 256 characters", () => {
        const input = { Key: "test", Value: "a".repeat(257) }
        expect(lifecycleTagSchema.safeParse(input).success).toBe(false)
      })

      it("should reject empty Key", () => {
        const input = { Key: "", Value: "test" }
        expect(lifecycleTagSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("lifecycleFilterSchema", () => {
      it("should accept empty filter (applies to all objects)", () => {
        const input = {}
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(true)
      })

      it("should accept Prefix only", () => {
        const input = { Prefix: "logs/" }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(true)
      })

      it("should accept Tag only", () => {
        const input = { Tag: { Key: "Environment", Value: "Dev" } }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(true)
      })

      it("should accept ObjectSizeGreaterThan only", () => {
        const input = { ObjectSizeGreaterThan: 1024 }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(true)
      })

      it("should accept ObjectSizeLessThan only", () => {
        const input = { ObjectSizeLessThan: 1048576 }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(true)
      })

      it("should accept And with multiple conditions", () => {
        const input = {
          And: {
            Prefix: "logs/",
            Tags: [{ Key: "Type", Value: "Archive" }],
            ObjectSizeGreaterThan: 1024,
          },
        }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(true)
      })

      it("should accept And with 2 predicates (minimum)", () => {
        const input = {
          And: {
            Prefix: "logs/",
            Tags: [{ Key: "Type", Value: "Archive" }],
          },
        }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(true)
      })

      it("should reject And with only 1 predicate", () => {
        const input = {
          And: {
            Tags: [{ Key: "Type", Value: "Archive" }],
          },
        }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(false)
      })

      it("should reject And with empty Tags array (counts as 0 predicates)", () => {
        const input = {
          And: {
            Prefix: "logs/",
            Tags: [],
          },
        }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(false)
      })

      it("should reject multiple top-level conditions without And", () => {
        const input = {
          Prefix: "logs/",
          Tag: { Key: "Environment", Value: "Dev" },
        }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(false)
      })

      it("should reject And with top-level conditions", () => {
        const input = {
          Prefix: "logs/",
          And: {
            Tags: [{ Key: "Type", Value: "Archive" }],
          },
        }
        expect(lifecycleFilterSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("lifecycleRuleSchema", () => {
      it("should accept rule with Expiration", () => {
        const input = {
          ID: "delete-old-logs",
          Status: "Enabled",
          Filter: { Prefix: "logs/" },
          Expiration: { Days: 30 },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })

      it("should accept rule with Transition", () => {
        const input = {
          ID: "archive-old-data",
          Status: "Enabled",
          Transitions: [{ Days: 90, StorageClass: "GLACIER" }],
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })

      it("should accept rule with multiple Transitions", () => {
        const input = {
          ID: "multi-tier-archive",
          Status: "Enabled",
          Transitions: [
            { Days: 30, StorageClass: "STANDARD_IA" },
            { Days: 90, StorageClass: "GLACIER" },
          ],
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })

      it("should accept rule with NoncurrentVersionExpiration", () => {
        const input = {
          Status: "Enabled",
          NoncurrentVersionExpiration: { NoncurrentDays: 90 },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })

      it("should accept rule with AbortIncompleteMultipartUpload", () => {
        const input = {
          Status: "Enabled",
          AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })

      it("should accept rule with multiple actions", () => {
        const input = {
          ID: "comprehensive-lifecycle",
          Status: "Enabled",
          Filter: { Prefix: "data/" },
          Expiration: { Days: 365 },
          Transitions: [{ Days: 90, StorageClass: "GLACIER" }],
          NoncurrentVersionExpiration: { NoncurrentDays: 90 },
          AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })

      it("should reject rule without any actions", () => {
        const input = {
          ID: "no-actions",
          Status: "Enabled",
          Filter: { Prefix: "logs/" },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(false)
      })

      it("should reject rule with empty Transitions array", () => {
        const input = {
          Status: "Enabled",
          Transitions: [],
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(false)
      })

      it("should reject ID over 255 characters", () => {
        const input = {
          ID: "a".repeat(256),
          Status: "Enabled",
          Expiration: { Days: 30 },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(false)
      })

      it("should accept rule without ID", () => {
        const input = {
          Status: "Enabled",
          Expiration: { Days: 30 },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })

      it("should accept rule without Filter (applies to all objects)", () => {
        const input = {
          Status: "Enabled",
          Expiration: { Days: 30 },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })

      it("should accept legacy Prefix field", () => {
        const input = {
          ID: "legacy-rule",
          Status: "Enabled",
          Prefix: "logs/",
          Expiration: { Days: 30 },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })

      it("should reject both Filter and legacy Prefix set", () => {
        const input = {
          ID: "conflict",
          Status: "Enabled",
          Prefix: "logs/",
          Filter: { Prefix: "data/" },
          Expiration: { Days: 30 },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(false)
      })

      it("should reject ExpiredObjectDeleteMarker with tag filter", () => {
        const input = {
          Status: "Enabled",
          Filter: { Tag: { Key: "Type", Value: "log" } },
          Expiration: { ExpiredObjectDeleteMarker: true },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(false)
      })

      it("should reject ExpiredObjectDeleteMarker with And.Tags", () => {
        const input = {
          Status: "Enabled",
          Filter: {
            And: {
              Prefix: "data/",
              Tags: [{ Key: "Environment", Value: "prod" }],
            },
          },
          Expiration: { ExpiredObjectDeleteMarker: true },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(false)
      })

      it("should accept ExpiredObjectDeleteMarker with prefix-only filter", () => {
        const input = {
          Status: "Enabled",
          Filter: { Prefix: "logs/" },
          Expiration: { ExpiredObjectDeleteMarker: true },
        }
        expect(lifecycleRuleSchema.safeParse(input).success).toBe(true)
      })
    })

    describe("lifecycleRuleReadSchema", () => {
      it("should accept any valid structure (lenient)", () => {
        const input = {
          ID: "test",
          Status: "Enabled",
          Expiration: { Days: 30 },
        }
        expect(lifecycleRuleReadSchema.safeParse(input).success).toBe(true)
      })

      it("should accept rules with unknown status values", () => {
        const input = {
          Status: "CustomStatus",
          Expiration: { Days: 30 },
        }
        expect(lifecycleRuleReadSchema.safeParse(input).success).toBe(true)
      })

      it("should accept rules with any filter structure", () => {
        const input = {
          Status: "Enabled",
          Filter: { CustomField: "value" },
          Expiration: { Days: 30 },
        }
        expect(lifecycleRuleReadSchema.safeParse(input).success).toBe(true)
      })
    })

    describe("lifecycleConfigurationSchema", () => {
      it("should accept configuration with one rule", () => {
        const input = {
          Rules: [
            {
              ID: "delete-old-logs",
              Status: "Enabled",
              Expiration: { Days: 30 },
            },
          ],
        }
        expect(lifecycleConfigurationSchema.safeParse(input).success).toBe(true)
      })

      it("should accept configuration with multiple rules", () => {
        const input = {
          Rules: [
            {
              ID: "delete-logs",
              Status: "Enabled",
              Filter: { Prefix: "logs/" },
              Expiration: { Days: 30 },
            },
            {
              ID: "archive-data",
              Status: "Enabled",
              Filter: { Prefix: "archive/" },
              Transitions: [{ Days: 90, StorageClass: "GLACIER" }],
            },
          ],
        }
        expect(lifecycleConfigurationSchema.safeParse(input).success).toBe(true)
      })

      it("should reject configuration with no rules", () => {
        const input = { Rules: [] }
        expect(lifecycleConfigurationSchema.safeParse(input).success).toBe(false)
      })

      it("should reject configuration with over 100 rules", () => {
        const rules = Array.from({ length: 101 }, (_, i) => ({
          ID: `rule-${i}`,
          Status: "Enabled",
          Expiration: { Days: 30 },
        }))
        const input = { Rules: rules }
        expect(lifecycleConfigurationSchema.safeParse(input).success).toBe(false)
      })

      it("should accept configuration with 100 rules", () => {
        const rules = Array.from({ length: 100 }, (_, i) => ({
          ID: `rule-${i}`,
          Status: "Enabled",
          Expiration: { Days: 30 },
        }))
        const input = { Rules: rules }
        expect(lifecycleConfigurationSchema.safeParse(input).success).toBe(true)
      })

      it("should reject configuration with duplicate rule IDs", () => {
        const input = {
          Rules: [
            {
              ID: "same-id",
              Status: "Enabled",
              Expiration: { Days: 30 },
            },
            {
              ID: "same-id",
              Status: "Enabled",
              Expiration: { Days: 60 },
            },
          ],
        }
        expect(lifecycleConfigurationSchema.safeParse(input).success).toBe(false)
      })

      it("should accept configuration with undefined IDs (no conflict)", () => {
        const input = {
          Rules: [
            {
              Status: "Enabled",
              Expiration: { Days: 30 },
            },
            {
              Status: "Enabled",
              Expiration: { Days: 60 },
            },
          ],
        }
        expect(lifecycleConfigurationSchema.safeParse(input).success).toBe(true)
      })

      it("should accept configuration with empty string IDs (not counted as duplicate)", () => {
        const input = {
          Rules: [
            {
              ID: "",
              Status: "Enabled",
              Expiration: { Days: 30 },
            },
            {
              ID: "",
              Status: "Enabled",
              Expiration: { Days: 60 },
            },
          ],
        }
        expect(lifecycleConfigurationSchema.safeParse(input).success).toBe(true)
      })
    })

    describe("getLifecycleInputSchema", () => {
      it("should accept valid input", () => {
        const input = { project_id: projectId, bucketName }
        expect(getLifecycleInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject without project_id", () => {
        const input = { bucketName }
        expect(getLifecycleInputSchema.safeParse(input).success).toBe(false)
      })

      it("should reject without bucketName", () => {
        const input = { project_id: projectId }
        expect(getLifecycleInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("getLifecycleOutputSchema", () => {
      it("should accept null rules", () => {
        const input = { rules: null }
        expect(getLifecycleOutputSchema.safeParse(input).success).toBe(true)
      })

      it("should accept empty rules array", () => {
        const input = { rules: [] }
        expect(getLifecycleOutputSchema.safeParse(input).success).toBe(true)
      })

      it("should accept rules array", () => {
        const input = {
          rules: [
            {
              ID: "test",
              Status: "Enabled",
              Expiration: { Days: 30 },
            },
          ],
        }
        expect(getLifecycleOutputSchema.safeParse(input).success).toBe(true)
      })
    })

    describe("setLifecycleInputSchema", () => {
      it("should accept valid input with lifecycle configuration", () => {
        const input = {
          project_id: projectId,
          bucketName,
          lifecycleConfiguration: {
            Rules: [
              {
                ID: "delete-old-logs",
                Status: "Enabled",
                Expiration: { Days: 30 },
              },
            ],
          },
        }
        expect(setLifecycleInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject without lifecycleConfiguration", () => {
        const input = { project_id: projectId, bucketName }
        expect(setLifecycleInputSchema.safeParse(input).success).toBe(false)
      })
    })

    describe("deleteLifecycleInputSchema", () => {
      it("should accept valid input", () => {
        const input = { project_id: projectId, bucketName }
        expect(deleteLifecycleInputSchema.safeParse(input).success).toBe(true)
      })

      it("should reject without bucketName", () => {
        const input = { project_id: projectId }
        expect(deleteLifecycleInputSchema.safeParse(input).success).toBe(false)
      })
    })
  })
})
