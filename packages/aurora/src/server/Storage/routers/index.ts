import { swiftRouter } from "./swift"
import {
  ec2CredentialRouter,
  containerRouter,
  objectRouter,
  versioningRouter,
  bucketPolicyRouter,
  corsRouter,
} from "./ceph"
import { buildStoragePermissionRouter } from "./permissionRouter"
import { auroraRouter } from "../../trpc"

export const buildObjectStorageRouters = (policyDir: string) => ({
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
      cors: auroraRouter({
        ...corsRouter,
      }),
    }),
    ...buildStoragePermissionRouter(policyDir),
  },
})
