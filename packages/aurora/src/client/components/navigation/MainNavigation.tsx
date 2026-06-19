import Logo from "../../assets/logo.svg?react"
import { NavigationItem } from "./types"
import { Link } from "@tanstack/react-router"
import { UserMenu } from "./UserMenu"
import { PageHeader, ThemeToggle } from "@cloudoperators/juno-ui-components/index"
import { cn } from "@/client/utils/cn"
import type { Slots } from "../../AuroraApp"
import { Slot } from "../Slot"

interface NavigationProps {
  items: NavigationItem[]
  handleThemeToggle?: (theme: string) => void
  appName?: string
  slots?: Slots
}

const textColorClass = "text-theme-pageheader-appname-default"
const textHoverClass = "hover:text-theme-pageheader-appname-hover"

export function MainNavigation({ items, handleThemeToggle, appName, slots }: NavigationProps) {
  const displayName = appName ?? "Aurora"

  return (
    <PageHeader
      logo={
        slots?.logo ? (
          <Slot component={slots.logo} useShadowDOM={false} />
        ) : (
          <Logo className={cn("h-6 w-6 shrink-0 fill-current", textColorClass)} title={displayName} />
        )
      }
      applicationName={
        <Link to="/projects" className={cn("shrink-0", textColorClass, textHoverClass)}>
          {displayName}
        </Link>
      }
    >
      {items.map(({ route, label }, index) => (
        <Link className={cn("shrink-0", textColorClass, textHoverClass)} key={index} to={route}>
          {label}
        </Link>
      ))}
      <ThemeToggle onToggleTheme={(newTheme: string) => handleThemeToggle?.(newTheme)} />
      <UserMenu />
    </PageHeader>
  )
}
