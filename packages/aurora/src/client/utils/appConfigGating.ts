import type { Slots } from "@/client/AuroraApp"
import type { SlotName, Visibility } from "@/types/appConfig"

/**
 * Filter the registered slot components through the resolved slot visibility.
 * - allowlist: only slots whose name is in `allow` render.
 * - denylist: every slot renders except those in `deny`.
 * - no visibility (default-open): all registered slots pass through unchanged.
 */
export function gateSlots(slots: Slots | undefined, visibility: Visibility<SlotName> | undefined): Slots | undefined {
  if (!slots || !visibility) return slots
  const gated: Slots = { ...slots }
  for (const key of Object.keys(gated) as SlotName[]) {
    const shown = visibility.mode === "allowlist" ? visibility.allow.includes(key) : !visibility.deny.includes(key)
    if (!shown) delete gated[key]
  }
  return gated
}

/**
 * Turn the resolved service visibility into the `enabledServices`/`deniedServices` signals
 * the router context exposes to the project routes.
 * - allowlist: `enabledServices` is the allow list (only those show).
 * - denylist: `deniedServices` is the deny list (everything else shows).
 * - no visibility (default-open): fall back to the legacy `enabledServices` prop, which is
 *   superseded by appConfig and will be removed once all consumers migrate.
 */
export function resolveServiceVisibility(
  fallbackEnabled: string[] | undefined,
  visibility: Visibility<string> | undefined
): { enabledServices?: string[]; deniedServices?: string[] } {
  if (!visibility) return { enabledServices: fallbackEnabled }
  if (visibility.mode === "allowlist") return { enabledServices: visibility.allow }
  return { deniedServices: visibility.deny }
}
