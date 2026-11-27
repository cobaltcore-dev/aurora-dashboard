# Notification guardrails — messages and toasts

Rules for in-page messages and toast notifications. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **NOTIF-1** `[scope: design-system]` `Message` = use for static, anchored, persistent feedback near related content; Use an anchored `Message` for errors requiring user action.
- **NOTIF-2** `[scope: design-system]` `Toast` = use for floating notifications via `NotificationManager` mounted once at app root (`toast()`, never `Toast` directly). Auto-dismiss only low-stakes `info`/`success` feedback; never auto-dismiss `error`/`warning` messages or toasts. Keep progress toasts visible until their operation finishes and dismiss them explicitly. Never combine a toast and an in-page confirmation Message for the same action.
- **NOTIF-3** `[scope: aurora]` Extract all toast messages into a dedicated `<Resource>ToastNotifications.tsx` file; never pass an inline string or JSX to `toast.*`. Each helper returns a `{ message, description }` object; the call site destructures it and spreads the rest as options:

  ```tsx
  const { message, ...options } = getResourceDeletedToast(name)
  toast.success(message, options)
  ```
