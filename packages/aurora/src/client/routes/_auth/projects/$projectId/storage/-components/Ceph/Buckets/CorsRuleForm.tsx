import { useEffect } from "react"
import { useForm, useStore } from "@tanstack/react-form"
import { useLingui } from "@lingui/react/macro"
import { Form, Stack, TextInput, CheckboxGroup, Checkbox } from "@cloudoperators/juno-ui-components"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"
import { TagInput, urlValidator, headerValidator } from "./TagInput"

interface CorsRuleFormProps {
  editingRule: CorsRuleRead | null
  onSubmit: (rule: CorsRuleRead) => void
  formId: string
  onValidationChange?: (isValid: boolean) => void
}

export const ALLOWED_METHODS = ["GET", "PUT", "POST", "DELETE", "HEAD"] as const

export const CorsRuleForm = ({ editingRule, onSubmit, formId, onValidationChange }: CorsRuleFormProps) => {
  const { t } = useLingui()

  const form = useForm({
    defaultValues: {
      ID: editingRule?.ID || "",
      AllowedOrigins: editingRule?.AllowedOrigins || [],
      AllowedMethods: (editingRule?.AllowedMethods || []) as string[],
      AllowedHeaders: editingRule?.AllowedHeaders || [],
      ExposeHeaders: editingRule?.ExposeHeaders || [],
      MaxAgeSeconds: editingRule?.MaxAgeSeconds?.toString() || "",
    },
    onSubmit: async ({ value }) => {
      const newRule: CorsRuleRead = {
        ID: value.ID || undefined,
        AllowedOrigins: value.AllowedOrigins,
        AllowedMethods: value.AllowedMethods,
        AllowedHeaders: value.AllowedHeaders.length > 0 ? value.AllowedHeaders : undefined,
        ExposeHeaders: value.ExposeHeaders.length > 0 ? value.ExposeHeaders : undefined,
        MaxAgeSeconds: value.MaxAgeSeconds ? parseInt(value.MaxAgeSeconds, 10) : undefined,
      }

      onSubmit(newRule)
    },
  })

  const allowedOriginsValue = useStore(form.store, (state: typeof form.store.state) => state.values.AllowedOrigins)
  const allowedMethodsValue = useStore(form.store, (state: typeof form.store.state) => state.values.AllowedMethods)

  const canSubmit = allowedOriginsValue.length > 0 && allowedMethodsValue.length > 0

  // Notify parent about validation state changes
  useEffect(() => {
    onValidationChange?.(canSubmit)
  }, [canSubmit, onValidationChange])

  return (
    <div>
      <Form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <Stack direction="vertical" gap="4">
          <form.Field name="ID">
            {(field) => (
              <TextInput
                label={t`Rule ID`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={t`e.g. allow-frontend-app`}
                helptext={t`Optional identifier for this rule (max 255 characters).`}
              />
            )}
          </form.Field>

          <form.Field name="AllowedOrigins">
            {(field) => (
              <TagInput
                label={t`Allowed Origins`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                placeholder={t`e.g. https://example.com or *`}
                helptext={t`Enter a URL and press Enter. Use * to allow all origins.`}
                validate={urlValidator}
                required={true}
              />
            )}
          </form.Field>

          <form.Field name="AllowedMethods">
            {(field) => (
              <CheckboxGroup
                label={t`Allowed Methods`}
                helptext={t`Select HTTP methods allowed for cross-origin requests`}
                required={true}
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
                  />
                ))}
              </CheckboxGroup>
            )}
          </form.Field>

          <form.Field name="AllowedHeaders">
            {(field) => (
              <TagInput
                label={t`Allowed Headers`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                placeholder={t`e.g. Authorization, Content-Type, or *`}
                helptext={t`Enter a header name and press Enter. Use * to allow all headers.`}
                validate={headerValidator}
              />
            )}
          </form.Field>

          <form.Field name="ExposeHeaders">
            {(field) => (
              <TagInput
                label={t`Expose Headers`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                placeholder={t`e.g. Etag, Content-Length`}
                helptext={t`Enter a header name and press Enter. These headers will be exposed to the browser.`}
                validate={headerValidator}
              />
            )}
          </form.Field>

          <form.Field name="MaxAgeSeconds">
            {(field) => (
              <TextInput
                label={t`Max Age in Seconds`}
                id={field.name}
                name={field.name}
                type="number"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={t`e.g. 3600 (1 hour) or 604800 (7 days)`}
                min="0"
                helptext={t`How long browsers can cache preflight responses. Common values: 3600 (1 hour), 86400 (1 day), 604800 (1 week).`}
              />
            )}
          </form.Field>
        </Stack>
      </Form>
    </div>
  )
}
