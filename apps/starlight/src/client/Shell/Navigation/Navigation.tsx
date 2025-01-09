/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Greenhouse contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react"
// @ts-ignore
import Logo from "../../assets/logo.svg?react"
// @ts-ignore
import { Stack } from "@cloudoperators/juno-ui-components"
import type { Manifest } from "../../../shared/types/manifest"

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
  manifest: Manifest
  active?: string
  handleActive: (name: string) => void
}

export default function Navigation({ manifest, active = "home", handleActive }: NavigationProps) {
  return (
    <Stack direction="vertical" alignment="center" className={navStyles}>
      <Logo className="mb-6" title="Aurora" />

      <Stack
        direction="vertical"
        alignment="center"
        className={navItem(active === "home")}
        role="button"
        tabIndex="0"
        onClick={() => handleActive("home")}
      >
        <span className={appNameStyles}>Home</span>
      </Stack>

      {manifest.map((module) => (
        <Stack
          key={module.name}
          direction="vertical"
          alignment="center"
          className={navItem(module.name === active)}
          role="button"
          tabIndex="0"
          onClick={() => handleActive(module.name)}
        >
          <span className={appNameStyles}>{module.navigation.label}</span>
        </Stack>
      ))}
    </Stack>
  )
}
