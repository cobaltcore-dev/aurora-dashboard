# Guardrails for Aurora Dashboard

This file collects project-specific guardrails: conventions and patterns that must be followed but don't yet have a home in our skills or other references. Content grows or shrinks over time.

## List Views

- Render the individual items' IDs in the name column underneath the name in a subdued text style if possible
- If the items have a detail view _DO_ make each whole row clickable to navigate to the detail view
- If any action can be performed on an item, _DO_ add a column with an overflow menu containing the actions as the last column. Note: If the item has a detail view, ensure the overflow menu contains a "View Details" item.

## Detail Views

- If you have multiple sub-tables showing lists of items, _DO_ use a TabBar to switch between the sub-tables
