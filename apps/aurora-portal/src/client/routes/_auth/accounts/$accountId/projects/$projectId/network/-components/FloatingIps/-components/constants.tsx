import { MdError, MdRemoveCircle, MdCheckCircle } from "react-icons/md"
import { t } from "@lingui/core/macro"
import { FloatingIpStatus } from "@/server/Network/types/floatingIp"

type FloatingIpStatusDisplay = {
  text: string
  icon: React.ReactNode
}

export const STATUS_CONFIG: Record<FloatingIpStatus, FloatingIpStatusDisplay> = {
  ACTIVE: {
    text: "Active",
    icon: <MdCheckCircle size={18} color="white" fill="#4FB81C" />,
  },
  DOWN: {
    text: "Down",
    icon: <MdRemoveCircle size={18} color="white" fill="#969696" />,
  },
  ERROR: {
    text: "Error",
    icon: <MdError size={18} color="white" fill="#C70000" />,
  },
} as const

export const TABLE_COLUMNS = () =>
  [
    t`Status`,
    t`Floating IP Address`,
    t`Fixed IP Address`,
    t`Subnet`,
    t`Description`,
    "", // empty column for item-actions with context menu containing "Preview", "Edit Description", "Attach", "Detach" and "Release"
  ] as const
