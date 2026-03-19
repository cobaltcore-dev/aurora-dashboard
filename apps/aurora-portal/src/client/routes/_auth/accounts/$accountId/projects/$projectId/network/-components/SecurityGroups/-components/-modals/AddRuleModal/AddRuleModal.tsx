import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
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
import { useAddRuleForm } from "./useAddRuleForm"
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

  const {
    formValues,
    errors,
    showPortFields,
    showIcmpFields,
    showProtocolInput,
    handleInputChange,
    handleRuleTypeChange,
    handleDirectionChange,
    handleEthertypeChange,
    handleProtocolChange,
    handleRemoteSourceTypeChange,
    handleRemoteSecurityGroupChange,
    handlePortModeChange,
    handleSubmit,
    handleClose,
  } = useAddRuleForm({
    open,
    securityGroupId,
    onCreate,
    onClose,
  })

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="large"
      title={t`Add Security Group Rule`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button
              variant="primary"
              onClick={(e) => {
                handleSubmit(e)
              }}
              disabled={isLoading}
              data-testid="add-rule-button"
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Add Rule</Trans>}
            </Button>
            <Button variant="default" onClick={handleClose} disabled={isLoading}>
              <Trans>Cancel</Trans>
            </Button>
          </ButtonRow>
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

      {!isLoading && (
        <Form className="mb-6">
          <FormSection className="mb-6">
            {/* Rule Type Preset */}
            <RuleTypeSection value={formValues.ruleType} onChange={handleRuleTypeChange} disabled={isLoading} />

            {/* Direction & Ethertype */}
            <DirectionEthertypeSection
              direction={formValues.direction}
              ethertype={formValues.ethertype}
              onDirectionChange={handleDirectionChange}
              onEthertypeChange={handleEthertypeChange}
              disabled={isLoading}
            />

            {/* Protocol (conditional for "Other Protocol") */}
            {showProtocolInput && (
              <ProtocolSection
                value={formValues.protocol}
                error={errors.protocol}
                onChange={handleProtocolChange}
                disabled={isLoading}
              />
            )}

            {/* Port Range (conditional for TCP/UDP) */}
            {showPortFields && (
              <PortRangeSection
                portMode={formValues.portMode}
                portSingle={formValues.portSingle}
                portRangeMin={formValues.portRangeMin}
                portRangeMax={formValues.portRangeMax}
                errors={{
                  portSingle: errors.portSingle,
                  portRangeMin: errors.portRangeMin,
                  portRangeMax: errors.portRangeMax,
                }}
                onPortModeChange={handlePortModeChange}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            )}

            {/* ICMP Fields (conditional for ICMP) */}
            {showIcmpFields && (
              <IcmpSection
                icmpType={formValues.icmpType}
                icmpCode={formValues.icmpCode}
                errors={{
                  icmpType: errors.icmpType,
                  icmpCode: errors.icmpCode,
                }}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            )}

            {/* Remote Source (CIDR or Security Group) */}
            <RemoteSourceSection
              remoteSourceType={formValues.remoteSourceType}
              remoteCidr={formValues.remoteCidr}
              remoteSecurityGroupId={formValues.remoteSecurityGroupId}
              ethertype={formValues.ethertype}
              errors={{ remoteCidr: errors.remoteCidr }}
              availableSecurityGroups={availableSecurityGroups}
              onRemoteSourceTypeChange={handleRemoteSourceTypeChange}
              onRemoteSecurityGroupChange={handleRemoteSecurityGroupChange}
              onInputChange={handleInputChange}
              disabled={isLoading}
            />

            {/* Description */}
            <DescriptionSection value={formValues.description} onChange={handleInputChange} disabled={isLoading} />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
