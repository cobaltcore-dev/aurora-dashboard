# Overflow / popup menu guardrails

Rules for overflow (⋮) and popup menus. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **MENU-1** `[scope: design-system]` Use an overflow (⋮) menu to group actions bound to a specific item — when an item has multiple actions, or an action is secondary, rarely used, or destructive. Prefer it to crowding the UI with inline controls.
- **MENU-2** `[scope: design-system]` Order overflow menu items by importance, never alphabetically: the most relevant/most-used actions first, destructive actions last.
- **MENU-3** `[scope: aurora]` When a list item has a detail view, its row's overflow menu must contain a "Show Details" (not "View Details"!) entry, and it must be the first item in the menu.
- **MENU-4** `[scope: aurora]` A menu's **terminal action** — the one that deletes or permanently relinquishes the entity — goes last and, in single-entity menus, is separated from the rest by a divider. Label it `Delete [Entity]` by default (e.g. "Delete Bucket"); use the domain verb where the resource has one (e.g. "Release" a floating IP, "Revoke" a credential). Reversible actions such as Detach or Disassociate are not terminal and stay in the main group. For multi-entity menus (multiple groups separated by dividers), the group divider already separates the terminal action — no extra divider needed.
