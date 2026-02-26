import { FloatingIpQueryParameters } from "@/server/Network/types/floatingIp"
import { SortSettings } from "@/client/components/ListToolbar/types"

export type FloatingIpsSortKey = FloatingIpQueryParameters["sort_key"]
export type FloatingIpsSortDir = FloatingIpQueryParameters["sort_dir"]

export type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: FloatingIpsSortKey
  sortDirection: FloatingIpsSortDir
}
