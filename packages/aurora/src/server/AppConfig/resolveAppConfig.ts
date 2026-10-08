import type {
  AuroraAppConfig,
  AppConfigBase,
  DomainOverride,
  FeatureBag,
  ResolvedAppConfig,
  ServiceFeatureMap,
  Visibility,
  VisibilityDelta,
} from "../../types/appConfig"

/** Compile a string pattern to a RegExp once; pass RegExp literals through unchanged. */
function toRegExp(pattern: string | RegExp): RegExp {
  return typeof pattern === "string" ? new RegExp(pattern) : pattern
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Deep-merge `source` onto `target`, per key. Plain objects merge recursively; scalars
 * and arrays from `source` replace whatever is in `target`. Neither input is mutated.
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: T): T {
  const out: Record<string, unknown> = { ...target }
  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    if (sourceValue === undefined) continue
    const targetValue = out[key]
    out[key] =
      isPlainObject(targetValue) && isPlainObject(sourceValue) ? deepMerge(targetValue, sourceValue) : sourceValue
  }
  return out as T
}

/** Deep-merge two optional settings maps, returning undefined when both are absent. */
function mergeSettings<T extends Record<string, unknown>>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a && !b) return undefined
  return deepMerge((a ?? {}) as T, (b ?? {}) as T)
}

/**
 * Fold a domain override's enable/disable delta onto the base visibility for one dimension.
 *
 * The base pins the posture; the delta only changes membership, so the posture can never
 * flip. `enable` always makes a key visible for the domain and `disable` always hides it,
 * regardless of posture; `disable` is applied last, so it wins when a key is in both.
 *
 * A missing base means default-open, modelled as a denylist with an empty hidden set: a
 * `disable` turns it into an explicit denylist, while an `enable` is a no-op (everything is
 * already shown) and the dimension stays default-open.
 */
function foldVisibility<TKey extends string>(
  base: Visibility<TKey> | undefined,
  delta: VisibilityDelta<TKey> | undefined
): Visibility<TKey> | undefined {
  if (!delta) return base

  const enable = delta.enable ?? []
  const disable = delta.disable ?? []

  if (base?.mode === "allowlist") {
    const shown = new Set(base.allow)
    for (const key of enable) shown.add(key)
    for (const key of disable) shown.delete(key)
    return { mode: "allowlist", allow: [...shown] }
  }

  const hidden = new Set(base?.mode === "denylist" ? base.deny : [])
  for (const key of enable) hidden.delete(key)
  for (const key of disable) hidden.add(key)
  if (!base && hidden.size === 0) return undefined
  return { mode: "denylist", deny: [...hidden] }
}

/** Build a resolved layer, omitting any dimension that ended up undefined. */
function pruneLayer<TServices extends ServiceFeatureMap, TFeatures extends FeatureBag>(
  layer: AppConfigBase<TServices, TFeatures>
): ResolvedAppConfig<TServices, TFeatures> {
  const out: AppConfigBase<TServices, TFeatures> = {}
  if (layer.services) out.services = layer.services
  if (layer.slots) out.slots = layer.slots
  if (layer.serviceSettings) out.serviceSettings = layer.serviceSettings
  if (layer.slotSettings) out.slotSettings = layer.slotSettings
  if (layer.features) out.features = layer.features
  return out
}

/**
 * Resolve a consumer's domain configuration for one domain.
 *
 * Starts from the base layer (the config's top-level fields), then applies every override
 * whose `domain` matches `domainName`, in array order. For each override: `services` and
 * `slots` deltas fold onto the base-pinned posture (see {@link foldVisibility}); and
 * `serviceSettings`, `slotSettings`, `features` deep-merge per key. When `domainName` is
 * undefined (e.g. an unauthenticated request, where no domain is known yet) no override
 * matches and only the base layer is returned.
 *
 * The returned object never contains `overrides` or any RegExp, so it is safe to send over
 * the wire to the client.
 */
export function resolveAppConfig<
  TServices extends ServiceFeatureMap = ServiceFeatureMap,
  TFeatures extends FeatureBag = FeatureBag,
>(config: AuroraAppConfig<TServices, TFeatures>, domainName?: string): ResolvedAppConfig<TServices, TFeatures> {
  const { overrides = [], ...base } = config

  let resolved = pruneLayer(base as AppConfigBase<TServices, TFeatures>)
  if (!domainName) return resolved

  for (const override of overrides as DomainOverride<TServices, TFeatures>[]) {
    if (!toRegExp(override.domain).test(domainName)) continue
    resolved = pruneLayer({
      services: foldVisibility(resolved.services, override.services),
      slots: foldVisibility(resolved.slots, override.slots),
      serviceSettings: mergeSettings(resolved.serviceSettings, override.serviceSettings),
      slotSettings: mergeSettings(resolved.slotSettings, override.slotSettings),
      features: mergeSettings(resolved.features, override.features),
    })
  }

  return resolved
}
