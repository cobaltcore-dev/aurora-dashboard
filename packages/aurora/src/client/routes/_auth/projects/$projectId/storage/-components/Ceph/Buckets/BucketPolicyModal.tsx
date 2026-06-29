import { useEffect, useMemo } from "react"
import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Select, SelectOption, Button, Spinner, Message, Form } from "@cloudoperators/juno-ui-components"
import { JsonEditor } from "@/client/components/JsonEditor"
import { useProjectId } from "@/client/hooks/useProjectId"

interface BucketPolicyModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

interface PolicyTemplate {
  label: string
  value: string
  generator: (bucketName: string) => object
}

// AWS/S3 Policy Version is NOT a creation date - it's the policy language version.
// "2012-10-17" is the current (and recommended) version that supports all policy features.
// Do not change this to a different date - S3 will reject or misinterpret the policy.
// See: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_version.html
const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    label: "Public Read",
    value: "publicRead",
    generator: (bucketName: string) => ({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
      ],
    }),
  },
  {
    label: "IP Restricted",
    value: "ipRestricted",
    generator: (bucketName: string) => ({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "IPRestrictedAccess",
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject", "s3:PutObject"],
          Resource: `arn:aws:s3:::${bucketName}/*`,
          Condition: {
            IpAddress: {
              "aws:SourceIp": "192.168.0.0/16",
            },
          },
        },
      ],
    }),
  },
]

const MAX_POLICY_SIZE = 20480 // 20KB

