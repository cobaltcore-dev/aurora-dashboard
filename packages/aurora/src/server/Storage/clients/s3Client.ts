import { S3Client } from "@aws-sdk/client-s3"

/**
 * Creates an S3Client configured for Ceph RGW.
 * forcePathStyle is required for Ceph — it does not support virtual-hosted-style URLs.
 *
 * @param access - AWS access key ID
 * @param secret - AWS secret access key
 * @param endpoint - S3 endpoint URL (required)
 * @param region - AWS region (default: "default")
 */
export function createS3Client(access: string, secret: string, endpoint: string, region = "default"): S3Client {
  if (!access?.trim()) {
    throw new Error("S3 access key is required")
  }
  if (!secret?.trim()) {
    throw new Error("S3 secret key is required")
  }
  if (!endpoint?.trim()) {
    throw new Error("S3 endpoint is required")
  }

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: access,
      secretAccessKey: secret,
    },
    forcePathStyle: true,
  })
}
