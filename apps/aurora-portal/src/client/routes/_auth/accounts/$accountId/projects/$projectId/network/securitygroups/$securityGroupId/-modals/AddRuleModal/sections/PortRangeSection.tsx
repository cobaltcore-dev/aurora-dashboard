import { FormRow, TextInput, Select, SelectOption } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { PORT_MIN, PORT_MAX } from "../constants"
import type { AddRuleFormApi } from "../AddRuleModal"

interface PortRangeSectionProps {
  form: AddRuleFormApi
  disabled?: boolean
}

export function PortRangeSection({ form, disabled = false }: PortRangeSectionProps) {
  const { t } = useLingui()

  return (
    <>
      {/* Port Mode Selector */}
      <form.Field name="portMode">
        {(portModeField) => (
          <FormRow className="mb-6">
            <Select
              id="portMode"
              label={t`Port Configuration`}
              value={portModeField.state.value}
              onChange={(value) => portModeField.handleChange(String(value) as "single" | "range" | "all")}
              disabled={disabled}
            >
              <SelectOption value="single" label={t`Single Port`} />
              <SelectOption value="range" label={t`Port Range`} />
              <SelectOption value="all" label={t`All Ports (${PORT_MIN}-${PORT_MAX})`} />
            </Select>
          </FormRow>
        )}
      </form.Field>

      {/* Single Port Input */}
      <form.Field name="portMode">
        {(portModeField) =>
          portModeField.state.value === "single" ? (
            <form.Field name="portSingle">
              {(portSingleField) => (
                <FormRow className="mb-6">
                  <TextInput
                    id="portSingle"
                    name="portSingle"
                    label={t`Port`}
                    value={portSingleField.state.value || ""}
                    onChange={(e) => portSingleField.handleChange(e.target.value)}
                    errortext={portSingleField.state.meta.errors[0]?.toString()}
                    placeholder="8080"
                    disabled={disabled}
                  />
                </FormRow>
              )}
            </form.Field>
          ) : null
        }
      </form.Field>

      {/* Port Range Inputs */}
      <form.Field name="portMode">
        {(portModeField) =>
          portModeField.state.value === "range" ? (
            <FormRow className="mb-6">
              <div className="flex gap-4">
                <form.Field name="portRangeMin">
                  {(portRangeMinField) => (
                    <TextInput
                      id="portRangeMin"
                      name="portRangeMin"
                      label={t`Port Range Min`}
                      value={portRangeMinField.state.value || ""}
                      onChange={(e) => portRangeMinField.handleChange(e.target.value)}
                      errortext={portRangeMinField.state.meta.errors[0]?.toString()}
                      placeholder={String(PORT_MIN)}
                      disabled={disabled}
                    />
                  )}
                </form.Field>
                <form.Field name="portRangeMax">
                  {(portRangeMaxField) => (
                    <TextInput
                      id="portRangeMax"
                      name="portRangeMax"
                      label={t`Port Range Max`}
                      value={portRangeMaxField.state.value || ""}
                      onChange={(e) => portRangeMaxField.handleChange(e.target.value)}
                      errortext={portRangeMaxField.state.meta.errors[0]?.toString()}
                      placeholder={String(PORT_MAX)}
                      disabled={disabled}
                    />
                  )}
                </form.Field>
              </div>
            </FormRow>
          ) : null
        }
      </form.Field>

      {/* All Ports - No Input Needed */}
      <form.Field name="portMode">
        {(portModeField) =>
          portModeField.state.value === "all" ? (
            <FormRow className="mb-6">
              <p className="text-theme-light text-sm">{t`All ports (${PORT_MIN}-${PORT_MAX}) will be allowed`}</p>
            </FormRow>
          ) : null
        }
      </form.Field>
    </>
  )
}
