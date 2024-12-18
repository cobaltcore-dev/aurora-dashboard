import { OpenstackIdentityAPI } from "../Identity/apis/openstack"
import { OpenstackComputeAPI } from "../Compute/apis/openstack"

export type OpenstackAPIs = {
  compute: OpenstackComputeAPI
  identity: OpenstackIdentityAPI
}

export type APIs = {
  openstack: OpenstackAPIs
}
