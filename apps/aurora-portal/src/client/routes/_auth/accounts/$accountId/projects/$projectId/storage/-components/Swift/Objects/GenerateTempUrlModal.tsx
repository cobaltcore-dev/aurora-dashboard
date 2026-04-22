import { useEffect, useRef, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  Message,
  Stack,
  Spinner,
  TextInput,
  Icon,
  Select,
  SelectOption,
} from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { ObjectRow } from "./"

// ── Expiry presets ────────────────────────────────────────────────────────────

interface ExpiryPreset {
  labelKey: string
  seconds: number
}

const CUSTOM_VALUE = "custom"

// ── Props ─────────────────────────────────────────────────────────────────────

interface GenerateTempUrlModalProps {
  isOpen: boolean
  object: ObjectRow | null
  onClose: () => void
  onCopySuccess?: (objectName: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export const GenerateTempUrlModal = ({ isOpen, object, onClose, onCopySuccess }: GenerateTempUrlModalProps) => {
  const { t } = useLingui()
  const { containerName } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/",
  })

  // Defined inside the component so t`` runs in the correct Lingui context,
  // ensuring labels are extracted and translated at render time.
  const EXPIRY_PRESETS: ExpiryPreset[] = [
    { labelKey: t`1 hour`, seconds: 3600 },
    { labelKey: t`24 hours`, seconds: 86400 },
    { labelKey: t`7 days`, seconds: 604800 },
  ]

