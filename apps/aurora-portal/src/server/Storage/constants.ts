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
