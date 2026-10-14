---
name: verify
description: Verify an Aurora epic against a service. Use when the user wants an epic, feature or service checked for security, architecture or UI. Routes to security-and-hardening, verifyArch, verifyUI.
argument-hint: <epic> <service>
---

# verify

Input: `$ARGUMENTS` = Epic (text, link or ID) + Service (name or path).

1. **Clarify**: If epic or service is missing or ambiguous, ask ONE short question covering all gaps. Otherwise don't ask.

2. **Route**: Pick only the subskills that match the request.

   | Signal in epic/request                                                                | Subskill                 |
   | ------------------------------------------------------------------------------------- | ------------------------ |
   | auth, tokens, secrets, permissions, user input, API/BFF, deps, CSP                    | `security-and-hardening` |
   | new module/route, tRPC router, data flow, Zustand state, package boundaries, refactor | `verifyArch`             |
   | components, Juno, layout, forms, a11y, i18n, loading/error states                     | `verifyUI`               |

   An explicit user choice wins ("only UI"). If there is no clear signal, ask. Run all three only if the user says "full".

3. **Run**: Invoke the selected subskills with the Skill tool, one at a time. Pass each one only:
   - the epic goal in one line
   - the acceptance criteria
   - the service path

   Stay inside the service path. Use Grep before Read, and don't read whole directories.

4. **Report**: Write one merged list. Don't restate the epic.

   ```
   ## verify: <service> – <epic>
   Ran: security, arch · Skipped: ui (no UI change)
   ❌ file:line – problem → fix
   ⚠️ file:line – risk → suggestion
   ✅ <acceptance criterion> covered
   ```

   List at most ~10 findings, highest severity first. If nothing is found, write `✅ No findings`.
