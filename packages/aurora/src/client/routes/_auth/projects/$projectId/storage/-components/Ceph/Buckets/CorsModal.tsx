import { useEffect, useMemo, useState } from "react"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  Stack,
  Spinner,
  Message,
  Form,
  TextInput,
  Button,
  CheckboxGroup,
  Checkbox,
  Panel,
  PanelBody,
} from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import type { CorsRule } from "@/server/Storage/types/ceph"

interface CorsModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

const ALLOWED_METHODS = ["GET", "PUT", "POST", "DELETE", "HEAD"] as const

export const CorsModal = ({ isOpen, bucketName, onClose, onSuccess, onError }: CorsModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"view" | "add">("view")

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.cors",
  })

  // Query to fetch existing CORS configuration
  const {
    data: corsData,
    isLoading: isCorsLoading,
    error: corsError,
  } = trpcReact.storage.ceph.cors.get.useQuery(
    {
      project_id: projectId,
      bucketName,
    },
    {
      enabled: isOpen && !!projectId,
      retry: false,
    }
  )

  // Track current rules (from server + local edits)
  const [currentRules, setCurrentRules] = useState<CorsRule[]>([])

  // Load CORS rules from server when modal opens
  useEffect(() => {
    if (!isOpen) return
    if (corsData?.corsRules) {
      setCurrentRules(corsData.corsRules)
    } else {
      setCurrentRules([])
    }
  }, [isOpen, corsData])

  // Set mutation
  const setMutation = trpcReact.storage.ceph.cors.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(bucketName)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
  })

  // Delete mutation
  const deleteMutation = trpcReact.storage.ceph.cors.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(bucketName)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
  })

  // Form for adding/editing CORS rules
  const form = useForm({
    defaultValues: {
      ID: "",
      AllowedOrigins: "",
      AllowedMethods: [] as string[],
      AllowedHeaders: "",
      ExposeHeaders: "",
      MaxAgeSeconds: "",
    },
    onSubmit: async ({ value }) => {
      markSubmitted()

      // Parse multi-line origins into array
      const origins = value.AllowedOrigins.split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0)

      const headers = value.AllowedHeaders
        ? value.AllowedHeaders.split("\n")
            .map((h) => h.trim())
            .filter((h) => h.length > 0)
        : undefined

      const exposeHeaders = value.ExposeHeaders
        ? value.ExposeHeaders.split("\n")
            .map((h) => h.trim())
            .filter((h) => h.length > 0)
        : undefined

      const maxAge = value.MaxAgeSeconds ? parseInt(value.MaxAgeSeconds, 10) : undefined

      const newRule: CorsRule = {
        ID: value.ID || undefined,
        AllowedOrigins: origins,
        AllowedMethods: value.AllowedMethods as ("GET" | "PUT" | "POST" | "DELETE" | "HEAD")[],
        AllowedHeaders: headers,
        ExposeHeaders: exposeHeaders,
        MaxAgeSeconds: maxAge,
      }

      if (editingRuleIndex !== null) {
        // Update existing rule
        const updatedRules = [...currentRules]
        updatedRules[editingRuleIndex] = newRule
        setCurrentRules(updatedRules)
        setEditingRuleIndex(null)
      } else {
        // Add new rule
        setCurrentRules([...currentRules, newRule])
      }

      form.reset()
      setActiveTab("view") // Switch to view tab after adding/editing
    },
  })

  const handleClose = () => {
    form.reset()
    setMutation.reset()
    deleteMutation.reset()
    setCurrentRules([])
    setEditingRuleIndex(null)
    setActiveTab("view") // Reset to view tab
    resetTracking()
    onClose()
  }

  const handleEditRule = (index: number) => {
    const rule = currentRules[index]
    setEditingRuleIndex(index)
    setActiveTab("add") // Switch to add/edit tab
    form.setFieldValue("ID", rule.ID || "")
    form.setFieldValue("AllowedOrigins", rule.AllowedOrigins.join("\n"))
    form.setFieldValue("AllowedMethods", rule.AllowedMethods as string[])
    form.setFieldValue("AllowedHeaders", rule.AllowedHeaders?.join("\n") || "")
    form.setFieldValue("ExposeHeaders", rule.ExposeHeaders?.join("\n") || "")
    form.setFieldValue("MaxAgeSeconds", rule.MaxAgeSeconds?.toString() || "")
  }

  const handleDeleteRule = (index: number) => {
    const updatedRules = currentRules.filter((_, i) => i !== index)
    setCurrentRules(updatedRules)
    if (editingRuleIndex === index) {
      setEditingRuleIndex(null)
      form.reset()
    }
  }

  const handleCancelEdit = () => {
    setEditingRuleIndex(null)
    form.reset()
  }

  const handleSaveConfiguration = () => {
    if (currentRules.length === 0) {
      // No rules = delete CORS configuration
      deleteMutation.mutate({
        project_id: projectId,
        bucketName,
      })
    } else {
      // Save CORS configuration
      setMutation.mutate({
        project_id: projectId,
        bucketName,
        corsConfiguration: {
          CORSRules: currentRules,
        },
      })
    }
  }

  const handleDeleteAllRules = () => {
    deleteMutation.mutate({
      project_id: projectId,
      bucketName,
    })
  }

  // Subscribe to form state for reactivity
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const allowedOriginsValue = useStore(form.store, (state) => state.values.AllowedOrigins)
  const allowedMethodsValue = useStore(form.store, (state) => state.values.AllowedMethods)

  const hasChanges = useMemo(() => {
    const originalRules = corsData?.corsRules || []
    return JSON.stringify(currentRules) !== JSON.stringify(originalRules)
  }, [currentRules, corsData])

  const isSaving = setMutation.isPending || deleteMutation.isPending || isSubmitting
  const canAddRule = allowedOriginsValue.trim().length > 0 && allowedMethodsValue.length > 0
  const canSaveConfiguration = !isSaving && hasChanges

  // Check for wildcard warning
  const hasWildcardOrigin = currentRules.some((rule) => rule.AllowedOrigins.includes("*"))

  if (!isOpen) return null

  return (
    <Modal
      key={bucketName}
      title={t`CORS Configuration`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={t`Save Configuration`}
      onConfirm={handleSaveConfiguration}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!canSaveConfiguration}
      size="large"
    >
      <Stack direction="vertical" gap="4">
        {isCorsLoading && (
          <div className="flex items-center justify-center py-8">
            <Spinner variant="primary" size="large" />
          </div>
        )}

        {corsError && (
          <Message variant="error" title={t`Failed to load CORS configuration`}>
            {corsError.message}
          </Message>
        )}

        {setMutation.error && (
          <Message variant="error" title={t`Failed to save CORS configuration`}>
            {setMutation.error.message}
          </Message>
        )}

        {deleteMutation.error && (
          <Message variant="error" title={t`Failed to delete CORS configuration`}>
            {deleteMutation.error.message}
          </Message>
        )}

        {hasWildcardOrigin && (
          <Message variant="warning" title={t`Security Warning`}>
            <Trans>
              Using wildcard (*) for AllowedOrigins allows any website to access your bucket. Only use this for truly
              public resources.
            </Trans>
          </Message>
        )}

        {!isCorsLoading && !corsError && (
          <>
            {/* Tab Navigation */}
            <div className="border-theme-default flex gap-2 border-b pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("view")}
                className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "view"
                    ? "bg-theme-background-lvl-1 text-theme-high border-theme-accent border-b-2"
                    : "text-theme-default hover:text-theme-high"
                }`}
              >
                <Trans>View Rules</Trans> ({currentRules.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("add")}
                className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "add"
                    ? "bg-theme-background-lvl-1 text-theme-high border-theme-accent border-b-2"
                    : "text-theme-default hover:text-theme-high"
                }`}
              >
                {editingRuleIndex !== null ? <Trans>Edit Rule</Trans> : <Trans>Add Rule</Trans>}
              </button>
            </div>

            {/* View Rules Tab */}
            {activeTab === "view" && (
              <div>
                {/* Summary Panel */}
                <Panel className="mb-4">
                  <PanelBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-theme-high mb-1 text-base font-semibold">
                          <Trans>Current Configuration</Trans>
                        </h3>
                        <p className="text-theme-light text-sm">
                          {currentRules.length === 0 ? (
                            <Trans>No CORS rules configured on this bucket</Trans>
                          ) : (
                            <Trans>
                              {currentRules.length} {currentRules.length === 1 ? "rule" : "rules"} configured
                            </Trans>
                          )}
                        </p>
                      </div>
                      {currentRules.length === 0 ? (
                        <Button size="small" variant="primary" onClick={() => setActiveTab("add")}>
                          <Trans>Add First Rule</Trans>
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="small" variant="subdued" onClick={() => setActiveTab("add")}>
                            <Trans>Add Rule</Trans>
                          </Button>
                        </div>
                      )}
                    </div>
                  </PanelBody>
                </Panel>

                {/* Global Security Warning */}
                {hasWildcardOrigin && (
                  <Message variant="warning" title={t`Security Warning`} className="mb-4">
                    <Trans>
                      One or more rules use wildcard (*) for AllowedOrigins, which allows any website to access your
                      bucket. Only use this for truly public resources.
                    </Trans>
                  </Message>
                )}

                {/* Help Text */}
                <div className="mb-4">
                  <p className="text-theme-default mb-2 text-sm">
                    <Trans>
                      CORS (Cross-Origin Resource Sharing) controls which browser origins can access bucket content via
                      JavaScript.
                    </Trans>
                  </p>
                  <p className="text-theme-light text-sm">
                    <Trans>Essential for single-page applications, web-based uploads, and cross-domain hosting.</Trans>
                  </p>
                </div>

                {/* Current Rules List */}
                {currentRules.length > 0 && (
                  <div>
                    <h3 className="text-theme-high mb-3 text-base font-semibold">
                      <Trans>Rules Details</Trans>
                    </h3>
                    <Stack direction="vertical" gap="2">
                      {currentRules.map((rule, index) => (
                        <Panel key={index}>
                          <PanelBody>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="mb-2">
                                  <span className="text-theme-high font-semibold">
                                    {rule.ID || t`Rule ${index + 1}`}
                                  </span>
                                  {rule.AllowedOrigins.includes("*") && (
                                    <span className="text-theme-warning ml-2 text-xs">⚠️ Wildcard</span>
                                  )}
                                </div>
                                <div className="space-y-1.5 text-sm">
                                  <div>
                                    <span className="text-theme-default font-medium">
                                      🌐 <Trans>Origins:</Trans>
                                    </span>{" "}
                                    <span className="text-theme-light">{rule.AllowedOrigins.join(", ")}</span>
                                  </div>
                                  <div>
                                    <span className="text-theme-default font-medium">
                                      📡 <Trans>Methods:</Trans>
                                    </span>{" "}
                                    <span className="text-theme-light">{rule.AllowedMethods.join(", ")}</span>
                                  </div>
                                  {rule.AllowedHeaders && (
                                    <div>
                                      <span className="text-theme-default font-medium">
                                        📝 <Trans>Allowed Headers:</Trans>
                                      </span>{" "}
                                      <span className="text-theme-light">{rule.AllowedHeaders.join(", ")}</span>
                                    </div>
                                  )}
                                  {rule.ExposeHeaders && (
                                    <div>
                                      <span className="text-theme-default font-medium">
                                        📄 <Trans>Expose Headers:</Trans>
                                      </span>{" "}
                                      <span className="text-theme-light">{rule.ExposeHeaders.join(", ")}</span>
                                    </div>
                                  )}
                                  {rule.MaxAgeSeconds !== undefined && (
                                    <div>
                                      <span className="text-theme-default font-medium">
                                        ⏱️ <Trans>Max Age:</Trans>
                                      </span>{" "}
                                      <span className="text-theme-light">{rule.MaxAgeSeconds}s</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4 flex gap-2">
                                <Button size="small" variant="subdued" onClick={() => handleEditRule(index)}>
                                  <Trans>Edit</Trans>
                                </Button>
                                <Button size="small" variant="primary-danger" onClick={() => handleDeleteRule(index)}>
                                  <Trans>Delete</Trans>
                                </Button>
                              </div>
                            </div>
                          </PanelBody>
                        </Panel>
                      ))}
                    </Stack>
                  </div>
                )}

                {/* Actions for View Tab */}
                {currentRules.length > 0 && (
                  <div className="border-theme-default mt-4 flex items-center justify-between border-t pt-4">
                    <Button size="small" variant="primary-danger" onClick={handleDeleteAllRules}>
                      <Trans>Delete All Rules</Trans>
                    </Button>
                    <Button size="small" variant="primary" onClick={() => setActiveTab("add")}>
                      <Trans>Add Another Rule</Trans>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Add/Edit Rule Tab */}
            {activeTab === "add" && (
              <div>
                {/* Add/Edit CORS Rule Form */}
                <h3 className="mb-2 text-base font-semibold">
                  {editingRuleIndex !== null ? <Trans>Edit CORS Rule</Trans> : <Trans>Add CORS Rule</Trans>}
                </h3>
                <Form
                  onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                  }}
                >
                  <Stack direction="vertical" gap="3">
                    <form.Field
                      name="ID"
                      children={(field) => (
                        <TextInput
                          label={t`Rule ID (Optional)`}
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          disabled={isSaving}
                          placeholder={t`e.g., AllowWebsiteAccess`}
                          helptext={t`Optional identifier for this rule (max 255 characters)`}
                        />
                      )}
                    />

                    <form.Field
                      name="AllowedOrigins"
                      children={(field) => (
                        <>
                          <label htmlFor={field.name} className="juno-label mb-1.5">
                            <Trans>Allowed Origins (Required)</Trans>
                          </label>
                          <textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={isSaving}
                            placeholder={t`https://example.com\nhttps://app.example.com\n*`}
                            className="juno-textarea h-24"
                          />
                          <p className="text-theme-light mt-1 text-xs">
                            <Trans>
                              One origin per line. Use * to allow all origins (not recommended for sensitive data).
                            </Trans>
                          </p>
                        </>
                      )}
                    />

                    <form.Field
                      name="AllowedMethods"
                      children={(field) => (
                        <CheckboxGroup
                          label={t`Allowed Methods (Required)`}
                          helptext={t`Select HTTP methods allowed for cross-origin requests`}
                        >
                          {ALLOWED_METHODS.map((method) => (
                            <Checkbox
                              key={method}
                              label={method}
                              value={method}
                              checked={field.state.value.includes(method)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                const current = field.state.value
                                if (checked) {
                                  field.handleChange([...current, method])
                                } else {
                                  field.handleChange(current.filter((m) => m !== method))
                                }
                              }}
                              disabled={isSaving}
                            />
                          ))}
                        </CheckboxGroup>
                      )}
                    />

                    <form.Field
                      name="AllowedHeaders"
                      children={(field) => (
                        <>
                          <label htmlFor={field.name} className="juno-label mb-1.5">
                            <Trans>Allowed Headers (Optional)</Trans>
                          </label>
                          <textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={isSaving}
                            placeholder={t`Authorization\nContent-Type\n*`}
                            className="juno-textarea h-20"
                          />
                          <p className="text-theme-light mt-1 text-xs">
                            <Trans>Headers allowed in preflight requests. Use * to allow all headers.</Trans>
                          </p>
                        </>
                      )}
                    />

                    <form.Field
                      name="ExposeHeaders"
                      children={(field) => (
                        <>
                          <label htmlFor={field.name} className="juno-label mb-1.5">
                            <Trans>Expose Headers (Optional)</Trans>
                          </label>
                          <textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={isSaving}
                            placeholder={t`ETag\nContent-Length\nx-amz-meta-custom`}
                            className="juno-textarea h-20"
                          />
                          <p className="text-theme-light mt-1 text-xs">
                            <Trans>Headers exposed to the browser in responses.</Trans>
                          </p>
                        </>
                      )}
                    />

                    <form.Field
                      name="MaxAgeSeconds"
                      children={(field) => (
                        <TextInput
                          label={t`Max Age Seconds (Optional)`}
                          id={field.name}
                          name={field.name}
                          type="number"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          disabled={isSaving}
                          placeholder="3600"
                          min="0"
                          max="86400"
                          helptext={t`How long browsers can cache preflight responses (0-86400 seconds / 24 hours)`}
                        />
                      )}
                    />

                    <div className="flex gap-2">
                      <Button type="submit" variant="primary" disabled={!canAddRule || isSaving}>
                        {editingRuleIndex !== null ? <Trans>Update Rule</Trans> : <Trans>Add Rule</Trans>}
                      </Button>
                      {editingRuleIndex !== null && (
                        <Button type="button" variant="subdued" onClick={handleCancelEdit}>
                          <Trans>Cancel Edit</Trans>
                        </Button>
                      )}
                    </div>
                  </Stack>
                </Form>
              </div>
            )}
            {/* End Tabs */}
          </>
        )}
      </Stack>
    </Modal>
  )
}
