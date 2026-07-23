import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Form, Stack, TextInput, Button, CheckboxGroup, Checkbox } from "@cloudoperators/juno-ui-components"
import type { CorsRule } from "@/server/Storage/types/ceph"
import { TagInput, urlValidator, headerValidator } from "./TagInput"

interface CorsRuleFormProps {
  editingRule: CorsRule | null
  onSubmit: (rule: CorsRule) => void
  onCancel: () => void
  isSaving: boolean
}

const ALLOWED_METHODS = ["GET", "PUT", "POST", "DELETE", "HEAD"] as const

export const CorsRuleForm = ({ editingRule, onSubmit, onCancel, isSaving }: CorsRuleFormProps) => {
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
      const newRule: CorsRule = {
        ID: value.ID || undefined,
        AllowedOrigins: value.AllowedOrigins,
        AllowedMethods: value.AllowedMethods as ("GET" | "PUT" | "POST" | "DELETE" | "HEAD")[],
        AllowedHeaders: value.AllowedHeaders.length > 0 ? value.AllowedHeaders : undefined,
        ExposeHeaders: value.ExposeHeaders.length > 0 ? value.ExposeHeaders : undefined,
        MaxAgeSeconds: value.MaxAgeSeconds ? parseInt(value.MaxAgeSeconds, 10) : undefined,
      }

      onSubmit(newRule)
    },
  })

  const allowedOriginsValue = useStore(form.store, (state) => state.values.AllowedOrigins)
  const allowedMethodsValue = useStore(form.store, (state) => state.values.AllowedMethods)

  const canSubmit = allowedOriginsValue.length > 0 && allowedMethodsValue.length > 0

  return (
    <div>
      <h3 className="mb-2 text-base font-semibold">
        {editingRule ? <Trans>Edit CORS Rule</Trans> : <Trans>Add CORS Rule</Trans>}
      </h3>
      <Form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <Stack direction="vertical" gap="3">
          <form.Field name="ID">
            {(field) => (
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
          </form.Field>

          <form.Field name="AllowedOrigins">
            {(field) => (
              <TagInput
                label={t`Allowed Origins (Required)`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                disabled={isSaving}
                placeholder={t`https://example.com or *`}
                helptext={t`Enter an origin URL and press Enter. Use * to allow all origins (not recommended for sensitive data).`}
                validate={urlValidator}
              />
            )}
          </form.Field>

          <form.Field name="AllowedMethods">
            {(field) => (
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
          </form.Field>

          <form.Field name="AllowedHeaders">
            {(field) => (
              <TagInput
                label={t`Allowed Headers (Optional)`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                disabled={isSaving}
                placeholder={t`Authorization, Content-Type, or *`}
                helptext={t`Enter a header name and press Enter. Use * to allow all headers.`}
                validate={headerValidator}
              />
            )}
          </form.Field>

          <form.Field name="ExposeHeaders">
            {(field) => (
              <TagInput
                label={t`Expose Headers (Optional)`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                disabled={isSaving}
                placeholder={t`ETag, Content-Length`}
                helptext={t`Enter a header name and press Enter. These headers will be exposed to the browser.`}
                validate={headerValidator}
              />
            )}
          </form.Field>

          <form.Field name="MaxAgeSeconds">
            {(field) => (
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
          </form.Field>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={!canSubmit || isSaving}>
              {editingRule ? <Trans>Update Rule</Trans> : <Trans>Add Rule</Trans>}
            </Button>
            {editingRule && (
              <Button type="button" variant="subdued" onClick={onCancel}>
                <Trans>Cancel Edit</Trans>
              </Button>
            )}
          </div>
        </Stack>
      </Form>
    </div>
  )
}
