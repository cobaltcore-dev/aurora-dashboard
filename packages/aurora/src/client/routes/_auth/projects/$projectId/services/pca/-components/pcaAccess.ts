import type { getServiceIndex } from "@/server/Authentication/helpers"

type ServiceIndex = ReturnType<typeof getServiceIndex>

export const canAccessClavisPca = (serviceIndex: ServiceIndex, enabledServices?: string[]) => {
  const isPcaEnabled = !enabledServices || enabledServices.includes("pca")
  return serviceIndex["pca"]?.["clavis"] && isPcaEnabled
}
