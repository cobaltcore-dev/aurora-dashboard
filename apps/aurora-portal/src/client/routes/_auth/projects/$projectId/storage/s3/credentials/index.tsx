import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Trans } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import {
  Button,
  ContentHeading,
  Stack,
  Toast,
  ToastProps,
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
} from "@cloudoperators/juno-ui-components"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/s3/credentials/")({
  staticData: { section: "storage", service: "s3-credentials" } satisfies RouteInfo,
  component: S3CredentialsPage,
})

function S3CredentialsPage() {
  const projectId = useProjectId()
  const [toast, setToast] = useState<ToastProps | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const utils = trpcReact.useUtils()

  const { data: credentials = [], isLoading } = trpcReact.storage.s3.ec2Credentials.list.useQuery(
    { project_id: projectId ?? "" },
    { enabled: !!projectId }
  )

  const createMutation = trpcReact.storage.s3.ec2Credentials.create.useMutation({
    onSuccess: (data) => {
      setNewSecret(data.secret)
      utils.storage.s3.ec2Credentials.list.invalidate()
      setToast({
        variant: "success",
        children: <Trans>EC2 credential created. Save the secret key — it won't be shown again.</Trans>,
        autoDismiss: false,
        onDismiss: () => setToast(null),
      })
    },
    onError: (err) => {
      setToast({
        variant: "error",
        children: <Trans>Failed to create credential: {err.message}</Trans>,
        autoDismiss: true,
        autoDismissTimeout: 5000,
        onDismiss: () => setToast(null),
      })
    },
  })

  const deleteMutation = trpcReact.storage.s3.ec2Credentials.delete.useMutation({
    onSuccess: () => {
      setNewSecret(null)
      utils.storage.s3.ec2Credentials.list.invalidate()
      setToast({
        variant: "success",
        children: <Trans>Credential deleted.</Trans>,
        autoDismiss: true,
        autoDismissTimeout: 3000,
        onDismiss: () => setToast(null),
      })
    },
    onError: (err) => {
      setToast({
        variant: "error",
        children: <Trans>Failed to delete credential: {err.message}</Trans>,
        autoDismiss: true,
        autoDismissTimeout: 5000,
        onDismiss: () => setToast(null),
      })
    },
  })

  if (!projectId) {
    return <Trans>No project selected</Trans>
  }

  return (
    <Stack direction="vertical" gap="4">
      <ContentHeading>
        <Trans>S3 Object Storage — EC2 Credentials</Trans>
      </ContentHeading>

      {toast && <Toast {...toast} />}

      {newSecret && (
        <div className="p-4 bg-juno-grey-blue-10 rounded border border-juno-grey-blue-3">
          <p className="font-bold mb-2">
            <Trans>Secret Key (shown once — copy it now):</Trans>
          </p>
          <code className="break-all text-sm">{newSecret}</code>
          <div className="mt-2">
            <Button
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(newSecret)
                setToast({
                  variant: "success",
                  children: <Trans>Secret key copied to clipboard.</Trans>,
                  autoDismiss: true,
                  autoDismissTimeout: 2000,
                  onDismiss: () => setToast(null),
                })
              }}
            >
              <Trans>Copy</Trans>
            </Button>
            <Button size="small" variant="subdued" className="ml-2" onClick={() => setNewSecret(null)}>
              <Trans>Dismiss</Trans>
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm text-juno-grey-light-1">
          {isLoading ? (
            <Trans>Loading...</Trans>
          ) : (
            <Trans>{credentials.length} credential(s) for this project</Trans>
          )}
        </span>
        <Button
          onClick={() => createMutation.mutate({ project_id: projectId })}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? <Trans>Creating...</Trans> : <Trans>Create Credential</Trans>}
        </Button>
      </div>

      {credentials.length > 0 && (
        <DataGrid columns={4}>
          <DataGridRow>
            <DataGridHeadCell>Access Key</DataGridHeadCell>
            <DataGridHeadCell>User ID</DataGridHeadCell>
            <DataGridHeadCell>Project ID</DataGridHeadCell>
            <DataGridHeadCell>Actions</DataGridHeadCell>
          </DataGridRow>
          {credentials.map((cred) => (
            <DataGridRow key={cred.id}>
              <DataGridCell>
                <code className="text-sm">{cred.access}</code>
              </DataGridCell>
              <DataGridCell>
                <span className="text-sm text-juno-grey-light-1">{cred.user_id}</span>
              </DataGridCell>
              <DataGridCell>
                <span className="text-sm text-juno-grey-light-1">{cred.project_id}</span>
              </DataGridCell>
              <DataGridCell>
                <Button
                  size="small"
                  variant="primary-danger"
                  onClick={() =>
                    deleteMutation.mutate({ project_id: projectId, credentialId: cred.id })
                  }
                  disabled={deleteMutation.isPending}
                >
                  <Trans>Delete</Trans>
                </Button>
              </DataGridCell>
            </DataGridRow>
          ))}
        </DataGrid>
      )}

      {!isLoading && credentials.length === 0 && (
        <p className="text-juno-grey-light-1 text-sm">
          <Trans>No EC2 credentials yet. Click "Create Credential" to generate one.</Trans>
        </p>
      )}
    </Stack>
  )
}
