// TODO: Implement the Access Control Modal for managing security group rules
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { FC } from "react"

interface AccessControlModalProps {
  securityGroup: SecurityGroup
  open: boolean
  onClose: () => void
}

export const AccessControlModal: FC<AccessControlModalProps> = () => {
  // const { t } = useLingui()

  return <div></div>
}
