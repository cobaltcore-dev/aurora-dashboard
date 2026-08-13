/**
 * Maximum number of keys returned per S3 ListObjects request.
 *
 * This is the AWS S3 maximum. We use this value as a performance trade-off:
 * - Fast response times for list operations
 * - Bucket metadata (count, size) are estimates for buckets > 1000 objects
 *
 * See: https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
 */
export const S3_MAX_KEYS_PER_REQUEST = 1000

/**
 * S3 SigV4 pre-signed URLs are valid for at most 7 days (604800 seconds); the
 * signer rejects anything larger. Caps `expiresIn` in the presigned-URL input
 * schema and rejects over-range custom durations in the UI before they reach
 * the BFF.
 */
export const S3_PRESIGN_MAX_EXPIRY_SECONDS = 604800
