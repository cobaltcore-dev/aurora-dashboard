import { useEffect, useState } from "react"
import { useRouteContext } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact, trpcClient } from "@/client/trpcClient"
import { Button, ButtonRow, Modal, Select, SelectOption, Stack, Status } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { CliToolInstructions } from "./CliToolInstructions"
import { CLI_TOOLS, CLI_TOOL_LABELS, DEFAULT_CLI_TOOL, isCliTool, type CliTool } from "./cliSetupSnippets"

const STATUS_TIMEOUT_MS = 10_000
export const CLI_SETUP_ANALYTICS_PREFIX = "cliSetup"

interface CliSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenCredentials: () => void
  bucketName?: string
}

const CliSetupBody = ({ bucketName, onOpenCredentials }: { bucketName?: string; onOpenCredentials: () => void }) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const { onTrackEvent } = useRouteContext({ strict: false })

  const [tool, setTool] = useState<CliTool>(DEFAULT_CLI_TOOL)
  const [timedOut, setTimedOut] = useState(false)

  // staleTime: Infinity - endpoint/region are deployment constants, not per-session state.
  const { data, error, isRefetching, refetch } = trpcReact.storage.ceph.containers.status.useQuery(
    { project_id: projectId ?? "" },
    { enabled: !!projectId, retry: false, staleTime: Infinity }
  )
  const errorCode = error?.data?.code

  useEffect(() => {
    if (data || error || timedOut) return
    const id = window.setTimeout(() => setTimedOut(true), STATUS_TIMEOUT_MS)
    return () => window.clearTimeout(id)
  }, [data, error, timedOut])

  // 401: the session is gone. Terminate the server session first so the landing route does not
  // send the user straight back on a still-valid BFF token, then do a full-document redirect to
  // sign-in (same as network/ports/$portId.tsx).
  useEffect(() => {
    if (errorCode === "UNAUTHORIZED") {
      const { pathname, search, hash } = window.location
      const redirect = encodeURIComponent(pathname + search + hash)
      trpcClient.auth.terminateUserSession
        .mutate()
        .catch(() => {})
        .finally(() => {
          window.location.replace(`/?redirect=${redirect}`)
        })
    }
  }, [errorCode])

  const handleToolChange = (value?: string | number | string[]) => {
    if (!isCliTool(value) || value === tool) return
    setTool(value)
    onTrackEvent?.({
      source: "dropdown",
      action: `${CLI_SETUP_ANALYTICS_PREFIX}.selectTool`,
      metadata: { tool: value },
    })
  }

  // The timer is not a request abort, and `refetch()` only cancels a running fetch when the query
  // already holds data - so cancel first, otherwise Retry re-joins the hanging request.
  const handleRetry = async () => {
    setTimedOut(false)
    await utils.storage.ceph.containers.status.cancel({ project_id: projectId ?? "" })
    void refetch()
  }

  const renderState = () => {
    if (data) {
      return <CliToolInstructions tool={tool} endpoint={data.endpoint} region={data.region} bucketName={bucketName} />
    }
    if (errorCode === "UNAUTHORIZED") return null
    if (error || timedOut) {
      // A real error always wins over the timeout flag.
      const isNetworkError = error ? !error.data?.code : timedOut
      return (
        <Status
          status="error"
          title={t`Connection Details Unavailable`}
          aria-live="assertive"
          body={
            isNetworkError
              ? t`Could not load connection details. Check the network connection and try again.`
              : `${error?.message} ${t`Contact your administrator if the problem persists.`}`
          }
          action={
            isNetworkError ? (
              <ButtonRow>
                <Button onClick={handleRetry} progress={isRefetching}>
                  <Trans>Retry</Trans>
                </Button>
              </ButtonRow>
            ) : undefined
          }
        />
      )
    }
    return <Status status="progress" title={t`Loading Connection Details…`} />
  }

  return (
    <Stack direction="vertical" gap="4">
      <Stack direction="horizontal" className="justify-end">
        <Button label={t`Manage Credentials`} onClick={onOpenCredentials} data-testid="cli-setup-manage-credentials" />
      </Stack>
      <Select id="cli-setup-tool" label={t`CLI Tool`} value={tool} onChange={handleToolChange}>
        {CLI_TOOLS.map((id) => (
          <SelectOption key={id} value={id} label={CLI_TOOL_LABELS[id]} />
        ))}
      </Select>
      {renderState()}
    </Stack>
  )
}

/**
 * Info-only guide for configuring a local CLI (AWS CLI, s3cmd, rclone) against Ceph object storage.
 *
 * Credentials are placeholders: no credential or reveal call is made here. The endpoint and region
 * come from `containers.status`, whose cache entry is shared with `ManageCredentialsModal` (same
 * input and options).
 *
 * Per-open state (tool selection, timeout flag, status query) lives in `CliSetupBody`, which is mounted
 * only while the modal is open.
 *
 * `onOpenCredentials` lets the parent swap this modal for `ManageCredentialsModal` instead of
 * stacking them (B.5). Analytics names follow the agreed spec (`cliSetup.*`).
 */
export const CliSetupModal = ({ isOpen, onClose, onOpenCredentials, bucketName }: CliSetupModalProps) => {
  const { t } = useLingui()
  const { trackClose, resetTracking } = useModalTracking({ isOpen, actionPrefix: CLI_SETUP_ANALYTICS_PREFIX })

  const handleClose = () => {
    trackClose()
    resetTracking()
    onClose()
  }

  const handleOpenCredentials = () => {
    trackClose()
    resetTracking()
    onOpenCredentials()
  }

  return (
    <Modal
      title={t`CLI Setup Guide`}
      open={isOpen}
      size="large"
      onCancel={handleClose}
      cancelButtonLabel={t`Close`}
      closeOnBackdropClick
      // Juno 9.7.2 wires `closeOnBackdropClick` to the container's onClick, so without this every click
      // inside the dialog bubbles up and closes it. Stopping it here leaves only real backdrop clicks.
      onClick={(event) => event.stopPropagation()}
    >
      {/* Mounted only while open, so tool selection and the timeout flag start fresh on every opening. */}
      {isOpen && <CliSetupBody bucketName={bucketName} onOpenCredentials={handleOpenCredentials} />}
    </Modal>
  )
}
