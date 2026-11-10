---
"@cobaltcore-dev/aurora": patch
---

- Security Group detail tabs use Juno `TabBar`/`TabBarItem` instead of the deprecated `TabNavigation`.
- Security Groups list, Rules and RBAC Policies empty states use title-case titles and distinguish "no data" from "no search/filter matches".
- The Security Groups list, Rules and RBAC Policies searches show a generic "Search..." placeholder.
- The Delete Security Group modal names the group in its body instead of its title.
- Name and description errors in the Create/Edit Security Group and Add Rule modals appear as soon as they disable the confirm button; Edit can't be saved without changes.
- Empty values in Security Groups (General Information, the rules table and the list) show the shared "- -" placeholder instead of "—".
- The Add Rule modal shows Direction, Protocol, Port Range and ICMP as titled sections and groups the remote type, the remote CIDR / Security Group and IP Version under one "Remote" section, with a divider before Description.
