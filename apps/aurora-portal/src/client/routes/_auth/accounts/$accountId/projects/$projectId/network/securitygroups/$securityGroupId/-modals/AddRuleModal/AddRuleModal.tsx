import React, { useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useForm } from "@tanstack/react-form"
import {
  Modal,
  Form,
  FormSection,
  Button,
  ButtonRow,
  Spinner,
  ModalFooter,
  Message,
} from "@cloudoperators/juno-ui-components"
import type { CreateSecurityGroupRuleInput } from "@/server/Network/types/securityGroup"
import { createRuleFormSchema } from "./validation/formSchema"
import { DEFAULT_VALUES } from "./types"
import { CUSTOM_TCP_RULE, CUSTOM_UDP_RULE, OTHER_PROTOCOL_RULE } from "./constants"
import { RULE_PRESETS } from "./rulePresets"
import { RuleTypeSection } from "./sections/RuleTypeSection"
import { DirectionSection, EthertypeSection } from "./sections/DirectionEthertypeSection"
import { ProtocolSection } from "./sections/ProtocolSection"
import { PortRangeSection } from "./sections/PortRangeSection"
import { IcmpSection } from "./sections/IcmpSection"
import { RemoteSourceSection } from "./sections/RemoteSourceSection"
import { DescriptionSection } from "./sections/DescriptionSection"

interface AddRuleModalProps {
  securityGroupId: string
  open: boolean
  onClose: () => void
  onCreate: (ruleData: CreateSecurityGroupRuleInput) => Promise<void>
  isLoading?: boolean
  error?: string | null
  availableSecurityGroups?: Array<{ id: string; name: string | null }>
}

/**
 * Helper function for TypeScript type inference.
 * This function is never called at runtime - it exists purely to help TypeScript
 * infer the return type of useForm for use in child components.
 * Note: Must include validators to match the actual form's type signature.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createFormTypeHelper() {
  return useForm({
    defaultValues: DEFAULT_VALUES,
    validators: {
      onSubmit: createRuleFormSchema,
    },
    onSubmit: async () => {
      // Dummy implementation for type inference only
    },
  })
}

/**
 * Type for the TanStack Form instance used in this modal.
 * Inferred from the helper function above.
 */
export type AddRuleFormApi = ReturnType<typeof createFormTypeHelper>

