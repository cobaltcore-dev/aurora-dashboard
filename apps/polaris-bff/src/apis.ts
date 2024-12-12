import { OsComputeAPI } from "./Compute/apis/openstack"
import { OsIdentityAPI } from "./Identity/apis/openstack"

export default {
  osComputeAPI: new OsComputeAPI(),
  osIdentityAPI: new OsIdentityAPI(),
}
