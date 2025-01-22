import { Link, useLocation } from "wouter"
import Logo from "../../assets/logo.svg?react"
// @ts-expect-error missing types
import { Stack } from "@cloudoperators/juno-ui-components"
import React from "react"
import UserNav from "../../Identity/Auth/Nav"

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

export default function Navigation({ items }: NavigationProps) {
  const [location] = useLocation()

  return (
    <Stack direction="vertical" alignment="center" className="bg-theme-background-lvl-0 ">
      <Logo className="mb-6" title="Aurora" />

      {items.map(({ route, label, Logo: ItemLogo }, i) => (
        <Link href={route} key={i} asChild>
          <Stack
            aria-label={name}
            direction="vertical"
            alignment="center"
            role="button"
            tabIndex="0"
            className={navItem(location === route)}
          >
            {ItemLogo && <ItemLogo />}
            <span className="text-xs break-all">{label}</span>
          </Stack>
        </Link>
      ))}

      <Stack aria-label={name} direction="vertical" alignment="center" role="button">
        <UserNav />
      </Stack>
    </Stack>
  )
}
