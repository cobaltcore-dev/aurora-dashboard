# Issue #1055: Централизованная обработка ошибок с tRPC Link Interceptor

## Оглавление

- [Детальный анализ проблемы](#детальный-анализ-проблемы)
- [Предлагаемое решение](#предлагаемое-решение)
- [Варианты решения](#варианты-решения)
- [План реализации](#план-реализации)
- [Преимущества финального решения](#преимущества-финального-решения)
- [Риски и соображения](#риски-и-соображения)
- [Заключение](#заключение)

---

## Детальный анализ проблемы

### Текущая ситуация

**Проблема**: В Aurora Dashboard обработка ошибок требует от разработчиков вручную проверять специфические коды ошибок tRPC (особенно `401 UNAUTHORIZED`) в каждом компоненте, который делает API-вызовы.

**Что происходит сейчас**:

1. **Ручная обработка в каждом компоненте**: Разработчики должны помнить о необходимости проверять `isTRPCUnauthorized(error)` в каждом `onError` обработчике мутаций/запросов

2. **Текущая архитектура**:

   ```
   User action → tRPC call → BFF returns 401
   → httpBatchLink passes error through
   → React Query onError fires
   → Component onError handler
   → Developer must manually check and redirect
   ```

3. **Существующий минималистичный код ошибок** (`trpcErrors.ts`):
   - Только 2 функции: `isTRPCUnauthorized()` и `isTRPCError()`
   - Нет хелперов для других HTTP кодов (403, 404, 409, etc.)
   - Нет утилит для извлечения сообщений об ошибках

4. **Существующая инфраструктура**:
   - **CSRF token кеш** с механизмом инвалидации (`invalidateCsrfToken()`)
   - **AuthProvider** с методом `logout()`, который управляет навигацией на `/` с сохранением `redirect` параметра
   - **Сложная цепочка tRPC links** с разделением для subscriptions, streaming, non-JSON data
   - **QueryClient** с глобальной конфигурацией, но без глобального обработчика ошибок

### Последствия текущего подхода

**Для разработчиков**:

- ❌ **Дублирование кода**: Одинаковая логика проверки 401 повторяется в десятках компонентов
- ❌ **Легко забыть**: Нет механизма, гарантирующего обработку 401 везде
- ❌ **Inconsistent UX**: Разные компоненты могут обрабатывать истечение сессии по-разному

**Для пользователей**:

- ❌ **Плохой UX**: Пользователи могут видеть тост с ошибкой перед редиректом на логин
- ❌ **Потеря контекста**: Если разработчик забыл сохранить `redirect` URL, пользователь теряет свою позицию

**Пример проблемного кода** (из `DeleteContainerModal.tsx`):

```typescript
const deleteContainerMutation = trpcReact.storage.swift.deleteContainer.useMutation({
  onError: (error) => {
    // ❌ НЕТ проверки на 401! Пользователь увидит тост с ошибкой,
    // но не будет перенаправлен на логин
    onError?.(container!.name, error.message)
  },
})
```

---

## Предлагаемое решение

### Архитектурный подход: tRPC Link Interceptor

Issue #1055 предлагает добавить **Critical Error Interceptor** как custom tRPC link, который перехватывает критические ошибки ДО того, как они дойдут до React Query или компонентов.

**Новая архитектура**:

```
User action → tRPC call → BFF returns 401
→ criticalErrorInterceptorLink (NEW)
  → Перехватывает 401
  → Сохраняет URL в sessionStorage
  → Инвалидирует CSRF токен
  → Делает hard redirect на /
  → Ошибка НЕ проходит дальше ❌
→ Component никогда не видит 401
```

---

## Варианты решения

### Вариант 1: tRPC Link Interceptor (рекомендуется из issue)

**Суть**: Добавить custom link в начало цепочки links, который перехватывает 401 ошибки.

**Преимущества**:

- ✅ **Раннее перехватывание**: Ловит ошибки до React Query
- ✅ **Framework-agnostic**: Работает независимо от React Query
- ✅ **Полный контроль**: Можно полностью остановить распространение ошибки
- ✅ **Нет тостов**: Пользователь не увидит flash ошибки перед редиректом
- ✅ **Централизованная логика**: Одно место для критической обработки ошибок

**Недостатки**:

- ⚠️ **Сложность**: Требует понимания tRPC observables
- ⚠️ **Тестирование**: Нужно тестировать поведение link chain
- ⚠️ **Debugging**: Может быть неочевидно, почему ошибка не доходит до компонента

**Реализация**:

```typescript
// В trpcClient.ts
import { TRPCLink } from "@trpc/client"
import { observable } from "@trpc/server/observable"

/**
 * Critical Error Interceptor Link
 * Перехватывает критические ошибки (401) до того, как они дойдут до компонентов
 */
function criticalErrorInterceptorLink<TRouter extends AuroraRouter>(): TRPCLink<TRouter> {
  return () => {
    return ({ next, op }) => {
      return observable((observer) => {
        const subscription = next(op).subscribe({
          next(value) {
            observer.next(value)
          },
          error(error) {
            // Проверяем на 401 UNAUTHORIZED
            if (isTRPCUnauthorized(error)) {
              console.warn("[tRPC] Session expired (401), redirecting to login...")

              // Сохраняем текущий URL для редиректа после логина
              const currentPath = window.location.pathname + window.location.search
              if (currentPath !== "/") {
                sessionStorage.setItem("redirect_after_login", currentPath)
              }

              // Инвалидируем CSRF токен
              invalidateCsrfToken()

              // Hard redirect (не через TanStack Router, чтобы избежать состояния гонки)
              window.location.href = "/"

              // НЕ передаем ошибку дальше - останавливаем здесь
              return
            }

            // Все остальные ошибки проходят дальше
            observer.error(error)
          },
          complete() {
            observer.complete()
          },
        })

        return subscription
      })
    }
  }
}

// Обновленная функция getLinks()
const getLinks = () => [
  // ⚠️ ВАЖНО: критический интерсептор ПЕРВЫМ в цепочке
  criticalErrorInterceptorLink(),

  splitLink({
    // ... остальные links
  }),
]
```

---

### Вариант 2: React Query Global Error Handler

**Суть**: Использовать глобальный `onError` callback в конфигурации QueryClient.

**Преимущества**:

- ✅ **Простота**: Легко понять и реализовать
- ✅ **Знакомый паттерн**: Стандартная практика в React Query
- ✅ **Меньше кода**: Не требует понимания tRPC internals

**Недостатки**:

- ❌ **Позднее перехватывание**: Ошибка уже прошла через React Query
- ❌ **Может показаться тост**: Если компонент показывает тост в `onError`, он успеет отрендериться
- ❌ **Состояние гонки**: Компонент может начать обрабатывать ошибку до редиректа
- ❌ **Зависимость от React Query**: Не работает для vanilla tRPC client

**Реализация**:

```typescript
// В App.tsx
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // ... existing options
        },
        mutations: {
          onError: (error) => {
            if (isTRPCUnauthorized(error)) {
              console.warn("[Query] Session expired, redirecting...")

              const currentPath = window.location.pathname + window.location.search
              if (currentPath !== "/") {
                sessionStorage.setItem("redirect_after_login", currentPath)
              }

              invalidateCsrfToken()
              window.location.href = "/"
            }
          },
        },
      },
    })
)
```

---

### Вариант 3: Axios/Fetch Interceptor Pattern

**Суть**: Перехватывать ошибки на уровне HTTP клиента (undici в `signal-openstack`).

**Преимущества**:

- ✅ **Самый ранний уровень**: Перехват до tRPC

**Недостатки**:

- ❌ **Архитектурно неправильно**: `signal-openstack` - это server-side пакет
- ❌ **Не имеет доступа к browser APIs**: Нет `window`, `sessionStorage`, etc.
- ❌ **Нарушает separation of concerns**: Клиент OpenStack не должен знать о browser navigation

**Вердикт**: ❌ Не подходит для данной архитектуры

---

### Рекомендация: Гибридный подход

Комбинация **Варианта 1** (основной) + **Вариант 2** (fallback для некритичных ошибок):

```typescript
// 1. tRPC Link - обрабатывает КРИТИЧЕСКИЕ ошибки (401)
criticalErrorInterceptorLink() // Останавливает распространение 401

// 2. React Query Global Handler - логирует некритичные ошибки (403, 500)
QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        // 401 сюда никогда не дойдет (перехвачен в link)
        if (isTRPCForbidden(error)) {
          console.warn("[Query] Permission denied:", error)
        }
        // Ошибка все равно доходит до компонента для локальной обработки
      },
    },
  },
})

// 3. Component onError - обрабатывает domain-specific ошибки (409, 404)
onError: (error) => {
  // 401 никогда не дойдет сюда
  // Только бизнес-логика: конфликты, не найдено, и т.д.
  toast({ title: "Error", description: error.message })
}
```

---

## План реализации

### Task 1: Расширение `trpcErrors.ts` с хелперами

**Файл**: `packages/aurora/src/client/utils/trpcErrors.ts`

**Добавить**:

```typescript
// Существующие
export function isTRPCUnauthorized(error: unknown): boolean {
  /* ... */
}
export function isTRPCError(error: unknown): error is { data: { code: string }; message?: string } {
  /* ... */
}

// Новые type guards
export function isTRPCForbidden(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { data?: { code?: string } }
  return e.data?.code === "FORBIDDEN"
}

export function isTRPCNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { data?: { code?: string } }
  return e.data?.code === "NOT_FOUND"
}

export function isTRPCConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { data?: { code?: string } }
  return e.data?.code === "CONFLICT"
}

export function isTRPCBadRequest(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { data?: { code?: string } }
  return e.data?.code === "BAD_REQUEST"
}

export function isTRPCInternalServerError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { data?: { code?: string } }
  return e.data?.code === "INTERNAL_SERVER_ERROR"
}

// Generic helper
export function hasTRPCCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { data?: { code?: string } }
  return e.data?.code === code
}

// Message extraction
export function getTRPCErrorMessage(error: unknown, fallback = "Unknown error"): string {
  if (!error || typeof error !== "object") return fallback
  const e = error as { message?: string }
  return e.message ?? fallback
}

// HTTP status code extraction (if available)
export function getTRPCHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined
  const e = error as { data?: { httpStatus?: number } }
  return e.data?.httpStatus
}
```

---

### Task 2: Реализация Critical Error Interceptor Link

**Файл**: `packages/aurora/src/client/trpcClient.ts`

**Шаги**:

1. Импортировать необходимые типы:

```typescript
import { TRPCLink } from "@trpc/client"
import { observable } from "@trpc/server/observable"
import { isTRPCUnauthorized } from "./utils/trpcErrors"
```

2. Создать interceptor link:

```typescript
/**
 * Critical Error Interceptor Link
 *
 * Intercepts critical errors (401 UNAUTHORIZED) before they reach React Query or component code.
 * This prevents inconsistent error handling and ensures a seamless UX when sessions expire.
 *
 * Architecture:
 * - Placed FIRST in the link chain (before splitLink)
 * - Intercepts 401 errors and performs hard redirect to login
 * - Saves current URL to sessionStorage for post-login redirect
 * - Invalidates CSRF token to force fresh fetch on next request
 * - Does NOT propagate 401 errors (stops error chain completely)
 * - All other errors pass through normally
 *
 * @see https://github.com/cobaltcore-dev/aurora-dashboard/issues/1055
 */
function criticalErrorInterceptorLink<TRouter extends AuroraRouter>(): TRPCLink<TRouter> {
  return () => {
    return ({ next, op }) => {
      return observable((observer) => {
        const subscription = next(op).subscribe({
          next(value) {
            observer.next(value)
          },
          error(error) {
            // Handle 401 UNAUTHORIZED - session expired
            if (isTRPCUnauthorized(error)) {
              console.warn("[tRPC Critical Error Interceptor] Session expired (401 UNAUTHORIZED)")
              console.debug("[tRPC] Operation that triggered 401:", {
                type: op.type,
                path: op.path,
                input: op.input,
              })

              // Save current URL for post-login redirect
              // Only save if not already on login page to avoid redirect loops
              const currentPath = window.location.pathname + window.location.search
              if (currentPath !== "/" && !currentPath.startsWith("/?")) {
                sessionStorage.setItem("redirect_after_login", currentPath)
                console.debug("[tRPC] Saved redirect URL:", currentPath)
              }

              // Invalidate CSRF token to force fresh fetch on next request
              // This ensures we get a new token after re-authentication
              invalidateCsrfToken()

              // Hard redirect to login (bypasses TanStack Router to avoid race conditions)
              // Using window.location.href ensures a clean state reset
              window.location.href = "/"

              // Do NOT propagate error - the user experience ends here
              // No error toast, no component onError handler fires
              // The redirect is the only action taken
              return
            }

            // All other errors pass through to React Query and component error handlers
            observer.error(error)
          },
          complete() {
            observer.complete()
          },
        })

        return subscription
      })
    }
  }
}
```

3. Добавить в цепочку links (⚠️ **ПЕРВЫМ**):

```typescript
const getLinks = () => [
  // ⚠️ CRITICAL: This MUST be first in the chain
  // If placed after splitLink, batched requests might bypass it
  // If placed after other links, errors may be transformed before reaching here
  criticalErrorInterceptorLink(),

  splitLink({
    // ... existing split logic (subscriptions, streaming, batching)
  }),
]
```

**Важные детали**:

- Link ДОЛЖЕН быть первым, до `splitLink`, чтобы перехватывать все ошибки
- Используем `window.location.href` вместо `router.navigate` чтобы избежать race conditions
- Не вызываем `observer.error()` для 401 - полностью останавливаем распространение
- Добавлены подробные console.debug для отладки

---

### Task 3: (Опциональный) Global Error Handler в React Query

**Файл**: `packages/aurora/src/client/App.tsx`

**Добавить**:

```typescript
import { isTRPCForbidden, isTRPCInternalServerError } from "./utils/trpcErrors"

const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // ... existing options
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
          queryKeyHashFn: (queryKey) => {
            const match = router.state.matches.findLast((m) => "projectId" in (m.params ?? {}))
            const projectId = (match?.params as { projectId?: string })?.projectId ?? ""
            return hashKey([projectId, ...queryKey])
          },
          // Global error handler for queries
          onError: (error) => {
            // 401 will never reach here (intercepted by tRPC link)
            // Log other non-critical errors for debugging
            if (isTRPCForbidden(error)) {
              console.warn("[React Query] Permission denied (403):", error)
            } else if (isTRPCInternalServerError(error)) {
              console.error("[React Query] Server error (500):", error)
            }
            // Error still propagates to component for local handling
          },
        },
        mutations: {
          // Global error handler for mutations
          onError: (error) => {
            // 401 will never reach here (intercepted by tRPC link)
            if (isTRPCForbidden(error)) {
              console.warn("[React Query] Permission denied (403):", error)
            } else if (isTRPCInternalServerError(error)) {
              console.error("[React Query] Server error (500):", error)
            }
            // Error still propagates to component for local handling
          },
        },
      },
    })
)
```

---

### Task 4: Обновление AuthProvider для post-login redirect

**Файл**: `packages/aurora/src/client/routes/index.tsx` (login page)

**Проверить/добавить** обработку сохраненного redirect URL:

```typescript
function LoginPage() {
  const { t } = useLingui()
  const { auth } = useRouteContext({ from: Route.id })
  const router = useRouter()

  const loginMutation = trpcReact.auth.login.useMutation({
    onSuccess: (data) => {
      // Update auth context with user data
      auth.login(data.user, data.expires_at)

      // Check for saved redirect URL from session expiry
      const redirectPath = sessionStorage.getItem("redirect_after_login")

      if (redirectPath && isSafeRedirect(redirectPath)) {
        // Clear saved redirect
        sessionStorage.removeItem("redirect_after_login")

        console.debug("[Login] Redirecting to saved path:", redirectPath)

        // Navigate to saved path
        router.navigate({ to: redirectPath })
      } else {
        // Default redirect to projects list
        router.navigate({ to: "/projects" })
      }
    },
    onError: (error) => {
      // ... existing error handling
    },
  })

  // ... rest of component
}
```

**Дополнительно**: Обновить функцию `isSafeRedirect` если нужно:

```typescript
/**
 * Validates that a redirect path is safe (prevents open redirect vulnerabilities)
 * - Must be a string
 * - Must start with / (internal path)
 * - Must NOT start with // (protocol-relative URL)
 */
function isSafeRedirect(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
}
```

---

### Task 5: Документация

**Файл**: `CLAUDE.md`

**Добавить секцию**:

````markdown
## Error Handling Architecture

Aurora uses a three-layer error handling architecture:

### Layer 1: tRPC Link Interceptor (Critical Errors)

**Location**: `packages/aurora/src/client/trpcClient.ts`

The `criticalErrorInterceptorLink` is placed FIRST in the tRPC link chain and intercepts critical errors before they reach React Query or component code.

**Handles**:

- `401 UNAUTHORIZED`: Session expired
  - Saves current URL to `sessionStorage` for post-login redirect
  - Invalidates CSRF token
  - Performs hard redirect to `/` (login page)
  - Does NOT propagate error (stops error chain completely)

**Why tRPC Link?**

- Earlier interception than React Query
- Framework-agnostic (works even without React Query)
- Can prevent error propagation entirely (no error toasts shown)
- Better UX (seamless redirect without flash of error)

### Layer 2: React Query Global Handler (Non-Critical Errors)

**Location**: `packages/aurora/src/client/App.tsx`

Global `onError` handlers in `QueryClient` configuration log non-critical errors for debugging.

**Handles**:

- `403 FORBIDDEN`: Permission denied (logged as warning)
- `500 INTERNAL_SERVER_ERROR`: Server errors (logged as error)
- All errors still propagate to components for local handling

**Note**: 401 errors never reach this layer (intercepted by tRPC link).

### Layer 3: Component Error Handlers

Components handle domain-specific errors in their `onError` callbacks:

- `409 CONFLICT`: Resource conflicts (e.g., duplicate names)
- `404 NOT_FOUND`: Resource not found
- `400 BAD_REQUEST`: Validation errors

**Example**:

```typescript
const deleteMutation = trpcReact.storage.swift.deleteContainer.useMutation({
  onError: (error) => {
    // 401 never reaches here (handled by tRPC link)
    // 403 logged by React Query, still reaches here

    if (isTRPCConflict(error)) {
      toast({ title: "Conflict", description: "Container name already exists" })
    } else {
      toast({ title: "Error", description: getTRPCErrorMessage(error) })
    }
  },
})
```
````

### Error Type Guards

**Location**: `packages/aurora/src/client/utils/trpcErrors.ts`

Available helpers:

- `isTRPCUnauthorized(error)` - 401 session expired
- `isTRPCForbidden(error)` - 403 permission denied
- `isTRPCNotFound(error)` - 404 not found
- `isTRPCConflict(error)` - 409 resource conflict
- `isTRPCBadRequest(error)` - 400 validation error
- `hasTRPCCode(error, code)` - Generic code check
- `getTRPCErrorMessage(error, fallback?)` - Safe message extraction

### Best Practices

1. **Don't check for 401 in components** - handled automatically by tRPC link
2. **Use type guards** - `isTRPCConflict()` instead of string comparisons
3. **Extract messages safely** - `getTRPCErrorMessage()` instead of `error.message`
4. **Handle domain errors only** - let infrastructure errors be handled by links/React Query
5. **Show user-friendly messages** - translate error codes to human-readable text

### Debugging

Enable verbose logging to see error interception:

```typescript
// Browser console will show:
// [tRPC Critical Error Interceptor] Session expired (401 UNAUTHORIZED)
// [tRPC] Operation that triggered 401: {type: "mutation", path: "storage.swift.deleteContainer"}
// [tRPC] Saved redirect URL: /projects/123/storage
```

### Reference

- Issue: https://github.com/cobaltcore-dev/aurora-dashboard/issues/1055
- tRPC Links: https://trpc.io/docs/client/links
- React Query Error Handling: https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation

````

---

### Task 6: Тестирование

#### Unit Tests

**Файл**: `packages/aurora/src/client/utils/trpcErrors.test.ts`

```typescript
import { describe, it, expect } from "vitest"
import {
  isTRPCUnauthorized,
  isTRPCForbidden,
  isTRPCNotFound,
  isTRPCConflict,
  isTRPCBadRequest,
  hasTRPCCode,
  getTRPCErrorMessage,
} from "./trpcErrors"

describe("trpcErrors", () => {
  describe("isTRPCUnauthorized", () => {
    it("should return true for 401 errors", () => {
      const error = { data: { code: "UNAUTHORIZED" } }
      expect(isTRPCUnauthorized(error)).toBe(true)
    })

    it("should return false for other errors", () => {
      expect(isTRPCUnauthorized({ data: { code: "FORBIDDEN" } })).toBe(false)
      expect(isTRPCUnauthorized(null)).toBe(false)
      expect(isTRPCUnauthorized(undefined)).toBe(false)
      expect(isTRPCUnauthorized("string")).toBe(false)
    })
  })

  describe("isTRPCForbidden", () => {
    it("should return true for 403 errors", () => {
      const error = { data: { code: "FORBIDDEN" } }
      expect(isTRPCForbidden(error)).toBe(true)
    })
  })

  describe("hasTRPCCode", () => {
    it("should check for any error code", () => {
      const error = { data: { code: "CUSTOM_ERROR" } }
      expect(hasTRPCCode(error, "CUSTOM_ERROR")).toBe(true)
      expect(hasTRPCCode(error, "OTHER_ERROR")).toBe(false)
    })
  })

  describe("getTRPCErrorMessage", () => {
    it("should extract error message", () => {
      const error = { message: "Something went wrong" }
      expect(getTRPCErrorMessage(error)).toBe("Something went wrong")
    })

    it("should return fallback for missing message", () => {
      expect(getTRPCErrorMessage({})).toBe("Unknown error")
      expect(getTRPCErrorMessage({}, "Custom fallback")).toBe("Custom fallback")
    })
  })
})
````

**Файл**: `packages/aurora/src/client/trpcClient.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("criticalErrorInterceptorLink", () => {
  let originalLocation: Location
  let mockSessionStorage: Record<string, string>

  beforeEach(() => {
    // Mock window.location
    originalLocation = window.location
    delete (window as any).location
    window.location = { ...originalLocation, href: "" } as Location

    // Mock sessionStorage
    mockSessionStorage = {}
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      mockSessionStorage[key] = value
    })
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
      return mockSessionStorage[key] || null
    })
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key) => {
      delete mockSessionStorage[key]
    })
  })

  afterEach(() => {
    window.location = originalLocation
    vi.restoreAllMocks()
  })

  it("should intercept 401 and redirect to login", async () => {
    // Set current path
    Object.defineProperty(window.location, "pathname", {
      value: "/projects/123/storage",
      writable: true,
    })
    Object.defineProperty(window.location, "search", {
      value: "?container=test",
      writable: true,
    })

    // Mock 401 error
    const error = { data: { code: "UNAUTHORIZED" } }

    // Trigger error through tRPC link
    // ... (implementation depends on how to test tRPC links)

    // Assert: sessionStorage has redirect URL
    expect(mockSessionStorage["redirect_after_login"]).toBe("/projects/123/storage?container=test")

    // Assert: window.location.href is set to "/"
    expect(window.location.href).toBe("/")
  })

  it("should not save redirect for login page", async () => {
    // Set current path to login
    Object.defineProperty(window.location, "pathname", {
      value: "/",
      writable: true,
    })

    // Mock 401 error
    const error = { data: { code: "UNAUTHORIZED" } }

    // Trigger error
    // ...

    // Assert: sessionStorage does NOT have redirect URL
    expect(mockSessionStorage["redirect_after_login"]).toBeUndefined()
  })

  it("should pass through non-401 errors", async () => {
    // Mock 403 error
    const error = { data: { code: "FORBIDDEN" } }

    // Trigger error through tRPC link
    // ...

    // Assert: error was passed to observer.error()
    // Assert: no redirect occurred
    expect(window.location.href).not.toBe("/")
    expect(mockSessionStorage["redirect_after_login"]).toBeUndefined()
  })
})
```

#### Integration Tests

**Файл**: `apps/dashboard/e2e/sessionExpiry.spec.ts`

```typescript
import { test, expect } from "@playwright/test"

test.describe("Session Expiry Handling", () => {
  test("should redirect to login on 401 and return after re-login", async ({ page }) => {
    // 1. Login
    await page.goto("/")
    await page.fill('input[name="username"]', "admin")
    await page.fill('input[name="password"]', "password")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/projects/)

    // 2. Navigate to a specific page
    await page.goto("/projects/test-project/storage")
    await expect(page).toHaveURL("/projects/test-project/storage")

    // 3. Mock BFF to return 401 on next request
    await page.route("**/polaris-bff/**", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Session expired",
          },
        }),
      })
    })

    // 4. Trigger an action that makes an API call (e.g., list containers)
    await page.click('button:has-text("Refresh")')

    // 5. Assert: redirected to login page
    await expect(page).toHaveURL("/")

    // 6. Assert: sessionStorage has saved redirect URL
    const redirectUrl = await page.evaluate(() => sessionStorage.getItem("redirect_after_login"))
    expect(redirectUrl).toBe("/projects/test-project/storage")

    // 7. Re-login (remove route mock first)
    await page.unroute("**/polaris-bff/**")
    await page.fill('input[name="username"]', "admin")
    await page.fill('input[name="password"]', "password")
    await page.click('button[type="submit"]')

    // 8. Assert: redirected back to saved URL
    await expect(page).toHaveURL("/projects/test-project/storage")

    // 9. Assert: sessionStorage redirect URL is cleared
    const redirectUrlAfter = await page.evaluate(() => sessionStorage.getItem("redirect_after_login"))
    expect(redirectUrlAfter).toBeNull()
  })

  test("should not show error toast on 401", async ({ page, context }) => {
    // Listen for toast notifications
    const toasts: string[] = []
    page.on("console", (msg) => {
      if (msg.text().includes("toast") || msg.text().includes("notification")) {
        toasts.push(msg.text())
      }
    })

    // 1. Login and navigate
    await page.goto("/")
    await page.fill('input[name="username"]', "admin")
    await page.fill('input[name="password"]', "password")
    await page.click('button[type="submit"]')
    await page.goto("/projects/test-project/storage")

    // 2. Mock 401 response
    await page.route("**/polaris-bff/**", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Session expired",
          },
        }),
      })
    })

    // 3. Trigger action
    await page.click('button:has-text("Refresh")')

    // 4. Wait for redirect
    await expect(page).toHaveURL("/")

    // 5. Assert: no error toasts were shown
    expect(toasts).toHaveLength(0)
  })

  test("should show error toast for non-401 errors", async ({ page }) => {
    // 1. Login and navigate
    await page.goto("/")
    await page.fill('input[name="username"]', "admin")
    await page.fill('input[name="password"]', "password")
    await page.click('button[type="submit"]')
    await page.goto("/projects/test-project/storage")

    // 2. Mock 403 response (permission denied)
    await page.route("**/polaris-bff/**", (route) => {
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Permission denied",
          },
        }),
      })
    })

    // 3. Trigger action
    await page.click('button:has-text("Delete")')

    // 4. Assert: error toast is shown
    await expect(page.locator(".juno-toast")).toContainText("Permission denied")

    // 5. Assert: NOT redirected
    await expect(page).toHaveURL("/projects/test-project/storage")
  })
})
```

---

## Преимущества финального решения

### Для разработчиков:

- ✅ **Ноль boilerplate**: Не нужно проверять 401 в каждом компоненте
- ✅ **Невозможно забыть**: Истечение сессии обрабатывается автоматически на уровне инфраструктуры
- ✅ **Чистый код**: Component `onError` занимаются только бизнес-логикой (409, 404, validation)
- ✅ **Type-safe**: Улучшенные type guards для всех кодов ошибок
- ✅ **DRY**: Логика обработки 401 в одном месте, а не копируется в десятках компонентов
- ✅ **Onboarding**: Новые разработчики не должны знать о необходимости проверки 401

### Для пользователей:

- ✅ **Seamless experience**: Автоматический редирект на логин с сохранением текущего URL
- ✅ **Нет confusing тостов**: Критические ошибки обрабатываются тихо и изящно
- ✅ **Consistent behavior**: Истечение сессии работает одинаково во всех частях приложения
- ✅ **Preservation of context**: После повторного логина пользователь возвращается на ту же страницу
- ✅ **No data loss**: Нет неожиданных потерь несохраненных данных из-за незаметного истечения сессии

### Code Comparison:

**До** (требует ручной обработки в каждом компоненте):

```typescript
const { mutate } = trpc.storage.swift.deleteContainer.useMutation({
  onError: (error) => {
    // ❌ Developer must remember to check for 401
    if (isTRPCUnauthorized(error)) {
      // ❌ Must remember to save redirect URL
      sessionStorage.setItem("redirect_after_login", window.location.pathname)
      // ❌ Must remember to invalidate CSRF token
      invalidateCsrfToken()
      // ❌ Must remember to redirect
      window.location.href = "/"
      return
    }

    // Domain-specific error handling
    toast({ title: "Error", description: error.message })
  },
})
```

**После** (автоматическая обработка):

```typescript
const { mutate } = trpc.storage.swift.deleteContainer.useMutation({
  // ✅ 401 handled automatically by tRPC link interceptor
  // ✅ Redirect, URL saving, and CSRF invalidation happen transparently

  onError: (error) => {
    // ✅ Only handle domain-specific errors
    // ✅ 401 never reaches here
    toast({ title: "Error", description: getTRPCErrorMessage(error) })
  },
})
```

---

## Риски и соображения

### Потенциальные проблемы:

#### 1. Batched requests

**Проблема**: Если один запрос в batch возвращает 401, должен ли весь batch быть перехвачен?

**Решение**: ✅ Размещение interceptor ДО `splitLink` гарантирует перехват всех ошибок, включая batched requests. tRPC link chain обрабатывает каждую ошибку независимо.

#### 2. Streaming requests

**Проблема**: Долгие SSE connections могут истечь mid-stream.

**Текущая ситуация**: ⚠️ Текущая архитектура уже учитывает это:

- `httpSubscriptionLink` для subscriptions
- `httpBatchStreamLink` для streaming procedures
- Оба используют `csrfCache.getHeaders()` для CSRF токенов

**Решение**: ✅ Interceptor перехватит 401 и при streaming, так как он находится выше по цепочке.

#### 3. Debugging

**Проблема**: Может быть неочевидно, почему ошибка не доходит до компонента.

**Решение**:

- ✅ Добавить verbose `console.warn` с контекстом операции
- ✅ Добавить `console.debug` для сохраненного redirect URL
- ✅ Документировать архитектуру в `CLAUDE.md`
- ✅ Использовать понятные имена функций (`criticalErrorInterceptorLink`)

#### 4. Race conditions

**Проблема**: TanStack Router может попытаться обработать навигацию во время редиректа.

**Решение**: ✅ Используем `window.location.href` вместо `router.navigate()`:

- Делает hard reload
- Очищает все состояние приложения
- Гарантирует чистый старт после истечения сессии

#### 5. Backwards compatibility

**Проблема**: Существующие `onError` хендлеры с проверкой 401.

**Решение**: ✅ Не breaking change:

- Существующие проверки 401 в компонентах просто никогда не сработают
- Все остальные ошибки доходят как раньше
- Компоненты можно постепенно очищать от 401 checks

#### 6. Testing complexity

**Проблема**: Тестирование tRPC link chain может быть сложным.

**Решение**:

- ✅ Unit tests для type guards (простые)
- ✅ Mock-based tests для link behavior
- ✅ E2E tests для реального UX (более ценные)

#### 7. Multiple simultaneous 401s

**Проблема**: Если несколько запросов возвращают 401 одновременно, может ли это вызвать множественные редиректы?

**Решение**: ✅ Нет, потому что:

- Первый 401 делает `window.location.href = "/"`
- Это начинает новую навигацию, которая отменяет все pending requests
- Последующие 401 errors не обрабатываются (страница уже уходит на redirect)

---

### Альтернативные подходы (рассмотрены и отклонены):

#### ❌ Higher-order component wrapper

```typescript
export function withAuthErrorHandling<T>(Component: React.ComponentType<T>) {
  return (props: T) => {
    // Error boundary that checks for 401
    // ...
  }
}
```

**Почему отклонено**:

- Слишком verbose - нужно оборачивать каждый компонент
- Легко забыть обернуть
- Не работает для vanilla tRPC client
- Перехватывает слишком поздно (после render)

#### ❌ Custom hook `useMutationWithAuth`

```typescript
export function useMutationWithAuth<T>(mutation: UseMutationOptions<T>) {
  return useMutation({
    ...mutation,
    onError: (error) => {
      if (isTRPCUnauthorized(error)) {
        // Handle 401
      }
      mutation.onError?.(error)
    },
  })
}
```

**Почему отклонено**:

- Дублирование для `useQuery`, `useSubscription`, etc.
- Неочевидно для новых разработчиков
- Не работает для vanilla tRPC client
- Все равно нужно помнить использовать специальный хук

#### ❌ Middleware в Fastify

```typescript
fastify.addHook("onResponse", (request, reply, done) => {
  if (reply.statusCode === 401) {
    // Send special header for client redirect?
  }
  done()
})
```

**Почему отклонено**:

- Server не должен знать о client-side navigation
- Нет доступа к browser APIs (sessionStorage, window.location)
- Нарушает separation of concerns
- tRPC уже передает статус код в error response

---

## Заключение

### Рекомендуемое решение

Реализовать **tRPC Link Interceptor** (Вариант 1) согласно issue #1055.

Это самый архитектурно правильный подход, который:

- ✅ Решает проблему у корня (на уровне инфраструктуры, а не в каждом компоненте)
- ✅ Не требует изменений в существующих компонентах (backwards compatible)
- ✅ Улучшает UX (нет flash ошибок, seamless redirect)
- ✅ Упрощает разработку (меньше boilerplate, меньше мест для ошибок)
- ✅ Централизует критическую логику (один источник истины)
- ✅ Следует best practices (React Query docs рекомендуют infrastructure-level handling)

### Оценка трудозатрат

**Общее время**: ~3-4 часа

- Task 1 (Type guards): 30 минут
- Task 2 (tRPC Link): 1-1.5 часа (основная работа)
- Task 3 (React Query global handler): 20 минут (опционально)
- Task 4 (Post-login redirect): 20 минут (проверка существующего кода)
- Task 5 (Документация): 30 минут
- Task 6 (Тестирование): 1 час

### Приоритет задач

**Must have** (критично для решения проблемы):

- ✅ Task 1: Type guards
- ✅ Task 2: tRPC Link Interceptor
- ✅ Task 4: Post-login redirect handling
- ✅ Task 6: E2E tests (хотя бы базовый сценарий)

**Should have** (улучшает solution):

- ✅ Task 5: Документация
- ✅ Task 6: Unit tests

**Nice to have** (опционально):

- ⚠️ Task 3: React Query global handler (полезно для логирования, но не критично)

### Следующие шаги

1. Создать branch `feat/centralized-error-handling` от `main`
2. Реализовать Task 1 (type guards) - простая разминка
3. Реализовать Task 2 (tRPC link) - основная работа
4. Реализовать Task 4 (redirect handling) - проверка/дополнение
5. Написать базовый E2E тест (Task 6) - проверка работоспособности
6. Добавить документацию (Task 5)
7. Создать PR с референсом на issue #1055
8. После merge: постепенно очищать компоненты от ручных проверок 401 (не обязательно, но желательно)

### Метрики успеха

После реализации:

- ✅ Ноль новых компонентов с ручной проверкой 401
- ✅ Консистентное UX при истечении сессии во всех частях приложения
- ✅ Уменьшение количества кода в component error handlers
- ✅ Улучшенная developer experience (меньше boilerplate)
- ✅ E2E тесты проходят и подтверждают правильное поведение

---

## Ссылки

- **GitHub Issue**: https://github.com/cobaltcore-dev/aurora-dashboard/issues/1055
- **tRPC Links Documentation**: https://trpc.io/docs/client/links
- **tRPC Custom Links**: https://trpc.io/docs/client/links/customLink
- **React Query Error Handling**: https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation
- **Observable Pattern**: https://github.com/tc39/proposal-observable
- **Project CLAUDE.md**: `/CLAUDE.md`
- **Current Error Utils**: `packages/aurora/src/client/utils/trpcErrors.ts`
- **Current tRPC Client**: `packages/aurora/src/client/trpcClient.ts`
- **AuthProvider**: `packages/aurora/src/client/store/AuthProvider.tsx`

---

**Дата создания**: 2026-07-13  
**Автор анализа**: Claude (Opus 4.8)  
**Статус**: ✅ Ready for implementation
