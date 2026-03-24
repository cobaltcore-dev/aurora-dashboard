import React, { useEffect, useMemo } from "react"
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
import { RULE_PRESETS } from "./rulePresets"
import { PORT_MIN, PORT_MAX, CUSTOM_TCP_RULE, CUSTOM_UDP_RULE, OTHER_PROTOCOL_RULE } from "./constants"
import { RuleTypeSection } from "./sections/RuleTypeSection"
import { DirectionEthertypeSection } from "./sections/DirectionEthertypeSection"
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
 * Note: Must match the actual useForm configuration (including validators) to ensure type compatibility.
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
        if (value.portMode === "single" && value.portSingle) {
          const port = parseInt(value.portSingle, 10)
          payload.port_range_min = port
          payload.port_range_max = port
        } else if (value.portMode === "range") {
          if (value.portRangeMin) {
            payload.port_range_min = parseInt(value.portRangeMin, 10)
          }
          if (value.portRangeMax) {
            payload.port_range_max = parseInt(value.portRangeMax, 10)
          }
        } else if (value.portMode === "all") {
          payload.port_range_min = PORT_MIN
          payload.port_range_max = PORT_MAX
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

  const handleClose = () => {
    form.reset()
    onClose()
  }

  // Preset auto-population: when user changes rule type to a preset, populate fields
  useEffect(() => {
    const subscription = form.store.subscribe(() => {
      const state = form.store.state
      const currentRuleType = state.values.ruleType

      if (currentRuleType && currentRuleType !== "custom") {
        const preset = RULE_PRESETS.find((p) => p.value === currentRuleType)
        if (preset) {
          // Only update if the values have actually changed to avoid infinite loops
          if (
            state.values.protocol !== preset.protocol ||
            state.values.portRangeMin !== (preset.portRangeMin?.toString() || "") ||
            state.values.portRangeMax !== (preset.portRangeMax?.toString() || "") ||
            state.values.description !== preset.description
          ) {
            form.setFieldValue("protocol", preset.protocol)
            form.setFieldValue("portRangeMin", preset.portRangeMin?.toString() || "")
            form.setFieldValue("portRangeMax", preset.portRangeMax?.toString() || "")
            form.setFieldValue("description", preset.description)
          }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form])

  // Access form values reactively for conditional field visibility
  const [ruleType, setRuleType] = React.useState(DEFAULT_VALUES.ruleType)
  const [protocol, setProtocol] = React.useState<string | null>(DEFAULT_VALUES.protocol)

  // Subscribe to form changes to update local state for conditional rendering
  useEffect(() => {
    const subscription = form.store.subscribe(() => {
      const state = form.store.state
      setRuleType(state.values.ruleType)
      setProtocol(state.values.protocol)
    })

    return () => subscription.unsubscribe()
  }, [form])

  // Determine which fields should be visible based on current form values
  const showPortFields = useMemo(() => {
    const isTcpUdp = protocol === "tcp" || protocol === "udp"
    return isTcpUdp && [CUSTOM_TCP_RULE, CUSTOM_UDP_RULE].includes(ruleType)
  }, [protocol, ruleType])

  const showIcmpFields = useMemo(() => {
    return protocol === "icmp" || protocol === "ipv6-icmp"
  }, [protocol])

  const showProtocolInput = useMemo(() => {
    return ruleType === OTHER_PROTOCOL_RULE
  }, [ruleType])

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
            {({ isSubmitting }) => (
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
          <span className="text-sm text-gray-600">
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

          {/* Direction & Ethertype */}
          <DirectionEthertypeSection form={form} disabled={isLoading} />

          {/* Protocol (conditional for "Other Protocol") */}
          {showProtocolInput && <ProtocolSection form={form} disabled={isLoading} />}

          {/* Port Range (conditional for TCP/UDP) */}
          {showPortFields && <PortRangeSection form={form} disabled={isLoading} />}

          {/* ICMP Fields (conditional for ICMP) */}
          {showIcmpFields && <IcmpSection form={form} disabled={isLoading} />}

          {/* Remote Source (CIDR or Security Group) */}
          <RemoteSourceSection form={form} disabled={isLoading} availableSecurityGroups={availableSecurityGroups} />

          {/* Description */}
          <DescriptionSection form={form} disabled={isLoading} />
        </FormSection>
      </Form>
    </Modal>
  )
}
