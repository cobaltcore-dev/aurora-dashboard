import React, { ReactNode } from "react"
import {
  Stack,
  Breadcrumb,
  BreadcrumbItem,
  ContentHeading,
  Button,
  ButtonRow,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

import ViewToggleButtons from "../ClusterDetail/ViewToggleButtons"
import { Cluster } from "@/server/Gardener/types/cluster"

export interface DetailLayoutProps {
  title: string
  description?: string
  breadcrumbLabel: string
  breadcrumbActiveLabel: string
  isJsonView: boolean
  children: ReactNode
  cluster: Cluster
  toggleView: () => void
  onBack: () => void
  handleShare: () => void
  setDeleteClusterModal: (isShown: boolean) => void
  setDeleteClusterName: (clusterName: string) => void
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
  cluster,
  setDeleteClusterModal,
  setDeleteClusterName,
}) => {
  const viewType = isJsonView ? Views.JSON : Views.GRID
  const { t } = useLingui()
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
          <ButtonRow>
            <Button
              label={t`Delete`}
              icon="deleteForever"
              variant="primary-danger"
              onClick={() => {
                setDeleteClusterName(cluster.name)
                setDeleteClusterModal(true)
              }}
            />
            <Button label={t`Share`} icon="contentCopy" variant="primary" onClick={handleShare} />
          </ButtonRow>
        </Stack>
      </Stack>

      <ViewToggleButtons currentView={viewType} toggleView={toggleView} />
      {children}
    </Stack>
  )
}

export default DetailLayout
