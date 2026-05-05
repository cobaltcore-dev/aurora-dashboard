import { S3Client } from "@aws-sdk/client-s3"

/**
 * Creates an S3Client configured for Ceph RGW.
 * forcePathStyle is required for Ceph — it does not support virtual-hosted-style URLs.
 */
export function createS3Client(access: string, secret: string): S3Client {
  return new S3Client({
    region: process.env.CEPH_REGION || "default",
    endpoint: process.env.CEPH_S3_ENDPOINT,
    credentials: {
      accessKeyId: access,
      secretAccessKey: secret,
    },
    forcePathStyle: true,
  })
}
