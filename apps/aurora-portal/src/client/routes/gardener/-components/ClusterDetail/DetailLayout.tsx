import React, { ReactNode } from "react"
import { Stack, Breadcrumb, BreadcrumbItem, ContentHeading, Button } from "@cloudoperators/juno-ui-components"

import ViewToggleButtons from "../ClusterDetail/ViewToggleButtons"

export interface DetailLayoutProps {
  title: string
  description?: string
  breadcrumbLabel: string
  breadcrumbActiveLabel: string
  isJsonView: boolean
  children: ReactNode
  toggleView: () => void
  onBack: () => void
  handleShare: () => void
}

export const Views = {
  GRID: "grid",
  JSON: "json",
} as const

const DetailLayout: React.FC<DetailLayoutProps> = ({
  title,
  description = "",
  breadcrumbLabel,
  breadcrumbActiveLabel,
  onBack,
  handleShare,
  isJsonView,
  toggleView,
  children,
}) => {
  const viewType = isJsonView ? Views.JSON : Views.GRID

  return (
    <Stack direction="vertical">
      <Breadcrumb>
        <BreadcrumbItem onClick={onBack} label={breadcrumbLabel} />
        <BreadcrumbItem active label={breadcrumbActiveLabel} />
      </Breadcrumb>

      <Stack distribution="between">
        <Stack direction="vertical" distribution="between" className="my-6">
          <ContentHeading className="text-2xl font-bold text-theme-highest">{title}</ContentHeading>
          {description && <p className="text-theme-default text-sm mt-1">{description}</p>}
        </Stack>
        <Stack direction="vertical" distribution="center">
          <Button label="Share" icon="contentCopy" variant="primary" onClick={handleShare} />
        </Stack>
      </Stack>

      <ViewToggleButtons currentView={viewType} toggleView={toggleView} />
      {children}
    </Stack>
  )
}

export default DetailLayout
