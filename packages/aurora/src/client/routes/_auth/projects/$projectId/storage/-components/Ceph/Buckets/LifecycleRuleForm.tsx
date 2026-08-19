import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { useEffect, useState } from "react"
import { Form, Stack, TextInput, Button, Checkbox, Message, Pill } from "@cloudoperators/juno-ui-components"
import type { LifecycleRuleRead, LifecycleTag } from "@/server/Storage/types/ceph"
import { normalizeFilter } from "./utils/lifecycleUtils"

interface LifecycleRuleFormProps {
  editingRule: LifecycleRuleRead | null
  onSubmit: (rule: LifecycleRuleRead) => void
  formId: string
  onValidationChange?: (isValid: boolean) => void
}

export const LifecycleRuleForm = ({ editingRule, onSubmit, formId, onValidationChange }: LifecycleRuleFormProps) => {
  const { t } = useLingui()

  // Extract values from editing rule
  const getInitialValues = () => {
    if (!editingRule) {
      return {
        ID: "",
        Status: "Disabled" as const,
        Prefix: "",
        tags: [] as LifecycleTag[],
        hasExpiration: false,
        expirationDays: "",
        hasNoncurrentExpiration: false,
        noncurrentDays: "",
        hasAbortUpload: false,
        abortDays: "",
      }
    }

    const filter = editingRule.Filter
    const expiration = editingRule.Expiration
    const noncurrentExp = editingRule.NoncurrentVersionExpiration
    const abort = editingRule.AbortIncompleteMultipartUpload

    // Extract prefix and tags from filter
    // Fall back to legacy top-level Prefix field if Filter is absent (item 23 fix)
    let prefix = ""
    let tags: LifecycleTag[] = []
    if (filter) {
      if ("Prefix" in filter && filter.Prefix) {
        prefix = filter.Prefix
      }
      if ("Tag" in filter && filter.Tag) {
        tags = [filter.Tag]
      }
      if ("And" in filter && filter.And) {
        if (filter.And.Prefix) prefix = filter.And.Prefix
        if (filter.And.Tags) tags = filter.And.Tags
      }
    } else if (editingRule.Prefix) {
      // Legacy top-level Prefix (no Filter present)
      prefix = editingRule.Prefix
    }

    return {
      ID: editingRule.ID || "",
      Status: (editingRule.Status || "Disabled") as "Enabled" | "Disabled",
      Prefix: prefix,
      tags,
      hasExpiration: expiration !== undefined,
      // Only populate expirationDays if the rule actually uses Days (item 24 fix)
      // If it uses Date or ExpiredObjectDeleteMarker, leave empty (preserve original on submit)
      expirationDays: expiration?.Days?.toString() || "",
      hasNoncurrentExpiration: noncurrentExp !== undefined,
      noncurrentDays: noncurrentExp?.NoncurrentDays?.toString() || "",
      hasAbortUpload: abort !== undefined,
      abortDays: abort?.DaysAfterInitiation?.toString() || "",
    }
  }

  const form = useForm({
    defaultValues: getInitialValues(),
    onSubmit: ({ value }) => {
      const filter = normalizeFilter(value.Prefix || undefined, value.tags.length > 0 ? value.tags : undefined)

      const newRule: LifecycleRuleRead = {
        ID: value.ID || undefined,
        Status: value.Status,
        Filter: filter,
        Prefix: undefined, // Clear legacy Prefix field (item 23 fix)
      }

      // If editing, preserve the existing Expiration field byte-identical if user didn't change it (item 24 fix)
      if (value.hasExpiration) {
        if (value.expirationDays) {
          newRule.Expiration = { Days: parseInt(value.expirationDays, 10) }
        } else if (editingRule?.Expiration) {
          // Preserve the original Expiration (Date or ExpiredObjectDeleteMarker) unchanged
          newRule.Expiration = editingRule.Expiration
        }
      }

      // Preserve Transitions byte-identical (item 1 fix)
      if (editingRule?.Transitions) {
        newRule.Transitions = editingRule.Transitions
      }

      if (value.hasNoncurrentExpiration && value.noncurrentDays) {
        newRule.NoncurrentVersionExpiration = {
          NoncurrentDays: parseInt(value.noncurrentDays, 10),
          ...(editingRule?.NoncurrentVersionExpiration?.NewerNoncurrentVersions !== undefined && {
            NewerNoncurrentVersions: editingRule.NoncurrentVersionExpiration.NewerNoncurrentVersions,
          }),
        }
      }

      // Preserve NoncurrentVersionTransitions if present (read-only)
      if (editingRule?.NoncurrentVersionTransitions) {
        newRule.NoncurrentVersionTransitions = editingRule.NoncurrentVersionTransitions
      }

      if (value.hasAbortUpload && value.abortDays) {
        newRule.AbortIncompleteMultipartUpload = {
          DaysAfterInitiation: parseInt(value.abortDays, 10),
        }
      }

      onSubmit(newRule)
    },
  })

  const hasExpirationValue = useStore(form.store, (state) => state.values.hasExpiration)
  const hasNoncurrentExpirationValue = useStore(form.store, (state) => state.values.hasNoncurrentExpiration)
  const hasAbortUploadValue = useStore(form.store, (state) => state.values.hasAbortUpload)
  const expirationDaysValue = useStore(form.store, (state) => state.values.expirationDays)
  const noncurrentDaysValue = useStore(form.store, (state) => state.values.noncurrentDays)
  const abortDaysValue = useStore(form.store, (state) => state.values.abortDays)
  const tagsValue = useStore(form.store, (state) => state.values.tags)
  const statusValue = useStore(form.store, (state) => state.values.Status)
  const prefixValue = useStore(form.store, (state) => state.values.Prefix)

  const willExpireWholeBucket =
    hasExpirationValue && !prefixValue.trim() && tagsValue.length === 0 && statusValue === "Enabled"

  const canSubmit = () => {
    const values = form.state.values
    const hasAtLeastOneAction =
      values.hasExpiration ||
      values.hasNoncurrentExpiration ||
      values.hasAbortUpload ||
      (editingRule?.Transitions !== undefined && editingRule.Transitions.length > 0) ||
      (editingRule?.NoncurrentVersionTransitions !== undefined && editingRule.NoncurrentVersionTransitions.length > 0)

    if (!hasAtLeastOneAction) return false

    // If expiration is checked, must have days OR we're preserving non-Days expiration from editing
    if (values.hasExpiration) {
      const hasExpirationDays = values.expirationDays.trim() !== ""
      const hasNonDaysExpiration = editingRule?.Expiration && !editingRule.Expiration.Days
      if (!hasExpirationDays && !hasNonDaysExpiration) return false
    }

    // If noncurrent expiration is checked, must have days
    if (values.hasNoncurrentExpiration && values.noncurrentDays.trim() === "") return false

    // If abort is checked, must have days
    if (values.hasAbortUpload && values.abortDays.trim() === "") return false

    if (values.hasAbortUpload && values.tags.length > 0) return false

    return true
  }

  // Notify parent about validation state changes
  useEffect(() => {
    onValidationChange?.(canSubmit())
  }, [
    hasExpirationValue,
    hasNoncurrentExpirationValue,
    hasAbortUploadValue,
    expirationDaysValue,
    noncurrentDaysValue,
    abortDaysValue,
    tagsValue,
    onValidationChange,
  ])

  // Tag editor state
  const [newTagKey, setNewTagKey] = useState("")
  const [newTagValue, setNewTagValue] = useState("")
  const [tagError, setTagError] = useState<string | undefined>()

  return (
    <Form
      id={formId}
      role="form"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <Stack direction="vertical" gap="6">
        {/* Rule ID */}
        <form.Field name="ID">
          {(field) => (
            <TextInput
              label={t`Rule ID`}
              id={field.name}
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder={t`e.g. my-lifecycle-rule`}
              helptext={t`Optional unique identifier for the rule (max 255 characters)`}
            />
          )}
        </form.Field>

        {/* Scope section - Filter by prefix and/or tags */}
        <div>
          <h4 className="text-theme-high mb-4 text-sm font-semibold">
            <Trans>Scope</Trans>
          </h4>
          <Stack direction="vertical" gap="4">
            <form.Field name="Prefix">
              {(field) => (
                <TextInput
                  label={t`Prefix Filter (optional)`}
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder={t`e.g. logs/`}
                  helptext={t`Apply this rule only to objects with this prefix (leave empty for all objects)`}
                />
              )}
            </form.Field>

            {/* Actions section */}
            <div>
              <h4 className="text-theme-high mb-4 text-sm font-semibold">
                <Trans>Actions</Trans>
              </h4>
              <Stack direction="vertical" gap="4">
                {/* Read-only notice for Transitions */}
                {editingRule?.Transitions && editingRule.Transitions.length > 0 && (
                  <Message variant="info" title={t`Storage Class Transitions (read-only)`}>
                    <Trans>
                      This rule has storage-class transitions that were configured outside Aurora. They are preserved
                      unchanged when you save this rule.
                    </Trans>
                  </Message>
                )}

                {/* Read-only notice for NoncurrentVersionTransitions */}
                {editingRule?.NoncurrentVersionTransitions && editingRule.NoncurrentVersionTransitions.length > 0 && (
                  <Message variant="info" title={t`Noncurrent Version Transitions (Read-Only)`}>
                    <Trans>
                      This rule has {editingRule.NoncurrentVersionTransitions.length} noncurrent version transition(s)
                      configured. Transitions cannot be edited in this UI. Changing other fields will preserve the
                      existing transitions.
                    </Trans>
                  </Message>
                )}

                {/* Expiration action */}
                <div>
                  <form.Field name="hasExpiration">
                    {(field) => (
                      <Checkbox
                        id={field.name}
                        name={field.name}
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        label={t`Expire Objects`}
                        helptext={t`Permanently delete objects after a specified time`}
                      />
                    )}
                  </form.Field>

                  {hasExpirationValue && (
                    <div className="mt-2 ml-6">
                      <form.Field name="expirationDays">
                        {(field) => (
                          <TextInput
                            label={t`Expiration Days`}
                            id={field.name}
                            name={field.name}
                            type="number"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="30"
                            min="1"
                            helptext={
                              editingRule?.Expiration && !editingRule.Expiration.Days
                                ? t`This rule uses Date or ExpiredObjectDeleteMarker expiration. Leave empty to preserve it, or enter days to switch to Days expiration.`
                                : t`Delete objects after this many days`
                            }
                            required={!editingRule?.Expiration || editingRule.Expiration.Days !== undefined}
                          />
                        )}
                      </form.Field>
                    </div>
                  )}
                </div>

                {/* Noncurrent version expiration action */}
                <div>
                  <form.Field name="hasNoncurrentExpiration">
                    {(field) => (
                      <Checkbox
                        id={field.name}
                        name={field.name}
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        label={t`Expire Noncurrent Versions`}
                        helptext={t`Delete older versions of objects after they become noncurrent`}
                      />
                    )}
                  </form.Field>

                  {hasNoncurrentExpirationValue && (
                    <div className="mt-2 ml-6">
                      <form.Field name="noncurrentDays">
                        {(field) => (
                          <TextInput
                            label={t`Noncurrent Days`}
                            id={field.name}
                            name={field.name}
                            type="number"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="90"
                            min="1"
                            helptext={t`Delete noncurrent versions after this many days (requires versioning enabled)`}
                            required={true}
                          />
                        )}
                      </form.Field>
                    </div>
                  )}
                </div>

                {/* Abort incomplete multipart upload action */}
                <div>
                  <form.Field name="hasAbortUpload">
                    {(field) => (
                      <Checkbox
                        id={field.name}
                        name={field.name}
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        label={t`Abort Incomplete Multipart Uploads`}
                        disabled={tagsValue.length > 0}
                        helptext={
                          tagsValue.length > 0
                            ? t`Can not be combined with Tag Filters`
                            : t`Clean up abandoned multipart uploads`
                        }
                      />
                    )}
                  </form.Field>

                  {hasAbortUploadValue && (
                    <div className="mt-2 ml-6">
                      <form.Field name="abortDays">
                        {(field) => (
                          <TextInput
                            label={t`Abort After Days`}
                            id={field.name}
                            name={field.name}
                            type="number"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="7"
                            min="1"
                            helptext={t`Abort incomplete multipart uploads after this many days`}
                            required={true}
                          />
                        )}
                      </form.Field>
                    </div>
                  )}
                </div>
              </Stack>
            </div>

            {/* Tag editor */}
            <form.Field name="tags">
              {(field) => {
                const addTag = () => {
                  const key = newTagKey.trim()
                  const value = newTagValue.trim()

                  if (!key || !value) return

                  if (field.state.value.some((tag) => tag.Key === key)) {
                    setTagError(t`A tag with this key already exists.`)
                    return
                  }

                  const currentTags = field.state.value
                  field.handleChange([...currentTags, { Key: key, Value: value }])
                  setNewTagKey("")
                  setNewTagValue("")
                  setTagError(undefined)
                }

                const removeTag = (index: number) => {
                  const currentTags = field.state.value
                  field.handleChange(currentTags.filter((_, i) => i !== index))
                }

                return (
                  <div>
                    <label className="juno-label juno-label-floating">
                      <Trans>Tags</Trans>
                    </label>
                    <div className="mt-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <TextInput
                            label={t`Key`}
                            value={newTagKey}
                            onChange={(e) => {
                              setNewTagKey(e.target.value)
                              setTagError(undefined)
                            }}
                            placeholder={t`e.g environment`}
                            invalid={!!tagError}
                            errortext={tagError}
                            disabled={hasAbortUploadValue}
                          />
                        </div>
                        <div className="flex-1">
                          <TextInput
                            label={t`Value`}
                            value={newTagValue}
                            onChange={(e) => setNewTagValue(e.target.value)}
                            placeholder={t`e.g production`}
                            disabled={hasAbortUploadValue}
                          />
                        </div>
                        <Button
                          onClick={addTag}
                          disabled={hasAbortUploadValue || !newTagKey.trim() || !newTagValue.trim()}
                        >
                          <Trans>Add</Trans>
                        </Button>
                      </div>
                      {field.state.value.length > 0 && (
                        <Stack gap="2" wrap={true} alignment="start" distribution="start" className="mt-2">
                          {field.state.value.map((tag, index) => (
                            <div key={`${tag.Key}-${tag.Value}-${index}`} className="max-w-full break-all">
                              <Pill
                                pillKey={tag.Key}
                                pillValue={tag.Value}
                                onClose={() => removeTag(index)}
                                closeable
                              />
                            </div>
                          ))}
                        </Stack>
                      )}
                    </div>
                    <p className="juno-helptext mt-1 text-xs" style={{ color: "#7a7a7a" }}>
                      {hasAbortUploadValue ? (
                        <Trans>Can not be combined with Abort Incomplete Multipart Uploads</Trans>
                      ) : (
                        <Trans>Apply this rule only to objects with specific tags</Trans>
                      )}
                    </p>
                  </div>
                )
              }}
            </form.Field>
          </Stack>
        </div>

        {/* Status */}
        <form.Field name="Status">
          {(field) => (
            <Checkbox
              id={field.name}
              name={field.name}
              checked={field.state.value === "Enabled"}
              onChange={(e) => field.handleChange(e.target.checked ? "Enabled" : "Disabled")}
              label={t`Enable Rule`}
              helptext={t`When enabled, this rule is actively applied to matching objects. Leave unchecked to save the rule without activating it.`}
            />
          )}
        </form.Field>

        {willExpireWholeBucket && (
          <Message variant="warning" title={t`Bucket expiration warning`}>
            <Trans>
              This rule has no prefix or tag filters, so it will expire all objects in the bucket. This can result in
              permanent data loss.
            </Trans>
          </Message>
        )}
      </Stack>
    </Form>
  )
}
