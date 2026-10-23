import { Button, Status } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import ClipboardText from "@/client/components/ClipboardText"
import { uuidFromRef } from "../../-components/utils"
import type { Container } from "@/server/KeyManager/types/keyManager"

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

  return (
    <div className="max-w-3xl">
      <ContentHeader
        title={container.name ?? t`Unnamed Container`}
        projectId={projectId}
        actions={
          <Button variant="subdued" onClick={onBack}>
            {t`← Back to Containers`}
          </Button>
        }
      />

      <dl className="juno-dl">
        <dt>{t`ID`}</dt>
        <dd>
          <ClipboardText text={containerId} />
        </dd>

        <dt>{t`Reference`}</dt>
        <dd>
          <ClipboardText text={container.container_ref} />
        </dd>

        <dt>{t`Name`}</dt>
        <dd>{container.name ?? <em>—</em>}</dd>

        <dt>{t`Type`}</dt>
        <dd>{container.type}</dd>

        <dt>{t`Status`}</dt>
        <dd>{container.status}</dd>

        <dt>{t`Created`}</dt>
        <dd>{new Date(container.created).toLocaleString()}</dd>

        <dt>{t`Updated`}</dt>
        <dd>{new Date(container.updated).toLocaleString()}</dd>
      </dl>

      {container.secret_refs.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">
            {t`Secrets`} ({container.secret_refs.length})
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left opacity-60">
                <th className="pr-4 pb-1">{t`Name`}</th>
                <th className="pb-1">{t`Secret ID`}</th>
              </tr>
            </thead>
            <tbody>
              {container.secret_refs.map((ref: Container["secret_refs"][number]) => {
                const id = uuidFromRef(ref.secret_ref)
                return (
                  <tr key={ref.secret_ref} className="border-theme-background-lvl-2 border-t">
                    <td className="py-1 pr-4">{ref.name}</td>
                    <td className="py-1">
                      <ClipboardText text={id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
