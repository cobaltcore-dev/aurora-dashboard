import { OpenstackComputeAPI } from "./Compute/apis/openstack"
import { OpenstackIdentityAPI } from "./Identity/apis/openstack"

export const apis = {
  osComputeAPI: new OpenstackComputeAPI(),
  osIdentityAPI: new OpenstackIdentityAPI(),
}
