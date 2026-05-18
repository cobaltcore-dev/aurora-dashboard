import { swiftRouter } from "./swiftRouter"
import { ec2CredentialRouter } from "./ec2CredentialRouter"
import { containerRouter } from "./containerRouter"
import { objectRouter } from "./objectRouter"
import { serviceInfoRouter } from "./serviceInfoRouter"
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
      serviceInfo: auroraRouter({
        ...serviceInfoRouter,
      }),
    }),
  },
}
