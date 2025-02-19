import { Link, useLocation } from "wouter"
import Logo from "../../assets/logo.svg?react"
import { Stack } from "@cloudoperators/juno-ui-components"
import React from "react"
import { UserMenu } from "./UserMenu"

const navItem = (active: boolean) => {
  return `
  px-2
  py-3
  w-full
  hover:text-theme-high
  border-l-4

  
  ${
    active
      ? `
      border-theme-accent
      bg-theme-global-bg  
      text-theme-high
      hover:text-theme-highest
    `
      : `
      border-theme-background-lvl-0
    `
  }
`
}

interface NavigationProps {
  items: {
    route: string
    label: string
    Logo?: React.FC
  }[]
}

export function MainNavigation({ items }: NavigationProps) {
  const [location] = useLocation()

  return (
    <Stack direction="vertical" alignment="center" className="bg-theme-background-lvl-0 ">
      <div className="text-sap-gold mt-2 mb-2 flex">
        <Logo className="fill-current mr-1" title="Aurora" width={25} />
        Aurora
      </div>

      {items.map(({ route, label, Logo: ItemLogo }, i) => (
        <Link href={route} key={i} asChild>
          <Stack
            direction="vertical"
            alignment="center"
            role="button"
            tabIndex={0}
            className={navItem(location === route)}
          >
            {ItemLogo && <ItemLogo />}
            <span className="text-xs break-all">{label}</span>
          </Stack>
        </Link>
      ))}

      <Stack direction="vertical" alignment="center" role="button">
        <UserMenu />
      </Stack>
    </Stack>
  )
}
