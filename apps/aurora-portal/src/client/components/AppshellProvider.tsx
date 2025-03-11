/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Juno contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react"
/**
 * This provider acts as a wrapper for Juno apps. It renders a StyleProvider and PortalProvider
 */
export const AppShellProvider: React.FC<AppShellProviderProps> = ({ children }) => {
  return <div className="juno-app-body theme-dark">{children}</div>
}

interface WrapperProps {
  /** React nodes or a collection of React nodes to be rendered as content. */
  children?: React.ReactNode
}

export interface AppShellProviderProps extends WrapperProps {
  /** Where app stylesheets are imported. This is only relevant if shadowRoot === false. If you use a ShadowRoot the styles must be inline. */
  /** theme: theme-dark or theme-light */
  theme?: "theme-dark" | "theme-light"
}
