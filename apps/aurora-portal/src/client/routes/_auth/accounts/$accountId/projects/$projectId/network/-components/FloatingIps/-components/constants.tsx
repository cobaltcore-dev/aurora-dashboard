import { CircleCheckIcon, InfoIcon, CircleXIcon } from "lucide-react"
import { t } from "@lingui/core/macro"
import { FloatingIpStatus } from "@/server/Network/types/floatingIp"

type FloatingIpStatusDisplay = {
  text: string
  icon: React.ReactNode
}

// TODO: Replace icons when designers decide on new-icons
export const STATUS_CONFIG: Record<FloatingIpStatus, FloatingIpStatusDisplay> = {
  ACTIVE: {
    text: "Active",
    icon: <CircleCheckIcon size={16} color="green" />,
  },
  DOWN: {
    text: "Down",
    icon: <InfoIcon size={16} color="red" />,
  },
  ERROR: {
    text: "Error",
    icon: <CircleXIcon size={16} color="yellow" />,
  },
}

export const TABLE_COLUMNS = () => [
  "", // empty column for item-icons showing statuses
  t`Status`,
  t`Floating IP Address`,
  t`Fixed IP Address`,
  t`Subnet`,
  t`Description`,
  "", // empty column for item-actions with context menu containing "Edit Description", "Attach", "Detach" and "Release"
]
