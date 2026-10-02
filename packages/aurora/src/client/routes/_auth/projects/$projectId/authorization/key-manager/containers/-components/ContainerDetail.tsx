import { Button, Status } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { copyToClipboard, uuidFromRef } from "../../-components/utils"
import type { Container } from "@/server/KeyManager/types/keyManager"

interface ContainerDetailProps {
  projectId: string
  containerId: string
  onBack: () => void
}

export function ContainerDetail({ projectId, containerId, onBack }: ContainerDetailProps) {
  const {
    data: container,
    isLoading,
    isError,
    error,
  } = trpcReact.keyManager.getContainer.useQuery({
    project_id: projectId,
    containerId,
  })

  if (isLoading) return <Status status="progress" title="Loading Container..." />
  if (isError) return <Status status="error" title={error?.message ?? "Failed to Load Container"} />
  if (!container) return <Status status="empty" title="Container Not Found" />

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{container.name ?? "Unnamed Container"}</h2>
        <Button variant="subdued" onClick={onBack}>
          ← Back to Containers
        </Button>
      </div>

      <dl className="juno-dl">
        <dt>ID</dt>
        <dd className="flex items-center gap-2">
          {containerId}
          <Button size="small" variant="subdued" onClick={() => copyToClipboard(containerId)} label="Copy" />
        </dd>

        <dt>Reference</dt>
        <dd className="flex items-center gap-2">
          {container.container_ref}
          <Button
            size="small"
            variant="subdued"
            onClick={() => copyToClipboard(container.container_ref)}
            label="Copy"
          />
        </dd>

        <dt>Name</dt>
        <dd>{container.name ?? <em>—</em>}</dd>

        <dt>Type</dt>
        <dd>{container.type}</dd>

        <dt>Status</dt>
        <dd>{container.status}</dd>

        <dt>Created</dt>
        <dd>{new Date(container.created).toLocaleString()}</dd>

        <dt>Updated</dt>
        <dd>{new Date(container.updated).toLocaleString()}</dd>
      </dl>

      {container.secret_refs.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">Secrets ({container.secret_refs.length})</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left opacity-60">
                <th className="pr-4 pb-1">Name</th>
                <th className="pb-1">Secret ID</th>
              </tr>
            </thead>
            <tbody>
              {container.secret_refs.map((ref: Container["secret_refs"][number]) => {
                const id = uuidFromRef(ref.secret_ref)
                return (
                  <tr key={ref.secret_ref} className="border-theme-background-lvl-2 border-t">
                    <td className="py-1 pr-4">{ref.name}</td>
                    <td className="flex items-center gap-2 py-1">
                      {id}
                      <Button size="small" variant="subdued" onClick={() => copyToClipboard(id)} label="Copy" />
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