  // Selected preset key (seconds as string) or "custom"
  const [selectedPreset, setSelectedPreset] = useState<string>(String(EXPIRY_PRESETS[1].seconds))
  // Custom duration in minutes (only active when selectedPreset === "custom")
  const [customMinutes, setCustomMinutes] = useState("")
  const [customMinutesError, setCustomMinutesError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Generated URL state
  const [tempUrl, setTempUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  // "no key" errors get special inline treatment
  const [noKeyError, setNoKeyError] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const displayNameRef = useRef("")

  const generateMutation = trpcReact.storage.swift.generateTempUrl.useMutation({
    onSuccess: (data) => {
      setTempUrl(data.url)
      setExpiresAt(data.expiresAt)
      setNoKeyError(false)
      setGeneralError(null)
    },
    onError: (error) => {
      if (error.message.includes("Temp URL key not configured")) {
        setNoKeyError(true)
        setGeneralError(null)
      } else {
        setGeneralError(error.message)
        setNoKeyError(false)
      }
    },
  })

  useEffect(() => {
    if (!isOpen) {
      generateMutation.reset()
      setTempUrl(null)
      setExpiresAt(null)
      setSelectedPreset(String(EXPIRY_PRESETS[1].seconds))
      setCustomMinutes("")
      setCustomMinutesError(null)
      setCopied(false)
      setNoKeyError(false)
      setGeneralError(null)
    }
  }, [isOpen])

  const resolveExpiresIn = (): number | null => {
    if (selectedPreset === CUSTOM_VALUE) {
      const mins = parseInt(customMinutes, 10)
      if (isNaN(mins) || mins <= 0) return null
      return mins * 60
    }
    return parseInt(selectedPreset, 10)
  }

  const handleGenerate = () => {
    if (!object) return
    if (selectedPreset === CUSTOM_VALUE) {
      const mins = parseInt(customMinutes, 10)
      if (!customMinutes.trim() || isNaN(mins) || mins <= 0) {
        setCustomMinutesError(t`Please enter a valid number of minutes greater than 0`)
        return
      }
      setCustomMinutesError(null)
    }
    const expiresIn = resolveExpiresIn()
    if (expiresIn === null) return
    displayNameRef.current = object.displayName
    setTempUrl(null)
    setExpiresAt(null)
    setCopied(false)
    generateMutation.mutate({
      container: containerName,
      object: object.name,
      method: "GET",
      expiresIn,
    })
  }

  const handleCopy = () => {
    if (!tempUrl) return
    navigator.clipboard.writeText(tempUrl).then(() => {
      setCopied(true)
      onCopySuccess?.(displayNameRef.current)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handlePresetChange = (value?: string | number | string[]) => {
    const defaultPreset = String(EXPIRY_PRESETS[1].seconds)
    const candidate =
      typeof value === "string"
        ? value
        : typeof value === "number"
          ? String(value)
          : Array.isArray(value) && typeof value[0] === "string"
            ? value[0]
            : ""
    const validPresets = new Set([...EXPIRY_PRESETS.map((p) => String(p.seconds)), CUSTOM_VALUE])
    const nextPreset = candidate && validPresets.has(candidate) ? candidate : defaultPreset
    setSelectedPreset(nextPreset)
    // Reset generated URL when config changes
    setTempUrl(null)
    setExpiresAt(null)
    setCopied(false)
    setGeneralError(null)
    setNoKeyError(false)
  }

  const handleCustomMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomMinutes(e.target.value)
    if (customMinutesError) setCustomMinutesError(null)
    // Reset generated URL when config changes
    setTempUrl(null)
    setExpiresAt(null)
    setCopied(false)
    setGeneralError(null)
    setNoKeyError(false)
  }

  if (!isOpen || !object) return null

  const displayName = object.displayName
  const isPending = generateMutation.isPending
  const isCustom = selectedPreset === CUSTOM_VALUE

  // Absolute expiry timestamp formatted for current locale
  const expiresAtFormatted = expiresAt ? new Date(expiresAt * 1000).toLocaleString() : null
  // Human-readable relative label for the selected preset — used as a plain
  // string inside the "Expires in {label} — at {timestamp}" interpolation.
  const selectedPresetLabel =
    selectedPreset === CUSTOM_VALUE
      ? customMinutes
        ? parseInt(customMinutes, 10) === 1
          ? t`1 minute`
          : t`${customMinutes} minutes`
        : null
      : (EXPIRY_PRESETS.find((p) => String(p.seconds) === selectedPreset)?.labelKey ?? null)

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Share object:</Trans>
          </span>
          <span className="truncate font-mono" title={displayName}>
            {displayName}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={onClose}
      confirmButtonLabel={isPending ? t`Generating...` : t`Generate URL`}
      onConfirm={handleGenerate}
      cancelButtonLabel={t`Close`}
      size="small"
      disableConfirmButton={isPending || (isCustom && (!customMinutes.trim() || !!customMinutesError))}
    >
      <Stack direction="vertical" gap="4">
        <Message variant="info">
          <Trans>
            A temporary URL grants time-limited read access to this object without requiring authentication. Anyone with
            the link can download it until it expires.
          </Trans>
        </Message>

        {/* Expiry selector */}
        <Select label={t`Expires in`} value={selectedPreset} onChange={handlePresetChange} disabled={isPending}>
          {EXPIRY_PRESETS.map((preset) => (
            <SelectOption key={preset.seconds} value={String(preset.seconds)} label={preset.labelKey} />
          ))}
          <SelectOption value={CUSTOM_VALUE} label={t`Custom`} />
        </Select>

        {/* Custom duration input */}
        {isCustom && (
          <TextInput
            label={t`Custom duration (minutes)`}
            value={customMinutes}
            onChange={handleCustomMinutesChange}
            invalid={!!customMinutesError}
            errortext={customMinutesError || undefined}
            disabled={isPending}
            placeholder="60"
            type="number"
          />
        )}

        {/* Loading state */}
        {isPending && (
          <Stack direction="horizontal" alignment="center" gap="2" className="py-2">
            <Spinner size="small" />
            <Trans>Generating temporary URL...</Trans>
          </Stack>
        )}

        {/* No key configured error */}
        {noKeyError && (
          <Message variant="warning">
            <Trans>
              <strong>No Temp URL key configured.</strong> A temporary URL key must be set at the account or container
              level before temporary URLs can be generated. Contact your administrator to configure{" "}
              <code>X-Account-Meta-Temp-URL-Key</code> or <code>X-Container-Meta-Temp-URL-Key</code>.
            </Trans>
          </Message>
        )}

        {/* General error */}
        {generalError && (
          <Message variant="danger">
            <Trans>Failed to generate temporary URL: {generalError}</Trans>
          </Message>
        )}

        {/* Generated URL */}
        {tempUrl && (
          <Stack direction="vertical" gap="2">
            <div className="relative">
              <TextInput label={t`Temporary URL`} value={tempUrl} readOnly className="pr-10 font-mono text-xs" />
              <button
                type="button"
                onClick={handleCopy}
                title={copied ? t`Copied!` : t`Copy URL`}
                className="text-theme-light hover:text-theme-default absolute top-1/2 right-2 inline-flex items-center transition-colors"
                style={{ transform: "translateY(-50%)" }}
              >
                <Icon icon={copied ? "checkCircle" : "contentCopy"} size="18" />
              </button>
            </div>
            {expiresAtFormatted && selectedPresetLabel && (
              <p className="text-theme-light text-xs">
                <Trans>
                  Expires in {selectedPresetLabel} — at {expiresAtFormatted}
                </Trans>
              </p>
            )}
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}
