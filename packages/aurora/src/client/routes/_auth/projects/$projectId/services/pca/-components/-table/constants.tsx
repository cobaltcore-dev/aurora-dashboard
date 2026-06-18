import { MdCheckCircle, MdReportProblem, MdHourglassEmpty, MdAutorenew, MdHelpOutline } from "react-icons/md"
import { t } from "@lingui/core/macro"
import { Badge } from "@cloudoperators/juno-ui-components/index"
import { CertificateAuthorityState } from "@/server/Services/types/pca"

type PcaDisplayState = {
  text: string
  icon: React.ReactNode
  badge: React.ReactNode
}

export const STATE_CONFIG: Record<CertificateAuthorityState, PcaDisplayState> = {
  CREATING: {
    text: "Creating",
    icon: <MdAutorenew size={20} color="white" fill="#1976D2" />,
    badge: <Badge icon="bolt" variant="info" text="Creating" />,
  },
  AWAITING_CERTIFICATE: {
    text: "Awaiting Certificate",
    icon: <MdHourglassEmpty size={20} color="white" fill="#FBC02D" />,
    badge: <Badge icon="accessTime" variant="warning" text="Awaiting Certificate" />,
  },
  READY: {
    text: "Ready",
    icon: <MdCheckCircle size={20} color="white" fill="#4FB81C" />,
    badge: <Badge icon="checkCircle" variant="success" text="Ready" />,
  },
  FAILED: {
    text: "Failed",
    icon: <MdReportProblem size={20} color="white" fill="#D32F2F" />,
    badge: <Badge icon="error" variant="error" text="Failed" />,
  },
  UNEXPECTED: {
    text: "Unexpected",
    icon: <MdHelpOutline size={20} color="white" fill="#757575" />,
    badge: <Badge icon="severityUnknown" variant="default" text="Unexpected" />,
  },
} as const

export const TABLE_COLUMNS = () =>
  [
    t`State`,
    t`ID`,
    t`Subject information`,
    "", // empty column for item-action with context menu containing "Delete CA" button
  ] as const
