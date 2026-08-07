# Code Review Guidelines (React 19 & Modern Stack)

Please enforce the following architectural, code quality, and styling guidelines strictly across all Pull Requests.

---

## 1. React 19 Best Practices

- **Minimize useEffect:** Critically evaluate every `useEffect` hook. Flag synchronizations, computed states, or event-driven triggers (e.g., click handlers) that can be handled during rendering or inside event handlers instead.
- **React Server Components (RSC) & Actions:** Ensure proper boundaries between Server and Client Components (`"use client"`). Prefer native React 19 Actions (Form Actions) and hooks like `useActionState` for handling form submissions.
- **The `use()` Hook:** Ensure that the new `use()` hook is utilized instead of traditional hooks when resolving Promises or Context conditionally or inside loops.

---

## 2. tRPC (API Layer)

- **Type-Safety:** All API requests must be fully type-safe and routed via the generated tRPC routers. Flag any manual `fetch` or Axios calls used for internal API communication.
- **Error Handling:** Verify that tRPC errors (e.g., validation or server errors) are gracefully caught and handled in the UI.
- **Procedures:** Ensure new API endpoints strictly use the correct tRPC procedure types (e.g., `protectedProcedure` for authenticated routes).

---

## 3. TanStack Routing & State Management

- **TanStack React Router:**
  - Strictly enforce file-based routing.
  - Data critical for rendering a page must be fetched via the route's `loader` function rather than loading it inside the component body.
  - Enforce the use of `useNavigate` or the `<Link>` component for type-safe navigation.
- **TanStack React Query:**
  - Use React Query for caching and mutating asynchronous server state whenever it is not already managed by native tRPC hooks.
  - Ensure query keys are consistent and well-structured.

---

## 4. Design System: @cloudoperators/juno-ui-components

- **Prefer Juno UI Components:** Prefer using Juno UI components for layouts, buttons, forms, and overlays when they provide the needed functionality. Custom CSS classes are allowed when needed for specific design requirements.
- **Layout & Grid:** Mandate the use of Juno's layout utilities (e.g., `<AppShell>`, `<Container>`, `<Grid>`) to maintain UI consistency.
- **Accessibility & Props:** Check that semantic props provided by Juno components (e.g., `variant`, `disabled`, `required`) are used correctly instead of rewriting that logic manually.

---

## General Review Instructions

- Provide constructive, concise, and highly actionable feedback.
- Whenever a guideline is violated, provide a brief code snippet demonstrating the correct implementation.
