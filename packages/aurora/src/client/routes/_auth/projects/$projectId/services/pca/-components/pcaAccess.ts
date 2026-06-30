import { getServiceIndex } from "@/server/Authentication/helpers"

type ServiceIndex = ReturnType<typeof getServiceIndex>

export const hasClavisPcaService = (serviceIndex: ServiceIndex) => {
  // Temporary mapping while Clavis is exposed under beta/dev service names.
  return Boolean(serviceIndex["pca"]?.["clavis-beta"] || serviceIndex["pca"]?.["clavis-dev"])
}

export const canAccessClavisPca = (serviceIndex: ServiceIndex, enabledServices?: string[]) => {
  const isPcaEnabled = !enabledServices || enabledServices.includes("pca")
  return hasClavisPcaService(serviceIndex) && isPcaEnabled
}
