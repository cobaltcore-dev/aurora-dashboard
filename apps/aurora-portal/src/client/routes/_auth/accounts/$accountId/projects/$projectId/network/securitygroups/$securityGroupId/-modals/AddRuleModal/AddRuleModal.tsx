import React from "react"
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
        // Initialize remote fields as undefined (will be set below if applicable)
        remote_ip_prefix: undefined,
        remote_group_id: undefined,
        remote_address_group_id: undefined,
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

      await onCreate(payload)
      handleClose()
    },
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="large"
      title={t`Add Security Group Rule`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <form.Subscribe>
            {(state: { isSubmitting: boolean }) => (
              <ButtonRow>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => form.handleSubmit()}
                  disabled={isLoading || state.isSubmitting}
                  data-testid="add-rule-button"
                >
                  {state.isSubmitting || isLoading ? <Spinner size="small" /> : <Trans>Add Rule</Trans>}
                </Button>
                <Button variant="default" onClick={handleClose} disabled={isLoading || state.isSubmitting}>
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
            {(state: { values: { ruleType: string } }) =>
              state.values.ruleType === OTHER_PROTOCOL_RULE && <ProtocolSection form={form} disabled={isLoading} />
            }
          </form.Subscribe>

          {/* Port Range (conditional for Custom TCP/UDP) */}
          <form.Subscribe>
            {(state: { values: { protocol: string | null; ruleType: string } }) => {
              const isTcpUdp = state.values.protocol === "tcp" || state.values.protocol === "udp"
              const showPortFields = isTcpUdp && [CUSTOM_TCP_RULE, CUSTOM_UDP_RULE].includes(state.values.ruleType)
              return showPortFields && <PortRangeSection form={form} disabled={isLoading} />
            }}
          </form.Subscribe>

          {/* ICMP Fields (conditional for ICMP protocols) */}
          <form.Subscribe>
            {(state: { values: { protocol: string | null } }) => {
              const showIcmpFields = state.values.protocol === "icmp" || state.values.protocol === "ipv6-icmp"
              return showIcmpFields && <IcmpSection form={form} disabled={isLoading} />
            }}
          </form.Subscribe>

          {/* Remote Source (CIDR or Security Group) */}
          <RemoteSourceSection form={form} disabled={isLoading} availableSecurityGroups={availableSecurityGroups} />

          {/* Ethertype (conditional for Security Group remote source) */}
          <form.Subscribe>
            {(state: { values: { remoteSourceType: "cidr" | "security_group" } }) =>
              state.values.remoteSourceType === "security_group" && (
                <EthertypeSection form={form} disabled={isLoading} />
              )
            }
          </form.Subscribe>

          {/* Description */}
          <DescriptionSection form={form} disabled={isLoading} />
        </FormSection>
      </Form>
    </Modal>
  )
}
