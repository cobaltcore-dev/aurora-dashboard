//TODO: implement edit security group modal
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { FC } from "react"

interface EditSecurityGroupModalProps {
  securityGroup: SecurityGroup
  open: boolean
  onClose: () => void
}

export const EditSecurityGroupModal: FC<EditSecurityGroupModalProps> = () => {
  // const { t } = useLingui()

  return <div></div>
}
