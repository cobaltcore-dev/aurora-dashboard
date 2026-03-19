import type { FloatingIpStatus } from "@/server/Network/types/floatingIp"

/**
 * Formats a floating IP status value from uppercase enum to title case.
 * Example: "ACTIVE" → "Active", "DOWN" → "Down", "ERROR" → "Error"
 */
export const formatFloatingIpStatus = (status: FloatingIpStatus) => {
  return status.charAt(0) + status.slice(1).toLowerCase()
}
