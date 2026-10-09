/**
 * Canonical list of the UI extension points a consumer can register components for.
 *
 * Declared as a runtime array (rather than a bare type) so it can drive both the
 * {@link SlotName} type and runtime validation (see `auroraAppConfigSchema`). Kept in this
 * JSX-free module so the server build can consume it; a compile-time guard in
 * `client/AuroraApp.tsx` keeps it in lockstep with the keys of the `Slots` type.
 */
export const SLOT_NAMES = [
  "logo",
  "login",
  "pageFooter",
  "sideNavBanner",
  "serviceBadge",
  "servicePageActions",
  "projectsBanner",
  "serviceBanner",
] as const

/** Names of the UI extension points a consumer can register components for. */
export type SlotName = (typeof SLOT_NAMES)[number]

/**
 * An open, consumer-typed bag of flags/values. Aurora never introspects its contents.
 * Consumers narrow this via the generic parameters on {@link AuroraAppConfig}.
 */
export type FeatureBag = Record<string, unknown>

/**
 * Per-slot runtime data bag, e.g. `{ text: "Maintenance tonight" }` for a banner slot.
 * Carried in {@link AppConfigBase.slotSettings}; it never affects whether a slot renders.
 */
export type SlotConfigEntry = Record<string, unknown>

/**
 * Map of service key to that service's settings bag. Supplied by the consumer via the
 * `TServices` generic to get precise, typo-checked per-service settings. Each entry is the
 * settings object itself (a flat bag), symmetric with {@link SlotConfigEntry}.
 */
export type ServiceFeatureMap = Record<string, FeatureBag>

/**
 * Visibility rule for one dimension (services or slots). The base layer declares the
 * posture explicitly:
 * - `allowlist`: nothing shows unless its key is in `allow`.
 * - `denylist`: everything shows unless its key is in `deny`.
 *
 * Omit the rule entirely for default-open (every service/slot shows). Because posture is a
 * discriminated union on `mode`, only the list that posture makes meaningful is accepted,
 * so an `allow` and a `deny` list can never be present at the same time. Switching posture
 * is a one-field edit: change `mode` and rename the list.
 */
export type Visibility<TKey extends string = string> =
  { mode: "allowlist"; allow: TKey[] } | { mode: "denylist"; deny: TKey[] }

/**
 * Membership change a domain override applies on top of the base layer's visibility.
 * `enable` makes a key visible for the domain, `disable` hides it, regardless of the base
 * posture. Overrides carry no `mode`, so they can never flip the posture the base pinned.
 * When a key is in both, `disable` wins.
 */
export interface VisibilityDelta<TKey extends string = string> {
  enable?: TKey[]
  disable?: TKey[]
}

/**
 * The base configuration layer. The resolved result shares this shape (overrides folded in
 * and stripped out). Visibility and settings are independent axes: `services`/`slots` decide
 * what renders, while `serviceSettings`/`slotSettings`/`features` carry data and never gate.
 */
export interface AppConfigBase<
  TServices extends ServiceFeatureMap = ServiceFeatureMap,
  TFeatures extends FeatureBag = FeatureBag,
> {
  /** Which services render. Omit for default-open (all catalog services). */
  services?: Visibility<Extract<keyof TServices, string>>
  /** Which slots render. Omit for default-open (all registered slots). */
  slots?: Visibility<SlotName>
  /** Per-service settings bags, independent of visibility. Deep-merged across overrides. */
  serviceSettings?: { [K in keyof TServices]?: TServices[K] }
  /** Per-slot data bags (e.g. banner text), independent of visibility. Deep-merged across overrides. */
  slotSettings?: Partial<Record<SlotName, SlotConfigEntry>>
  /** App-wide, consumer-typed feature flags. Deep-merged across overrides. */
  features?: TFeatures
}

/** A base layer applies to every domain; an override applies only to matching domains. */
export interface DomainOverride<
  TServices extends ServiceFeatureMap = ServiceFeatureMap,
  TFeatures extends FeatureBag = FeatureBag,
> {
  /** Human-readable label. Used only for logging and debugging. */
  name?: string
  /**
   * Matched against the user's home domain name. A string is compiled to a RegExp;
   * a RegExp literal is preferred because it is validated at compile time.
   */
  domain: string | RegExp
  /** Enable/disable services for this domain. Cannot change the base posture. */
  services?: VisibilityDelta<Extract<keyof TServices, string>>
  /** Enable/disable slots for this domain. Cannot change the base posture. */
  slots?: VisibilityDelta<SlotName>
  serviceSettings?: { [K in keyof TServices]?: TServices[K] }
  slotSettings?: Partial<Record<SlotName, SlotConfigEntry>>
  features?: TFeatures
}

/**
 * The full domain configuration a consumer passes to `createServer`.
 *
 * The top-level fields form the base layer that applies to every domain. `overrides` are
 * applied on top for domains whose name matches, in array order, with later matches winning.
 * `services`/`slots` fold each override's enable/disable deltas onto the base-pinned posture;
 * `serviceSettings`/`slotSettings`/`features` deep-merge per key.
 *
 * Everything is optional: with no config at all, the resolved result is empty and Aurora
 * behaves in its default-open state (all implemented services, all registered slots).
 *
 * @example
 * ```ts
 * const config: AuroraAppConfig = {
 *   services: { mode: "allowlist", allow: ["ceph-containers", "images"] },
 *   slots: { mode: "denylist", deny: ["projectsBanner"] },
 *   serviceSettings: { images: { showAdvancedOptions: true } },
 *   features: { termsAndConditionsUrl: "https://example.com/terms" },
 *   overrides: [
 *     { name: "acme", domain: /^acme-/, services: { enable: ["flavors"], disable: ["images"] } },
 *   ],
 * }
 * ```
 */
export interface AuroraAppConfig<
  TServices extends ServiceFeatureMap = ServiceFeatureMap,
  TFeatures extends FeatureBag = FeatureBag,
> extends AppConfigBase<TServices, TFeatures> {
  overrides?: DomainOverride<TServices, TFeatures>[]
}

/**
 * The merged result for a single domain: a base layer with the overrides already applied and
 * stripped out. This is what the BFF returns to the client and what custom BFF procedures
 * read from `ctx.appConfig`. It never contains `overrides` or a RegExp, so it is wire-safe.
 */
export type ResolvedAppConfig<
  TServices extends ServiceFeatureMap = ServiceFeatureMap,
  TFeatures extends FeatureBag = FeatureBag,
> = AppConfigBase<TServices, TFeatures>
