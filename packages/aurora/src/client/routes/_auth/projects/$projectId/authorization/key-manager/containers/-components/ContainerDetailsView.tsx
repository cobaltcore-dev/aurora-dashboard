import {
  Status,
  Stack,
  ContentHeading,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Button,
  PopupMenu,
  PopupMenuToggle,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { TwoColumnDescriptionList, type DetailListItem } from "@/client/components/TwoColumnDescriptionList"
import ClipboardText from "@/client/components/ClipboardText"
import {
  uuidFromRef,
  toMixedCase,
} from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/keyManagerUtils"
import { useKeyManagerPermissions } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/useKeyManagerPermissions"

interface ContainerDetailsViewProps {
  projectId: string
  containerId: string
}

export function ContainerDetailsView({ projectId, containerId }: ContainerDetailsViewProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { permissions, isLoading: permissionsLoading } = useKeyManagerPermissions(projectId, [
    "key-manager:containers:get",
  ])
  const canGet = permissions["key-manager:containers:get"]
  const {
    data: container,
    isLoading,
    isError,
    error,
  } = trpcReact.keyManager.getContainer.useQuery(
    {
      project_id: projectId,
      containerId,
    },
    { enabled: canGet }
  )

  if (permissionsLoading) return null
  if (!canGet) return <Status status="error" title={t`You do not have permission to view this container.`} />
  if (isLoading) return <Status status="progress" title={t`Loading Container...`} />
  if (isError) return <Status status="error" title={error?.message ?? t`Failed to Load Container`} />
  if (!container) return <Status status="empty" title={t`Container Not Found`} />

  const detailItems: DetailListItem[] = [
    { label: t`ID`, value: <ClipboardText text={containerId} /> },
    { label: t`Reference`, value: <ClipboardText text={container.container_ref} /> },
    { label: t`Name`, value: container.name ?? "- -" },
    { label: t`Type`, value: container.type },
    { label: t`Status`, value: toMixedCase(container.status) },
    { label: t`Created`, value: new Date(container.created).toLocaleString() },
    { label: t`Updated`, value: new Date(container.updated).toLocaleString() },
  ]

  const showSecretDetails = (secretId: string) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/secrets/$secretId",
      params: { projectId, secretId },
    })
  }

  return (
    <>
      <ContentHeader title={container.name ?? containerId} projectId={projectId} />

      <Stack direction="vertical" gap="6" className="mt-6">
        <Stack direction="vertical" gap="2">
          <ContentHeading>{t`Container Details`}</ContentHeading>
          <TwoColumnDescriptionList items={detailItems} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <ContentHeading>{t`Secrets`}</ContentHeading>
          <DataGrid columns={2} minContentColumns={[1]}>
            <DataGridRow>
              <DataGridHeadCell>{t`Name / ID`}</DataGridHeadCell>
              <DataGridHeadCell>{""}</DataGridHeadCell>
            </DataGridRow>
            {container.secret_refs.length > 0 ? (
              container.secret_refs.map((ref) => {
                const secretId = uuidFromRef(ref.secret_ref)
                return (
                  <DataGridRow key={ref.secret_ref}>
                    <DataGridCell>
                      <div>{ref.name || <em>{t`unnamed`}</em>}</div>
                      <div className="text-xs opacity-60">
                        <ClipboardText text={secretId} />
                      </div>
                    </DataGridCell>
                    <DataGridCell onClick={(e: React.MouseEvent) => e.stopPropagation()} className="items-end pr-0">
                      <PopupMenu>
                        <PopupMenuToggle as="div">
                          <Button
                            icon="moreVert"
                            title={t`Secret actions`}
                            aria-label={t`Secret actions`}
                            className="!bg-transparent"
                          />
                        </PopupMenuToggle>
                        <PopupMenuOptions>
                          <PopupMenuItem label={t`Show Details`} onClick={() => showSecretDetails(secretId)} />
                        </PopupMenuOptions>
                      </PopupMenu>
                    </DataGridCell>
                  </DataGridRow>
                )
              })
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