export const BucketPolicyModal = ({ isOpen, bucketName, onClose, onSuccess, onError }: BucketPolicyModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  // Form schema - only validates JSON syntax and size, backend handles policy structure validation
  // Empty string is allowed (will trigger delete)
  const formSchema = z.object({
    policyText: z
      .string()
      .max(MAX_POLICY_SIZE, t`Policy document exceeds maximum size of 20KB`)
      .refine(
        (value) => {
          if (!value.trim()) return true // Empty is valid (will delete policy)
          try {
            JSON.parse(value)
            return true
          } catch {
            return false
          }
        },
        { message: t`Invalid JSON format` }
      ),
    selectedTemplate: z.string(),
  })

  // Query to fetch existing policy
  const {
    data: policyData,
    isLoading: isPolicyLoading,
    error: policyError,
  } = trpcReact.storage.ceph.bucketPolicy.get.useQuery(
    {
      project_id: projectId,
      bucketName,
    },
    {
      enabled: isOpen && !!projectId,
      retry: false,
    }
  )

  // Set mutation
  const setMutation = trpcReact.storage.ceph.bucketPolicy.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.bucketPolicy.get.invalidate()
      onSuccess?.(bucketName)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
  })

  // Delete mutation (for when policy is cleared)
  const deleteMutation = trpcReact.storage.ceph.bucketPolicy.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.bucketPolicy.get.invalidate()
      onSuccess?.(bucketName)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
  })

  const form = useForm({
    defaultValues: {
      policyText: "",
      selectedTemplate: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (!value.policyText.trim()) {
        // Empty policy = delete
        deleteMutation.mutate({
          project_id: projectId,
          bucketName,
        })
      } else {
        setMutation.mutate({
          project_id: projectId,
          bucketName,
          policy: value.policyText,
        })
      }
    },
  })

  // Load policy data into form when modal opens or data changes
  useEffect(() => {
    if (!isOpen) return

    if (policyData?.policyText) {
      try {
        const parsed = JSON.parse(policyData.policyText)
        const formatted = JSON.stringify(parsed, null, 2)
        form.setFieldValue("policyText", formatted)
        form.setFieldValue("selectedTemplate", "")
      } catch {
        form.setFieldValue("policyText", policyData.policyText)
      }
    } else if (policyData?.policy === null) {
      form.setFieldValue("policyText", "")
      form.setFieldValue("selectedTemplate", "")
    }
  }, [isOpen, policyData, form])

  const handleClose = () => {
    form.reset()
    setMutation.reset()
    deleteMutation.reset()
    onClose()
  }

  const handleTemplateChange = (value: string | number | string[] | undefined) => {
    const templateValue = typeof value === "string" ? value : ""
    form.setFieldValue("selectedTemplate", templateValue)

    if (!templateValue) return

    const template = POLICY_TEMPLATES.find((t) => t.value === templateValue)
    if (template) {
      const policy = template.generator(bucketName)
      form.setFieldValue("policyText", JSON.stringify(policy, null, 2))
    }
  }

  const handleReset = () => {
    if (policyData?.policyText) {
      try {
        const parsed = JSON.parse(policyData.policyText)
        form.setFieldValue("policyText", JSON.stringify(parsed, null, 2))
      } catch {
        form.setFieldValue("policyText", policyData.policyText)
      }
    } else {
      form.setFieldValue("policyText", "")
    }
    form.setFieldValue("selectedTemplate", "")
  }

  // Subscribe to form state for reactivity
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const policyTextValue = useStore(form.store, (state) => state.values.policyText)
  const selectedTemplateValue = useStore(form.store, (state) => state.values.selectedTemplate)

  // Compute isDirty relative to the loaded policy, not form's defaultValues (which are empty strings).
  // This prevents false "Unsaved changes" indicator when the modal opens with existing policy.
  const originalPolicyText = useMemo(() => {
    if (!policyData?.policyText) return ""
    try {
      const parsed = JSON.parse(policyData.policyText)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return policyData.policyText
    }
  }, [policyData?.policyText])

  const isDirty = policyTextValue !== originalPolicyText

  const policySize = useMemo(() => {
    return new Blob([policyTextValue]).size
  }, [policyTextValue])

  // Validate JSON syntax only - backend handles policy structure validation
  const jsonSyntaxError = useMemo(() => {
    if (!policyTextValue.trim()) return null
    try {
      JSON.parse(policyTextValue)
      return null
    } catch (error) {
      if (error instanceof SyntaxError) {
        return error.message
      }
      return "Invalid JSON"
    }
  }, [policyTextValue])

  const isSaving = setMutation.isPending || deleteMutation.isPending || isSubmitting
  const canSubmit = !isSaving && !jsonSyntaxError && policySize <= MAX_POLICY_SIZE

  const handleSave = () => {
    form.handleSubmit()
  }

  if (!isOpen) return null

  return (
    <Modal
      key={bucketName} // Remount when bucket changes
      title={t`Edit/view Bucket Policy`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={policyTextValue.trim() ? t`Save Policy` : t`Delete Policy`}
      onConfirm={handleSave}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!canSubmit}
      size="large"
    >
      <Stack direction="vertical" gap="4">
        {isPolicyLoading && (
          <div className="flex items-center justify-center py-8">
            <Spinner variant="primary" size="large" />
          </div>
        )}

        {policyError && (
          <Message variant="error" title={t`Failed to load policy`}>
            {policyError.message}
          </Message>
        )}

        {setMutation.error && (
          <Message variant="error" title={t`Failed to save policy`}>
            {setMutation.error.message}
          </Message>
        )}

        {deleteMutation.error && (
          <Message variant="error" title={t`Failed to delete policy`}>
            {deleteMutation.error.message}
          </Message>
        )}

        {!isPolicyLoading && !policyError && (
          <Form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <Stack direction="vertical" gap="4">
              <div>
                <p className="mb-2">
                  <Trans>Define permissions for this bucket. You may use one of the predefined templates.</Trans>
                </p>
                <p>
                  <Trans>Leaving the JSON field empty will remove the policy from the bucket.</Trans>
                </p>
              </div>

              <Select
                label={t`Policy Templates`}
                value={selectedTemplateValue}
                onChange={handleTemplateChange}
                disabled={isSaving}
              >
                <SelectOption value="" label={t`Select a template...`} />
                {POLICY_TEMPLATES.map((template) => (
                  <SelectOption
                    key={template.value}
                    value={template.value}
                    label={template.value === "publicRead" ? t`Public Read` : t`IP Restricted`}
                  />
                ))}
              </Select>

              <div>
                <form.Field
                  name="policyText"
                  children={(field) => (
                    <>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor={field.name} className="juno-label">
                          <Trans>Policy JSON</Trans>
                        </label>
                        {isDirty && (
                          <div className="flex items-center gap-2">
                            <span className="text-theme-warning text-xs">
                              <Trans>Unsaved changes</Trans>
                            </span>
                            <Button variant="subdued" size="small" onClick={handleReset} disabled={isSaving}>
                              <Trans>Reset</Trans>
                            </Button>
                          </div>
                        )}
                      </div>
                      <JsonEditor
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        className="h-96"
                        disabled={isSaving}
                        placeholder={t`Enter bucket policy JSON...`}
                        error={jsonSyntaxError}
                      />
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className={policySize > MAX_POLICY_SIZE ? "text-theme-error" : "text-theme-light"}>
                          <Trans>
                            Size: {policySize} / {MAX_POLICY_SIZE} bytes
                          </Trans>
                        </span>
                        {jsonSyntaxError && <span className="text-theme-error">{jsonSyntaxError}</span>}
                      </div>
                    </>
                  )}
                />
              </div>
            </Stack>
          </Form>
        )}
      </Stack>
    </Modal>
  )
}
