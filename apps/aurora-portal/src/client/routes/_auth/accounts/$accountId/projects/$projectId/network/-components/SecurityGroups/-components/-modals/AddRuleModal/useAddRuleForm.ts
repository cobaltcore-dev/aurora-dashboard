import { useState, useEffect, useMemo } from "react"
import { useLingui } from "@lingui/react/macro"
import type { CreateSecurityGroupRuleInput } from "@/server/Network/types/securityGroup"
import {
  isValidCIDR,
  detectCIDRFamily,
  validatePortRange,
  validateIcmpTypeCode,
} from "@/server/Network/types/securityGroup"
import { RULE_PRESETS } from "./rulePresets"
import { DEFAULT_VALUES, type AddRuleFormValues } from "./types"
import {
  DEFAULT_IPV4_CIDR,
  DEFAULT_IPV6_CIDR,
  CUSTOM_TCP_RULE,
  CUSTOM_UDP_RULE,
  OTHER_PROTOCOL_RULE,
  PORT_MIN,
  PORT_MAX,
  ICMP_MIN,
  ICMP_MAX,
  PORT_MODE_SINGLE,
  PORT_MODE_RANGE,
  PORT_MODE_ALL,
} from "./constants"

interface UseAddRuleFormParams {
  open: boolean
  securityGroupId: string
  onCreate: (ruleData: CreateSecurityGroupRuleInput) => Promise<void>
  onClose: () => void
}

