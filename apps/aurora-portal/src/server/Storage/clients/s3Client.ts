import { S3Client } from "@aws-sdk/client-s3"

/**
 * Creates an S3Client configured for Ceph RGW.
 * forcePathStyle is required for Ceph — it does not support virtual-hosted-style URLs.
 */
export function createS3Client(access: string, secret: string, endpoint?: string, region?: string): S3Client {
  if (!access?.trim()) {
    throw new Error("S3 access key is not configured")
  }
  if (!secret?.trim()) {
    throw new Error("S3 secret key is not configured")
  }

  const resolvedEndpoint = endpoint ?? process.env.CEPH_S3_ENDPOINT
  if (!resolvedEndpoint) {
    throw new Error(
      "S3 endpoint is not configured. Set CEPH_S3_ENDPOINT environment variable or pass endpoint parameter."
    )
  }

  const resolvedRegion = region ?? process.env.CEPH_REGION ?? "default"

  return new S3Client({
    region: resolvedRegion,
    endpoint: resolvedEndpoint,
    credentials: {
      accessKeyId: access,
      secretAccessKey: secret,
    },
    forcePathStyle: true,
  })
}