export const AddRuleModal: React.FC<AddRuleModalProps> = ({
  securityGroupId,
  open,
  onClose,
  onCreate,
  isLoading = false,
  error = null,
  availableSecurityGroups = [],
}) => {
  const { t } = useLingui()

  // Initialize TanStack Form
  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    validators: {
      onSubmit: createRuleFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (isLoading) {
        return
      }

      // Build API payload from form values
      const payload: CreateSecurityGroupRuleInput = {
        security_group_id: securityGroupId,
        direction: value.direction,
        ethertype: value.ethertype,
        description: value.description || undefined,
        protocol: value.protocol || null,
      }

      // Add port range for TCP/UDP protocols
      const isTcpUdp = value.protocol === "tcp" || value.protocol === "udp"
      if (isTcpUdp) {
        if (value.portFrom) {
          const portFrom = parseInt(value.portFrom, 10)
          payload.port_range_min = portFrom

          if (value.portTo) {
            // Range: both portFrom and portTo are provided
            payload.port_range_max = parseInt(value.portTo, 10)
          } else {
            // Single port: only portFrom is provided
            payload.port_range_max = portFrom
          }
        }
      }

      // Add ICMP type/code (maps to port_range_min/max)
      const isIcmp = value.protocol === "icmp" || value.protocol === "ipv6-icmp"
      if (isIcmp) {
        if (value.icmpType) {
          payload.port_range_min = parseInt(value.icmpType, 10)
        }
        if (value.icmpCode) {
          payload.port_range_max = parseInt(value.icmpCode, 10)
        }
      }

      // Add remote source
      if (value.remoteSourceType === "cidr" && value.remoteCidr) {
        payload.remote_ip_prefix = value.remoteCidr
      } else if (value.remoteSourceType === "security_group" && value.remoteSecurityGroupId) {
        payload.remote_group_id = value.remoteSecurityGroupId
      }

      try {
        await onCreate(payload)
        handleClose()
      } catch (err) {
        // Error is already handled by the parent component
        console.error("Failed to create rule:", err)
      }
    },
  })

  // Type alias for form state to use in Subscribe callbacks
  type FormStateType = typeof form.store.state

  const handleClose = () => {
    form.reset()
    onClose()
  }

  // Sync preset values to form fields when ruleType changes
  useEffect(() => {
    let previousRuleType = form.store.state.values.ruleType

    const subscription = form.store.subscribe(() => {
      const state = form.store.state
      const currentRuleType = state.values.ruleType

      // Only run when ruleType actually changes
      if (currentRuleType === previousRuleType) {
        return
      }
      previousRuleType = currentRuleType

      const selectedPreset = RULE_PRESETS.find((p) => p.value === currentRuleType)
      if (!selectedPreset) return

      // Update protocol field
      form.setFieldValue("protocol", selectedPreset.protocol)

      // For TCP/UDP presets: update port fields
      if (selectedPreset.protocol === "tcp" || selectedPreset.protocol === "udp") {
        if (selectedPreset.portRangeMin !== null && selectedPreset.portRangeMax !== null) {
          // Preset has predefined ports (e.g., HTTP = 80)
          form.setFieldValue("portFrom", String(selectedPreset.portRangeMin))
          form.setFieldValue("portTo", String(selectedPreset.portRangeMax))
        } else {
          // Custom rule - clear ports so user can enter them
          form.setFieldValue("portFrom", "")
          form.setFieldValue("portTo", "")
        }
      } else {
        // Non-TCP/UDP protocols: clear port fields
        form.setFieldValue("portFrom", "")
        form.setFieldValue("portTo", "")
      }

      // Clear ICMP fields for non-ICMP protocols
      if (selectedPreset.protocol !== "icmp" && selectedPreset.protocol !== "ipv6-icmp") {
        form.setFieldValue("icmpType", "")
        form.setFieldValue("icmpCode", "")
      }
    })

    return () => subscription.unsubscribe()
  }, [form])

  // Auto-set ethertype to IPv4 when remote source is NOT security group
  useEffect(() => {
    let previousRemoteSourceType = form.store.state.values.remoteSourceType

    const subscription = form.store.subscribe(() => {
      const state = form.store.state
      const currentRemoteSourceType = state.values.remoteSourceType

      // Only run when remoteSourceType actually changes
      if (currentRemoteSourceType === previousRemoteSourceType) {
        return
      }
      previousRemoteSourceType = currentRemoteSourceType

      if (currentRemoteSourceType !== "security_group") {
        form.setFieldValue("ethertype", "IPv4")
      }
    })

    return () => subscription.unsubscribe()
  }, [form])

  return (
    <Modal
      key={securityGroupId} // Remount modal when security group changes to reset form
      open={open}
      onCancel={handleClose}
      size="large"
      title={t`Add Security Group Rule`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <form.Subscribe selector={({ isSubmitting }) => ({ isSubmitting })}>
            {({ isSubmitting }: { isSubmitting: boolean }) => (
              <ButtonRow>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => form.handleSubmit()}
                  disabled={isLoading || isSubmitting}
                  data-testid="add-rule-button"
                >
                  {isSubmitting || isLoading ? <Spinner size="small" /> : <Trans>Add Rule</Trans>}
                </Button>
                <Button variant="default" onClick={handleClose} disabled={isLoading || isSubmitting}>
                  <Trans>Cancel</Trans>
                </Button>
              </ButtonRow>
            )}
          </form.Subscribe>
        </ModalFooter>
      }
    >
      {/* Error Message */}
      {error && (
        <Message dismissible={false} variant="error" className="mb-4">
          {error}
        </Message>
      )}

      {isLoading && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-theme-secondary text-sm">
            <Trans>Creating security group rule...</Trans>
          </span>
        </div>
      )}

      <Form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FormSection className="mb-6">
          {/* Rule Type Preset */}
          <RuleTypeSection form={form} disabled={isLoading} />

          {/* Direction */}
          <DirectionSection form={form} disabled={isLoading} />

          {/* Protocol (conditional for "Other Protocol") */}
          <form.Subscribe>
            {(state: FormStateType) =>
              state.values.ruleType === OTHER_PROTOCOL_RULE && <ProtocolSection form={form} disabled={isLoading} />
            }
          </form.Subscribe>

          {/* Port Range (conditional for Custom TCP/UDP) */}
          <form.Subscribe>
            {(state: FormStateType) => {
              const isTcpUdp = state.values.protocol === "tcp" || state.values.protocol === "udp"
              const showPortFields = isTcpUdp && [CUSTOM_TCP_RULE, CUSTOM_UDP_RULE].includes(state.values.ruleType)
              return showPortFields && <PortRangeSection form={form} disabled={isLoading} />
            }}
          </form.Subscribe>

          {/* ICMP Fields (conditional for ICMP protocols) */}
          <form.Subscribe>
            {(state: FormStateType) => {
              const showIcmpFields = state.values.protocol === "icmp" || state.values.protocol === "ipv6-icmp"
              return showIcmpFields && <IcmpSection form={form} disabled={isLoading} />
            }}
          </form.Subscribe>

          {/* Remote Source (CIDR or Security Group) */}
          <RemoteSourceSection form={form} disabled={isLoading} availableSecurityGroups={availableSecurityGroups} />

          {/* Ethertype (conditional for Security Group remote source) */}
          <form.Subscribe>
            {(state: FormStateType) =>
              state.values.remoteSourceType === "security_group" && <EthertypeSection form={form} disabled={isLoading} />
            }
          </form.Subscribe>

          {/* Description */}
          <DescriptionSection form={form} disabled={isLoading} />
        </FormSection>
      </Form>
    </Modal>
  )
}
