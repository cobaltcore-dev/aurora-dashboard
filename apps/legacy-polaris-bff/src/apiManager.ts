import { OpenstackComputeAPI } from "./Compute/apis/openstack"
import { OpenstackIdentityAPI } from "./Identity/apis/openstack"
import { KeyValueCache } from "@apollo/utils.keyvaluecache"
import { APIs } from "./types/apis"

// this is a factory function that returns an object with the API adapters
// accessible by the key of the cloud provider
// used in resolvers to access the APIs, e.g. context.dataSources.openstack.identity
export const getAPIAdapters = (options: { cache: KeyValueCache }): APIs => ({
  openstack: {
    compute: new OpenstackComputeAPI({ cache: options.cache }),
    identity: new OpenstackIdentityAPI({ cache: options.cache }),
  },
})
