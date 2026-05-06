import { swiftRouter } from "./swiftRouter"
import { ec2CredentialRouter } from "./ec2CredentialRouter"
import { s3BucketRouter } from "./s3BucketRouter"
import { auroraRouter } from "../../trpc"

export const objectStorageRouters = {
  storage: {
    swift: auroraRouter({
      ...swiftRouter,
    }),
    s3: auroraRouter({
      ec2Credentials: auroraRouter({
        ...ec2CredentialRouter,
      }),
      buckets: auroraRouter({
        ...s3BucketRouter,
      }),
    }),
  },
}
