import { MdError, MdRemoveCircle, MdCheckCircle } from "react-icons/md"
import { t } from "@lingui/core/macro"
import { CertificateAuthorityState } from "@/server/Services/types/pca"

type PcaDisplayState = {
  text: string
  icon: React.ReactNode
}

export const STATE_CONFIG: Record<CertificateAuthorityState, PcaDisplayState> = {
  CREATING: {
    text: "Active",
    icon: <MdCheckCircle size={18} color="white" fill="#4FB81C" />,
  },
  AWAITING_CERTIFICATE: {
    text: "Down",
    icon: <MdRemoveCircle size={18} color="white" fill="#969696" />,
  },
  READY: {
    text: "Error",
    icon: <MdError size={18} color="white" fill="#C70000" />,
  },
  FAILED: {
    text: "Error",
    icon: <MdError size={18} color="white" fill="#C70000" />,
  },
  UNEXPECTED: {
    text: "Error",
    icon: <MdError size={18} color="white" fill="#C70000" />,
  },
} as const

export const TABLE_COLUMNS = () =>
  [
    t`State`,
    t`ID`,
    t`Subject information`,
    "", // empty column for item-action with context menu containing "Delete CA" button
  ] as const
