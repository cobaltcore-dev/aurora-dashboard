import { CircleCheckIcon, CircleMinusIcon, CircleAlertIcon } from "lucide-react"
import { t } from "@lingui/core/macro"
import { FloatingIpStatus } from "@/server/Network/types/floatingIp"

type FloatingIpStatusDisplay = {
  text: string
  icon: React.ReactNode
}

export const STATUS_CONFIG: Record<FloatingIpStatus, FloatingIpStatusDisplay> = {
  ACTIVE: {
    text: "Active",
    icon: <CircleCheckIcon size={16} color="white" fill="#4FB81C" />,
  },
  DOWN: {
    text: "Down",
    icon: <CircleMinusIcon size={16} color="white" fill="#969696" />,
  },
  ERROR: {
    text: "Error",
    icon: <CircleAlertIcon size={16} color="white" fill="#C70000" />,
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
