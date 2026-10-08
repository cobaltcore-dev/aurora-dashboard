import { z } from "zod"
import { SLOT_NAMES } from "@/types/appConfig"

/**
 * Builds a Zod schema for the {@link AuroraAppConfig} envelope, for validating configuration
 * loaded at runtime from an external source (e.g. a Kubernetes ConfigMap mounted as YAML).
 *
 * The envelope (service/slot visibility, settings maps, overrides, domain matchers) is owned
 * and validated by Aurora. The consumer-specific `features` bag is validated by the schema
 * passed in `featuresSchema`; when omitted it is accepted as an open record. Per-service
 * `features` are always accepted as an open record (consumers validate those themselves).
 *
 * Visibility is a discriminated union on `mode`, so `allowlist` accepts only an `allow` list
 * and `denylist` only a `deny` list; the two can never coexist. `domain` is validated as a
 * string (YAML cannot express a RegExp) and checked to be a compilable regular expression.
 * Unknown keys are rejected so a typo in a ConfigMap fails fast at boot.
 *
 * @example
 * ```ts
 * const sciFeatures = z.object({ termsAndConditionsUrl: z.string().optional() })
 * const schema = auroraAppConfigSchema(sciFeatures)
 * const appConfig = schema.parse(parsedYaml)
 * ```
 */
export function auroraAppConfigSchema(featuresSchema: z.ZodType = z.record(z.string(), z.unknown())) {
  const serviceVisibility = z
    .discriminatedUnion("mode", [
      z.strictObject({ mode: z.literal("allowlist"), allow: z.array(z.string()) }),
      z.strictObject({ mode: z.literal("denylist"), deny: z.array(z.string()) }),
    ])
    .optional()
  const slotVisibility = z
    .discriminatedUnion("mode", [
      z.strictObject({ mode: z.literal("allowlist"), allow: z.array(z.enum(SLOT_NAMES)) }),
      z.strictObject({ mode: z.literal("denylist"), deny: z.array(z.enum(SLOT_NAMES)) }),
    ])
    .optional()

  // Each service's settings are a flat, consumer-defined bag (Aurora passes it through
  // untouched), so accept any keys. Consumers validate their own service settings if needed.
  const serviceSettings = z.record(z.string(), z.record(z.string(), z.unknown())).optional()
  const slotSettingsShape = Object.fromEntries(
    SLOT_NAMES.map((name) => [name, z.record(z.string(), z.unknown()).optional()])
  )
  const slotSettings = z.strictObject(slotSettingsShape).optional()

  const features = featuresSchema.optional()

  const base = { services: serviceVisibility, slots: slotVisibility, serviceSettings, slotSettings, features }

  const serviceDelta = z
    .strictObject({ enable: z.array(z.string()).optional(), disable: z.array(z.string()).optional() })
    .optional()
  const slotDelta = z
    .strictObject({ enable: z.array(z.enum(SLOT_NAMES)).optional(), disable: z.array(z.enum(SLOT_NAMES)).optional() })
    .optional()

  const domain = z.string().refine(
    (pattern) => {
      try {
        new RegExp(pattern)
        return true
      } catch {
        return false
      }
    },
    { message: "domain must be a valid regular expression pattern" }
  )

  const override = z.strictObject({
    name: z.string().optional(),
    domain,
    services: serviceDelta,
    slots: slotDelta,
    serviceSettings,
    slotSettings,
    features,
  })

  return z.strictObject({ ...base, overrides: z.array(override).optional() })
}
