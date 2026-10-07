import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useForm, useStore } from "@tanstack/react-form"
import { Modal, Form, FormRow, FormSection, Message, Status } from "@cloudoperators/juno-ui-components"
import type { CreateSecurityGroupRuleInput } from "@/server/Network/types/securityGroup"
import { createRuleFormSchema } from "./validation/formSchema"
import { showAllRuleFieldErrors } from "./validation/fieldErrors"
import { detectCIDRFamily } from "./validation/validationHelpers"
import { DEFAULT_VALUES } from "./types"
import { CUSTOM_TCP_RULE, CUSTOM_UDP_RULE, OTHER_PROTOCOL_RULE, hasIcmpFields, normalizeProtocol } from "./constants"
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
  onCreate: (ruleData: Omit<CreateSecurityGroupRuleInput, "project_id">) => Promise<void>
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

      const ethertype =
        value.remoteSourceType === "cidr" ? (detectCIDRFamily(value.remoteCidr) ?? "IPv4") : value.ethertype

      const payload: Omit<CreateSecurityGroupRuleInput, "project_id"> = {
        security_group_id: securityGroupId,
        direction: value.direction,
        ethertype,
        description: value.description.trim() || undefined,
        protocol: normalizeProtocol(value.protocol),
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
      if (hasIcmpFields(value.ruleType, value.protocol)) {
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
      } catch {
        // Keep the modal open with the user's input; the parent passes the message via `error`
      }
    },
  })

  const isFormValid = useStore(form.store, (state) => createRuleFormSchema.safeParse(state.values).success)
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)

  const handleSubmit = () => {
    if (isLoading) {
      return
    }
    showAllRuleFieldErrors(form)
    form.handleSubmit()
  }

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
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Add Rule`}
      disableConfirmButton={!isFormValid || isLoading || isSubmitting}
      disableCancelButton={isLoading || isSubmitting}
      disableCloseButton={isLoading || isSubmitting}
    >
      {isLoading && <Status status="progress" title={t`Creating Security Group Rule...`} className="mt-0" />}

      {!isLoading && (
        <Form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {error && (
            <FormRow>
              <Message dismissible={false} variant="error" text={error} />
            </FormRow>
          )}

          <p className="mb-4">
            <Trans>
              Rules define which traffic is allowed to instances assigned to the security group. A security group rule
              consists of three main parts: Type, Port Range and Remote.
            </Trans>
          </p>

          <FormSection>
            {/* Rule Type Preset */}
            <RuleTypeSection form={form} disabled={isLoading} />

            {/* Show other fields only when rule type is selected */}
            <form.Subscribe>
              {(state: {
                values: { ruleType: string; protocol: string | null; remoteSourceType: "cidr" | "security_group" }
              }) => {
                const isRuleTypeSelected = Boolean(state.values.ruleType)

                if (!isRuleTypeSelected) {
                  return null
                }

                const isTcpUdp = state.values.protocol === "tcp" || state.values.protocol === "udp"
                // TCP/UDP presets show their ports read-only; only custom TCP/UDP rules let the user set them
                const showPortFields = isTcpUdp && state.values.ruleType !== OTHER_PROTOCOL_RULE
                const arePortsEditable = [CUSTOM_TCP_RULE, CUSTOM_UDP_RULE].includes(state.values.ruleType)
                const showIcmpFields = hasIcmpFields(state.values.ruleType, state.values.protocol)

                return (
                  <>
                    {/* Direction */}
                    <DirectionSection form={form} disabled={isLoading} />

                    {/* Protocol (conditional for "Other Protocol") */}
                    {state.values.ruleType === OTHER_PROTOCOL_RULE && (
                      <ProtocolSection form={form} disabled={isLoading} />
                    )}

                    {/* Port Range (conditional for TCP/UDP rule types; editable for Custom TCP/UDP only) */}
                    {showPortFields && (
                      <PortRangeSection form={form} disabled={isLoading} readOnly={!arePortsEditable} />
                    )}

                    {/* ICMP Fields (conditional for Custom ICMP, or Other Protocol with an ICMP protocol) */}
                    {showIcmpFields && <IcmpSection form={form} disabled={isLoading} />}

                    {/* Remote Source (CIDR or Security Group) */}
                    <RemoteSourceSection
                      form={form}
                      disabled={isLoading}
                      availableSecurityGroups={availableSecurityGroups}
                    />

                    {/* Ethertype (Security Group remote only; a CIDR remote implies it) */}
                    {state.values.remoteSourceType === "security_group" && (
                      <EthertypeSection form={form} disabled={isLoading} />
                    )}

                    {/* Description */}
                    <DescriptionSection form={form} disabled={isLoading} />
                  </>
                )
              }}
            </form.Subscribe>
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
