import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Form,
  Stack,
  TextInput,
  Button,
  Select,
  SelectOption,
  Checkbox,
  Message,
} from "@cloudoperators/juno-ui-components"
import type { LifecycleRuleRead, LifecycleTag } from "@/server/Storage/types/ceph"
import { normalizeFilter } from "@/server/Storage/helpers/lifecycleMapper"
import { useState } from "react"

interface LifecycleRuleFormProps {
  editingRule: LifecycleRuleRead | null
  onSubmit: (rule: LifecycleRuleRead) => void
  onCancel: () => void
}

const STATUS_OPTIONS = ["Enabled", "Disabled"] as const

export const LifecycleRuleForm = ({ editingRule, onSubmit, onCancel }: LifecycleRuleFormProps) => {
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

  const [tags, setTags] = useState<LifecycleTag[]>(getInitialValues().tags)
  const [newTagKey, setNewTagKey] = useState("")
  const [newTagValue, setNewTagValue] = useState("")

  const form = useForm({
    defaultValues: getInitialValues(),
    onSubmit: async ({ value }) => {
      // Start from the existing rule if editing (preserves Transitions, NoncurrentVersionTransitions, etc.)
      const newRule: LifecycleRuleRead = editingRule ? { ...editingRule } : ({} as LifecycleRuleRead)

      // Update basic fields
      newRule.ID = value.ID || undefined
      newRule.Status = value.Status

      // Build filter from prefix + tags using normalizeFilter from lifecycleMapper (item 6 fix)
      newRule.Filter = normalizeFilter(value.Prefix || undefined, tags.length > 0 ? tags : undefined)

      // Clear legacy Prefix field whenever Filter is set (item 23 fix - one-way migration)
      newRule.Prefix = undefined

      // Update only the actions that are enabled
      // Item 24 fix: Only overwrite Expiration if user is actively changing it
      // (has checkbox checked AND has entered days, OR has unchecked the checkbox)
      if (value.hasExpiration && value.expirationDays) {
        // User is setting a Days-based expiration
        newRule.Expiration = { Days: parseInt(value.expirationDays, 10) }
      } else if (!value.hasExpiration) {
        // User unchecked the expiration checkbox - clear it
        newRule.Expiration = undefined
      }
      // else: hasExpiration is true but expirationDays is empty - preserve original
      // (the rule had Date/ExpiredObjectDeleteMarker, user didn't change it)

      if (value.hasNoncurrentExpiration && value.noncurrentDays) {
        newRule.NoncurrentVersionExpiration = {
          NoncurrentDays: parseInt(value.noncurrentDays, 10),
        }
      } else if (!value.hasNoncurrentExpiration) {
        newRule.NoncurrentVersionExpiration = undefined
      }

      if (value.hasAbortUpload && value.abortDays) {
        newRule.AbortIncompleteMultipartUpload = {
          DaysAfterInitiation: parseInt(value.abortDays, 10),
        }
      } else if (!value.hasAbortUpload) {
        newRule.AbortIncompleteMultipartUpload = undefined
      }

      // Transitions and NoncurrentVersionTransitions are preserved from editingRule
      // (never authored in the UI, only preserved)

      onSubmit(newRule)
    },
  })

  const hasExpirationValue = useStore(form.store, (state) => state.values.hasExpiration)
  const hasNoncurrentExpirationValue = useStore(form.store, (state) => state.values.hasNoncurrentExpiration)
  const hasAbortUploadValue = useStore(form.store, (state) => state.values.hasAbortUpload)
  const expirationDaysValue = useStore(form.store, (state) => state.values.expirationDays)
  const noncurrentDaysValue = useStore(form.store, (state) => state.values.noncurrentDays)
  const abortDaysValue = useStore(form.store, (state) => state.values.abortDays)

  // Validate that at least one action is enabled and has valid data
  const canSubmit = () => {
    let hasAtLeastOneAction = false

    if (hasExpirationValue) {
      // Item 24 fix: Only require expirationDays if user is defining a NEW Days-based expiration
      // If editing a rule with Date/ExpiredObjectDeleteMarker, allow saving without Days filled
      const hasExistingNonDaysExpiration =
        editingRule?.Expiration &&
        !editingRule.Expiration.Days &&
        (editingRule.Expiration.Date || editingRule.Expiration.ExpiredObjectDeleteMarker)

      if (expirationDaysValue.length > 0) {
        // User entered days - validate they're positive
        if (parseInt(expirationDaysValue, 10) <= 0) {
          return false
        }
        hasAtLeastOneAction = true
      } else if (hasExistingNonDaysExpiration) {
        // No days entered, but rule has existing Date/ExpiredObjectDeleteMarker - that counts
        hasAtLeastOneAction = true
      } else {
        // No days entered and no existing non-Days expiration - invalid
        return false
      }
    }

    if (hasNoncurrentExpirationValue) {
      if (noncurrentDaysValue.length === 0 || parseInt(noncurrentDaysValue, 10) <= 0) {
        return false
      }
      hasAtLeastOneAction = true
    }

    if (hasAbortUploadValue) {
      if (abortDaysValue.length === 0 || parseInt(abortDaysValue, 10) <= 0) {
        return false
      }
      hasAtLeastOneAction = true
    }

    // If editing, preserve existing actions (Transitions, etc.) - they count as actions
    if (editingRule) {
      if (editingRule.Transitions || editingRule.NoncurrentVersionTransitions) {
        hasAtLeastOneAction = true
      }
    }

    return hasAtLeastOneAction
  }

  const handleAddTag = () => {
    if (newTagKey.trim()) {
      setTags([...tags, { Key: newTagKey.trim(), Value: newTagValue.trim() }])
      setNewTagKey("")
      setNewTagValue("")
    }
  }

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  // Render read-only summary of Transitions/NoncurrentVersionTransitions if present
  const hasTransitions = editingRule && (editingRule.Transitions || editingRule.NoncurrentVersionTransitions)

  return (
    <div>
      <h3 className="text-theme-high mb-6 text-base font-semibold">
        {editingRule ? <Trans>Edit Lifecycle Rule</Trans> : <Trans>Add New Lifecycle Rule</Trans>}
      </h3>
      <Form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <Stack direction="vertical" gap="4">
          <form.Field name="ID">
            {(field) => (
              <TextInput
                label={t`Rule ID (optional)`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={t`delete-old-logs`}
                helptext={t`A unique identifier for this rule (optional, max 255 characters)`}
              />
            )}
          </form.Field>

          <form.Field name="Status">
            {(field) => (
              <Select
                label={t`Status`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(value) => field.handleChange(value as "Enabled" | "Disabled")}
                helptext={t`Whether this rule is active`}
                required={true}
              >
                {STATUS_OPTIONS.map((status) => (
                  <SelectOption key={status} value={status} label={status} />
                ))}
              </Select>
            )}
          </form.Field>

          <form.Field name="Prefix">
            {(field) => (
              <TextInput
                label={t`Prefix Filter (optional)`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={t`logs/`}
                helptext={t`Apply this rule only to objects with this key prefix (e.g., "logs/" or "archive/")`}
              />
            )}
          </form.Field>

          {/* Tag editor */}
          <div>
            <label className="juno-label text-theme-high mb-2 block text-sm font-bold">
              <Trans>Tag Filters (optional)</Trans>
            </label>
            <p className="text-theme-light mb-3 text-sm">
              <Trans>Apply this rule only to objects with specific tags</Trans>
            </p>

            {tags.length > 0 && (
              <div className="mb-3 space-y-2">
                {tags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-theme-default flex-1 text-sm">
                      {tag.Key}={tag.Value}
                    </span>
                    <Button size="small" variant="subdued" onClick={() => handleRemoveTag(index)}>
                      <Trans>Remove</Trans>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <TextInput
                label={t`Key`}
                value={newTagKey}
                onChange={(e) => setNewTagKey(e.target.value)}
                placeholder={t`Environment`}
                className="flex-1"
              />
              <TextInput
                label={t`Value`}
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                placeholder={t`production`}
                className="flex-1"
              />
              <div className="flex items-end">
                <Button variant="subdued" onClick={handleAddTag} disabled={!newTagKey.trim()}>
                  <Trans>Add Tag</Trans>
                </Button>
              </div>
            </div>
          </div>

          {hasTransitions && (
            <Message variant="info" title={t`Storage Class Transitions (read-only)`}>
              <Trans>
                This rule has storage-class transitions that were configured outside Aurora. They are preserved
                unchanged when you save this rule.
              </Trans>
            </Message>
          )}

          {/* Actions section - independent toggles */}
          <div>
            <label className="juno-label text-theme-high mb-2 block text-sm font-bold">
              <Trans>Actions</Trans>
            </label>
            <p className="text-theme-light mb-3 text-sm">
              <Trans>Select one or more actions for this rule</Trans>
            </p>

            <Stack direction="vertical" gap="4">
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
                      helptext={t`Delete objects after a certain number of days`}
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
                          placeholder={t`30`}
                          min="1"
                          helptext={t`Delete objects after this many days from creation`}
                          required={true}
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
                      helptext={t`Delete old versions in versioned buckets`}
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
                          placeholder={t`90`}
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
                      helptext={t`Clean up abandoned multipart uploads`}
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
                          placeholder={t`7`}
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

          <div className="border-theme-default flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="subdued" onClick={onCancel}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit()}>
              <Trans>Save Rule</Trans>
            </Button>
          </div>
        </Stack>
      </Form>
    </div>
  )
}
