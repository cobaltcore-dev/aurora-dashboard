import { FormRow, TextInput, Select, SelectOption } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { PORT_MIN, PORT_MAX } from "../constants"

interface PortRangeSectionProps {
  portMode: "single" | "range" | "all"
  portSingle: string
  portRangeMin: string
  portRangeMax: string
  errors: { portSingle?: string; portRangeMin?: string; portRangeMax?: string }
  onPortModeChange: (value: string | number | string[] | undefined) => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}

export function PortRangeSection({
  portMode,
  portSingle,
  portRangeMin,
  portRangeMax,
  errors,
  onPortModeChange,
  onChange,
  disabled = false,
}: PortRangeSectionProps) {
  const { t } = useLingui()

  return (
    <>
      {/* Port Mode Selector */}
      <FormRow className="mb-6">
        <Select
          id="portMode"
          label={t`Port Configuration`}
          value={portMode}
          onChange={onPortModeChange}
          disabled={disabled}
        >
          <SelectOption value="single" label={t`Single Port`} />
          <SelectOption value="range" label={t`Port Range`} />
          <SelectOption value="all" label={t`All Ports (${PORT_MIN}-${PORT_MAX})`} />
        </Select>
      </FormRow>

      {/* Single Port Input */}
      {portMode === "single" && (
        <FormRow className="mb-6">
          <TextInput
            id="portSingle"
            name="portSingle"
            label={t`Port`}
            value={portSingle}
            onChange={onChange}
            errortext={errors.portSingle}
            placeholder="8080"
            disabled={disabled}
          />
        </FormRow>
      )}

      {/* Port Range Inputs */}
      {portMode === "range" && (
        <FormRow className="mb-6">
          <div className="flex gap-4">
            <TextInput
              id="portRangeMin"
              name="portRangeMin"
              label={t`Port Range Min`}
              value={portRangeMin}
              onChange={onChange}
              errortext={errors.portRangeMin}
              placeholder={String(PORT_MIN)}
              disabled={disabled}
            />
            <TextInput
              id="portRangeMax"
              name="portRangeMax"
              label={t`Port Range Max`}
              value={portRangeMax}
              onChange={onChange}
              errortext={errors.portRangeMax}
              placeholder={String(PORT_MAX)}
              disabled={disabled}
            />
          </div>
        </FormRow>
      )}

      {/* All Ports - No Input Needed */}
      {portMode === "all" && (
        <FormRow className="mb-6">
          <p className="text-theme-light text-sm">{t`All ports (${PORT_MIN}-${PORT_MAX}) will be allowed`}</p>
        </FormRow>
      )}
    </>
  )
}
