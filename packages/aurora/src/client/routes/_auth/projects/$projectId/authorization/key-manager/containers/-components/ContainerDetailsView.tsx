import {
  Button,
  Status,
  Stack,
  ContentHeading,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { TwoColumnDescriptionList, type DetailListItem } from "@/client/components/TwoColumnDescriptionList"
import ClipboardText from "@/client/components/ClipboardText"
import { uuidFromRef } from "../../-components/utils"

interface ContainerDetailsViewProps {
  projectId: string
  containerId: string
  onBack: () => void
}

export function ContainerDetailsView({ projectId, containerId, onBack }: ContainerDetailsViewProps) {
  const { t } = useLingui()
  const {
    data: container,
    isLoading,
    isError,
    error,
  } = trpcReact.keyManager.getContainer.useQuery({
    project_id: projectId,
    containerId,
  })

  if (isLoading) return <Status status="progress" title={t`Loading Container...`} />
  if (isError) return <Status status="error" title={error?.message ?? t`Failed to Load Container`} />
  if (!container) return <Status status="empty" title={t`Container Not Found`} />

  const detailItems: DetailListItem[] = [
    { label: t`ID`, value: <ClipboardText text={containerId} /> },
    { label: t`Reference`, value: <ClipboardText text={container.container_ref} /> },
    { label: t`Name`, value: container.name ?? "- -" },
    { label: t`Type`, value: container.type },
    { label: t`Status`, value: container.status },
    { label: t`Created`, value: new Date(container.created).toLocaleString() },
    { label: t`Updated`, value: new Date(container.updated).toLocaleString() },
  ]

  return (
    <>
      <ContentHeader
        title={container.name ?? containerId}
        projectId={projectId}
        actions={
          <Button variant="subdued" onClick={onBack}>
            {t`Back to Containers`}
          </Button>
        }
      />

      <Stack direction="vertical" gap="6" className="my-6">
        <Stack direction="vertical" gap="2">
          <ContentHeading>{t`Container Details`}</ContentHeading>
          <TwoColumnDescriptionList items={detailItems} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <ContentHeading>{t`Secrets`}</ContentHeading>
          <DataGrid columns={2}>
            <DataGridRow>
              <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Secret ID`}</DataGridHeadCell>
            </DataGridRow>
            {container.secret_refs.length > 0 ? (
              container.secret_refs.map((ref) => (
                <DataGridRow key={ref.secret_ref}>
                  <DataGridCell>{ref.name || "- -"}</DataGridCell>
                  <DataGridCell>
                    <ClipboardText text={uuidFromRef(ref.secret_ref)} />
                  </DataGridCell>
                </DataGridRow>
              ))
            ) : (
              <DataGridRow>
                <DataGridCell colSpan={2}>
                  <Status status="empty" title={t`No Secrets in This Container`} />
                </DataGridCell>
              </DataGridRow>
            )}
          </DataGrid>
        </Stack>
      </Stack>
    </>
  )
}