export function useAddRuleForm({ open, securityGroupId, onCreate, onClose }: UseAddRuleFormParams) {
  const { t } = useLingui()
  const [formValues, setFormValues] = useState<AddRuleFormValues>({ ...DEFAULT_VALUES })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormValues({ ...DEFAULT_VALUES })
      setErrors({})
    }
  }, [open])

  // Auto-populate fields based on preset selection
  useEffect(() => {
    if (formValues.ruleType && formValues.ruleType !== "custom") {
      const preset = RULE_PRESETS.find((p) => p.value === formValues.ruleType)
      if (preset) {
        setFormValues((prev) => ({
          ...prev,
          protocol: preset.protocol,
          portRangeMin: preset.portRangeMin?.toString() || "",
          portRangeMax: preset.portRangeMax?.toString() || "",
          description: preset.description,
        }))
      }
    }
  }, [formValues.ruleType])

  // Determine field visibility
  const isTcpUdpProtocol = formValues.protocol === "tcp" || formValues.protocol === "udp"
  const isIcmpProtocol = formValues.protocol === "icmp" || formValues.protocol === "ipv6-icmp"

  const showPortFields = useMemo(() => {
    return isTcpUdpProtocol && [CUSTOM_TCP_RULE, CUSTOM_UDP_RULE].includes(formValues.ruleType)
  }, [isTcpUdpProtocol, formValues.ruleType])

  const showIcmpFields = useMemo(() => {
    return isIcmpProtocol
  }, [isIcmpProtocol])

  const showProtocolInput = useMemo(() => {
    return formValues.ruleType === OTHER_PROTOCOL_RULE
  }, [formValues.ruleType])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when user modifies field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle select changes
  const handleRuleTypeChange = (value: string | number | string[] | undefined) => {
    setFormValues((prev) => ({
      ...prev,
      ruleType: String(value || "ssh"),
    }))
  }

  const handleDirectionChange = (value: string | number | string[] | undefined) => {
    setFormValues((prev) => ({
      ...prev,
      direction: String(value) as "ingress" | "egress",
    }))
  }

  const handleEthertypeChange = (value: string | number | string[] | undefined) => {
    const newEthertype = String(value) as "IPv4" | "IPv6"
    setFormValues((prev) => ({
      ...prev,
      ethertype: newEthertype,
      // Update CIDR placeholder based on ethertype
      remoteCidr:
        prev.remoteCidr === DEFAULT_IPV4_CIDR || prev.remoteCidr === DEFAULT_IPV6_CIDR || prev.remoteCidr === ""
          ? newEthertype === "IPv4"
            ? DEFAULT_IPV4_CIDR
            : DEFAULT_IPV6_CIDR
          : prev.remoteCidr,
    }))
  }

  const handleProtocolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({
      ...prev,
      protocol: e.target.value || null,
      // Reset protocol-specific fields
      portRangeMin: "",
      portRangeMax: "",
      icmpType: "",
      icmpCode: "",
    }))

    // Clear errors for reset fields
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.portRangeMin
      delete newErrors.portRangeMax
      delete newErrors.icmpType
      delete newErrors.icmpCode
      return newErrors
    })
  }

  const handleRemoteSourceTypeChange = (value: string | number | string[] | undefined) => {
    setFormValues((prev) => ({
      ...prev,
      remoteSourceType: String(value) as "cidr" | "security_group",
    }))
  }

  const handleRemoteSecurityGroupChange = (value: string | number | string[] | undefined) => {
    setFormValues((prev) => ({
      ...prev,
      remoteSecurityGroupId: String(value || ""),
    }))
  }

  const handlePortModeChange = (value: string | number | string[] | undefined) => {
    const newMode = String(value) as "single" | "range" | "all"
    setFormValues((prev) => {
      // Pre-fill values based on mode
      if (newMode === PORT_MODE_ALL) {
        return {
          ...prev,
          portMode: newMode,
          portRangeMin: String(PORT_MIN),
          portRangeMax: String(PORT_MAX),
        }
      } else if (newMode === PORT_MODE_SINGLE) {
        return {
          ...prev,
          portMode: newMode,
          portSingle: prev.portSingle || "",
        }
      } else {
        return {
          ...prev,
          portMode: newMode,
        }
      }
    })
  }

  // Validation
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    // Port range validation for TCP/UDP (reuses BFF validation)
    if (showPortFields) {
      if (formValues.portMode === PORT_MODE_SINGLE) {
        if (!formValues.portSingle) {
          newErrors.portSingle = t`Port is required`
        } else {
          const port = parseInt(formValues.portSingle, 10)
          const portValidation = validatePortRange(port, port, formValues.protocol)
          if (!portValidation.valid) {
            newErrors.portSingle = portValidation.error || t`Invalid port`
          }
        }
      } else if (formValues.portMode === PORT_MODE_RANGE) {
        const minPort = formValues.portRangeMin ? parseInt(formValues.portRangeMin, 10) : null
        const maxPort = formValues.portRangeMax ? parseInt(formValues.portRangeMax, 10) : null

        const portValidation = validatePortRange(minPort, maxPort, formValues.protocol)
        if (!portValidation.valid) {
          newErrors.portRangeMin = portValidation.error || t`Invalid port range`
        }
      }
      // PORT_MODE_ALL doesn't need validation (always 1-65535)
    }

    // ICMP validation (reuses BFF validation)
    if (showIcmpFields) {
      const icmpType = formValues.icmpType ? parseInt(formValues.icmpType, 10) : null
      const icmpCode = formValues.icmpCode ? parseInt(formValues.icmpCode, 10) : null

      const icmpValidation = validateIcmpTypeCode(icmpType, icmpCode)
      if (!icmpValidation.valid) {
        // The shared function handles all validation including NaN
        if (icmpValidation.error?.includes("type")) {
          newErrors.icmpType = t`ICMP type must be between ${ICMP_MIN} and ${ICMP_MAX}`
        }
        if (icmpValidation.error?.includes("code")) {
          newErrors.icmpCode = t`ICMP code must be between ${ICMP_MIN} and ${ICMP_MAX}`
        }
        // Fallback for generic errors
        if (!newErrors.icmpType && !newErrors.icmpCode) {
          newErrors.icmpType = icmpValidation.error || t`Invalid ICMP type/code`
        }
      }
    }

    // Remote CIDR validation (comprehensive - reuses BFF validation)
    if (formValues.remoteSourceType === "cidr" && formValues.remoteCidr) {
      if (!isValidCIDR(formValues.remoteCidr)) {
        newErrors.remoteCidr = t`Invalid CIDR format. Examples: 0.0.0.0/0 (IPv4) or ::/0 (IPv6)`
      } else {
        // Validate ethertype matches CIDR family
        const cidrFamily = detectCIDRFamily(formValues.remoteCidr)
        if (cidrFamily && cidrFamily !== formValues.ethertype) {
          newErrors.remoteCidr = t`CIDR family (${cidrFamily}) must match Ethertype (${formValues.ethertype})`
        }
      }
    }

    // Protocol validation for custom protocol
    if (showProtocolInput && !formValues.protocol) {
      newErrors.protocol = t`Protocol is required`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Build request payload
    const payload: CreateSecurityGroupRuleInput = {
      security_group_id: securityGroupId,
      direction: formValues.direction,
      ethertype: formValues.ethertype,
      description: formValues.description || undefined,
      protocol: formValues.protocol || null,
    }

    // Add port range for TCP/UDP
    if (isTcpUdpProtocol) {
      if (formValues.portMode === PORT_MODE_SINGLE && formValues.portSingle) {
        const port = parseInt(formValues.portSingle, 10)
        payload.port_range_min = port
        payload.port_range_max = port
      } else if (formValues.portMode === PORT_MODE_RANGE) {
        if (formValues.portRangeMin) {
          payload.port_range_min = parseInt(formValues.portRangeMin, 10)
        }
        if (formValues.portRangeMax) {
          payload.port_range_max = parseInt(formValues.portRangeMax, 10)
        }
      } else if (formValues.portMode === PORT_MODE_ALL) {
        payload.port_range_min = PORT_MIN
        payload.port_range_max = PORT_MAX
      }
    }

    // Add ICMP type/code (maps to port_range_min/max)
    if (isIcmpProtocol) {
      if (formValues.icmpType) {
        payload.port_range_min = parseInt(formValues.icmpType, 10)
      }
      if (formValues.icmpCode) {
        payload.port_range_max = parseInt(formValues.icmpCode, 10)
      }
    }

    // Add remote source
    if (formValues.remoteSourceType === "cidr" && formValues.remoteCidr) {
      payload.remote_ip_prefix = formValues.remoteCidr
    } else if (formValues.remoteSourceType === "security_group" && formValues.remoteSecurityGroupId) {
      payload.remote_group_id = formValues.remoteSecurityGroupId
    }

    try {
      await onCreate(payload)
      handleClose()
    } catch (error) {
      // Backend handles error parsing, just display the message
      setErrors({ form: error instanceof Error ? error.message : t`Failed to create rule` })
    }
  }

  const handleClose = () => {
    setFormValues({ ...DEFAULT_VALUES })
    setErrors({})
    onClose()
  }

  return {
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
  }
}
