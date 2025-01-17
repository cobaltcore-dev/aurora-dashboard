/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Greenhouse contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react"
// @ts-expect-error missing types
import Logo from "../../assets/logo.svg?react"
// @ts-expect-error missing types
import { Stack } from "@cloudoperators/juno-ui-components"

const navStyles = `
  bg-juno-grey-blue-11
  py-4
`

const navItem = (active: boolean) => {
  return `
  px-2
  py-3
  w-full
  hover:text-theme-high

  ${
    active &&
    `
      bg-theme-global-bg  
      border-text-theme-light
      border-l-4
      text-white
      hover:text-white
    `
  }
`
}

const appNameStyles = `
  text-xs
  break-all
`

interface NavigationProps {
  apps: string[]
  active?: number
  handleActive: (index: number) => void
}

export default function Navigation({ apps, active = 0, handleActive }: NavigationProps) {
  return (
    <Stack direction="vertical" alignment="center" className={navStyles}>
      <Logo className="mb-6" title="Aurora" />

      {apps.map((name, i) => (
        <Stack
          key={i}
          direction="vertical"
          alignment="center"
          className={navItem(active === i)}
          role="button"
          tabIndex="0"
          onClick={() => handleActive(i)}
        >
          <span className={appNameStyles}>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
        </Stack>
      ))}
    </Stack>
  )
}
