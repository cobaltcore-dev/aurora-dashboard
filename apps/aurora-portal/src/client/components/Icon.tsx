/// <reference types="vite-plugin-svgr/client" />
import React from "react"
import Success from "@material-design-icons/svg/filled/check_box.svg?react"
import Dangerous from "@material-design-icons/svg/filled/dangerous.svg?react"
import Search from "@material-design-icons/svg/outlined/search.svg?react"
import Info from "@material-design-icons/svg/filled/info.svg?react"
import DNS from "@material-design-icons/svg/filled/dns.svg?react"
import AccountCircle from "@material-design-icons/svg/filled/account_circle.svg?react"
import AutoAwesomeMotion from "@material-design-icons/svg/filled/auto_awesome_motion.svg?react"
import CheckCircle from "@material-design-icons/svg/filled/check_circle.svg?react"

export const KnownIcons = [
  "autoAwesomeMotion",
  "accountCircle",
  "checkCircle",
  "danger",
  "dns",
  "info",
  "search",
  "success",
] as const

export type IconName = (typeof KnownIcons)[number]

const IconsMap: Record<IconName, React.FC<React.SVGProps<SVGSVGElement>>> = {
  autoAwesomeMotion: AutoAwesomeMotion,
  checkCircle: CheckCircle,
  danger: Dangerous,
  dns: DNS,
  info: Info,
  search: Search,
  success: Success,
  accountCircle: AccountCircle,
}

interface IconProps {
  name: IconName
  color?: string
  size?: string | number
  iconClassName?: string
  className?: string
}

export const Icon: React.FC<IconProps> = ({ name, color = "", size = "24", iconClassName = "", className = "" }) => {
  const IconComponent = IconsMap[name]
  if (!IconComponent) return null

  return (
    <IconComponent
      data-testid={`icon-${name}`}
      className={`jn-leading-none juno-button-icon jn-fill-current ${color} ${iconClassName} ${className}`.trim()}
      width={size}
      height={size}
    />
  )
}
