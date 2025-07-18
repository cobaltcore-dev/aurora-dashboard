import React, { useState } from "react"
import { Box, CodeBlock, JsonViewer, Stack, Toast, ToastProps } from "@cloudoperators/juno-ui-components"
import { useLingui, Trans } from "@lingui/react/macro"

import { Cluster } from "@/server/Gardener/types/cluster"
import { useNavigate } from "@tanstack/react-router"

import DetailLayout from "./ClusterDetail/DetailLayout"
import WorkerSection from "./ClusterDetail/WorkerSection"
import ClusterOverviewSection from "./ClusterDetail/ClusterOverviewSection"
import SettingsSection from "./ClusterDetail/SettingsSection"

interface PeakDetailPageProps {
  cluster: Cluster
}

const ClusterDetailPage: React.FC<PeakDetailPageProps> = ({ cluster }) => {
  const [isJsonView, setIsJsonView] = useState<boolean>(false)
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const { t } = useLingui()

  const navigate = useNavigate()

  const handleBack = () => {
    navigate({
      to: "/gardener/clusters",
    })
  }

  // Function to handle sharing cluster info
  const handleShare = async () => {
    try {
      // Create a shareable URL or text about the cluster
      const clusterInfo = `Cluster: ${cluster.name}\nID: ${cluster.uid}\nProvider: ${cluster.infrastructure}\nRegion: ${cluster.region}\nStatus: ${cluster.status}\nVersion: ${cluster.version}`

      // Copy to clipboard
      await navigator.clipboard.writeText(clusterInfo)

      setToastData({
        variant: "success",
        children: (
          <Stack direction="vertical" gap="1.5">
            <span className="text-theme-heigh font-semibold">
              <Trans>Cluster details copied to clipboard!</Trans>
            </span>
            <span className="text-theme-light">
              <Trans>You can now share this information with your team</Trans>
            </span>
          </Stack>
        ),
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setToastData({
        variant: "error",
        children: (
          <Stack direction="vertical" gap="1.5">
            <span className="text-theme-heigh font-semibold">
              <Trans>Failed to copy to clipboard</Trans>
            </span>
            <span className="text-theme-light">
              <Trans>Please try again or copy manually</Trans>
            </span>
          </Stack>
        ),
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: handleToastDismiss,
      })
    }
  }

  const handleToastDismiss = () => setToastData(null)

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <DetailLayout
          title={t`Cluster Details`}
          description={t`View and manage your Kubernetes cluster`}
          breadcrumbLabel={t`Clusters`}
          breadcrumbActiveLabel={`${cluster.uid}`}
          onBack={handleBack}
          handleShare={handleShare}
          isJsonView={isJsonView}
          toggleView={() => setIsJsonView(!isJsonView)}
        >
          {isJsonView ? (
            <Box className="border border-gray-300 rounded-lg shadow-lg p-6">
              <CodeBlock size="large">
                <JsonViewer
                  data={cluster}
                  expanded={true}
                  toolbar={true}
                  title={`${t`Raw JSON Data for`} ${cluster.name}`}
                />
              </CodeBlock>
            </Box>
          ) : (
            <Stack direction="vertical" gap="10">
              <ClusterOverviewSection cluster={cluster} handleShare={handleShare} />

              <WorkerSection workers={cluster.workers} />

              <SettingsSection autoUpdate={cluster.autoUpdate} maintenance={cluster.maintenance} />
            </Stack>
          )}
          {toastData && (
            <Toast {...toastData} className="fixed top-5 right-5 z-50 border border-theme-light rounded-lg shadow-lg" />
          )}
        </DetailLayout>
      </div>
    </div>
  )
}

export default ClusterDetailPage
