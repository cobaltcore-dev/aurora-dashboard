import { swiftRouter } from "./swift"
import { ec2CredentialRouter, containerRouter, objectRouter, versioningRouter, bucketPolicyRouter } from "./ceph"
import { auroraRouter } from "../../trpc"

export const objectStorageRouters = {
  storage: {
    swift: auroraRouter({
      ...swiftRouter,
    }),
    ceph: auroraRouter({
      ec2Credentials: auroraRouter({
        ...ec2CredentialRouter,
      }),
      containers: auroraRouter({
        ...containerRouter,
      }),
      objects: auroraRouter({
        ...objectRouter,
      }),
      versioning: auroraRouter({
        ...versioningRouter,
      }),
      bucketPolicy: auroraRouter({
        ...bucketPolicyRouter,
      }),
    }),
  },
}
