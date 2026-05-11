import { useState } from "react"
import { Trans } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { Button, Stack, Toast, ToastProps } from "@cloudoperators/juno-ui-components"

interface S3CredentialPromptProps {
  onSuccess: () => void
}

export function S3CredentialPrompt({ onSuccess }: S3CredentialPromptProps) {
  const projectId = useProjectId()
  const [toast, setToast] = useState<ToastProps | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const utils = trpcReact.useUtils()

  const createMutation = trpcReact.storage.s3.ec2Credentials.create.useMutation({
    onSuccess: (data) => {
      setNewSecret(data.secret)
      utils.storage.s3.ec2Credentials.list.invalidate()
    },
    onError: (err) => {
      const errorMessage = err.message
      setToast({
        variant: "error",
        children: <Trans>Failed to create credential: {errorMessage}</Trans>,
        autoDismiss: true,
        autoDismissTimeout: 5000,
        onDismiss: () => setToast(null),
      })
    },
  })

  if (newSecret) {
    return (
      <Stack direction="vertical" gap="4" className="mx-auto mt-16 max-w-lg">
        {toast && <Toast {...toast} />}
        <h2 className="text-lg font-semibold">
          <Trans>S3 Credential Created</Trans>
        </h2>
        <div className="bg-juno-grey-blue-10 border-juno-grey-blue-3 rounded border p-4">
          <p className="mb-2 font-bold">
            <Trans>Secret Key (shown once — copy it now):</Trans>
          </p>
          <code className="text-sm break-all">{newSecret}</code>
          <div className="mt-3 flex gap-2">
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
            <Button size="small" variant="primary" onClick={onSuccess}>
              <Trans>Continue</Trans>
            </Button>
          </div>
        </div>
        <p className="text-juno-grey-light-1 text-sm">
          <Trans>Store this secret key securely. It will not be shown again.</Trans>
        </p>
      </Stack>
    )
  }

  return (
    <Stack direction="vertical" gap="4" className="mx-auto mt-16 max-w-lg">
      {toast && <Toast {...toast} />}
      <h2 className="text-lg font-semibold">
        <Trans>S3 Object Storage — Setup Required</Trans>
      </h2>
      <p className="text-juno-grey-light-1">
        <Trans>
          S3 Object Storage requires EC2 credentials (access key + secret key) to authenticate your requests. You need
          to create credentials before accessing S3 resources.
        </Trans>
      </p>
      <div>
        <Button
          onClick={() => projectId && createMutation.mutate({ project_id: projectId })}
          disabled={createMutation.isPending || !projectId}
        >
          {createMutation.isPending ? <Trans>Creating...</Trans> : <Trans>Create Credential</Trans>}
        </Button>
      </div>
    </Stack>
  )
}
