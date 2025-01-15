/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Greenhouse contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react"
// @ts-expect-error missing types
import Logo from "../../assets/logo.svg?react"
// @ts-expect-error missing types
import { Stack } from "@cloudoperators/juno-ui-components"
import { ExtensionProps } from "../../../shared/types/extension"

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
  extensions: ExtensionProps[]
  active?: string
  handleActive: (name: string) => void
}

export default function Navigation({ extensions, active = "home", handleActive }: NavigationProps) {
  return (
    <Stack direction="vertical" alignment="center" className={navStyles}>
      <Logo className="mb-6" title="Aurora" />

      {["home", "compute", "identity"].map((name) => (
        <Stack
          direction="vertical"
          alignment="center"
          className={navItem(active === name)}
          role="button"
          tabIndex="0"
          onClick={() => handleActive(name)}
        >
          <span className={appNameStyles}>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
        </Stack>
      ))}
      {console.log("=::::", extensions)}

      {extensions.map((ext, i) => (
        <Stack
          key={i}
          direction="vertical"
          alignment="center"
          className={navItem(ext.name === active)}
          role="button"
          tabIndex="0"
          onClick={() => handleActive(ext.name)}
        >
          <span className={appNameStyles}>{ext.label}</span>
        </Stack>
      ))}
    </Stack>
  )
}
