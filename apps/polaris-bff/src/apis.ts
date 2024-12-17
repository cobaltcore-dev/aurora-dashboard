import { OpenstackComputeAPI } from "./Compute/apis/openstack"
import { OpenstackIdentityAPI } from "./Identity/apis/openstack"

export const apis = {
  openstackComputeAPI: new OpenstackComputeAPI(),
  openstackIdentityAPI: new OpenstackIdentityAPI(),
}
