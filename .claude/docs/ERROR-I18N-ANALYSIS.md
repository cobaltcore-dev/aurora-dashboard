# Анализ проблемы локализации сообщений об ошибках

## Оглавление

- [Текущая ситуация](#текущая-ситуация)
- [Анализ проблемы](#анализ-проблемы)
- [Архитектурные варианты решения](#архитектурные-варианты-решения)
- [Рекомендуемое решение](#рекомендуемое-решение)
- [План реализации](#план-реализации)
- [Примеры кода](#примеры-кода)
- [Тестирование](#тестирование)
- [Миграция существующего кода](#миграция-существующего-кода)

---

## Текущая ситуация

### Как работает сейчас

#### Server-side (BFF)

1. **Коды ошибок как строки** (`errorCodes.ts`):

```typescript
export const ERROR_CODES = {
  GET_FLAVOR_DETAILS_FAILED: "GET_FLAVOR_DETAILS_FAILED",
  FLAVORS_FETCH_FAILED: "FLAVORS_FETCH_FAILED",
  COMPUTE_SERVICE_UNAVAILABLE: "COMPUTE_SERVICE_UNAVAILABLE",
  // ... 87+ error codes
}
```

2. **TRPCError с кодами** (в роутерах):

```typescript
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR", // tRPC HTTP код
  message: ERROR_CODES.CREATE_FLAVOR_FAILED, // строковый ключ
})
```

3. **Hardcoded английские сообщения** (в middleware):

```typescript
throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "The session is invalid", // ❌ Hardcoded English
})

throw new TRPCError({
  code: "FORBIDDEN",
  message: `Access denied. User does not have access to domain ${domain_id}`, // ❌ Hardcoded English
})
```

#### Client-side

1. **Ручной хук для перевода** (`useErrorTranslation.ts`):

```typescript
const translateError = (errorCode: string): string => {
  switch (errorCode) {
    case "FLAVORS_UNAUTHORIZED":
      return t`Your session has expired. Please log in again.`
    case "FLAVORS_FORBIDDEN":
      return t`You don't have permission to access flavors for this project.`
    // ... 150+ case statements
    default:
      return t`An unexpected error occurred. Please try again.`
  }
}
```

2. **Использование в компонентах**:

```typescript
const { translateError } = useErrorTranslation()

onError: (error) => {
  const message =
    error && typeof error === "object" && "message" in error
      ? translateError(error.message) // переводим строковый код
      : t`Login failed. Please check your credentials and try again.`

  toast({ title: "Error", description: message })
}
```

3. **Существующая i18n инфраструктура**:

- **Lingui** с PO формат (`messages.po`)
- Макросы `Trans`, `t`, `msg` для JSX и non-JSX контекста
- `pnpm check-i18n` для экстракции и компиляции переводов
- Поддержка языков: `en`, `de`

---

## Анализ проблемы

### Выявленные проблемы

#### 1. Дублирование и рассинхронизация

**Проблема**: Каждый error code определен в 3 местах:

- `errorCodes.ts` (server) - определение константы
- Router (server) - использование в `throw new TRPCError()`
- `useErrorTranslation.ts` (client) - перевод в человекочитаемое сообщение

**Последствия**:

```typescript
// Server добавляет новый код ошибки
export const ERROR_CODES = {
  DELETE_SERVER_IN_USE: "DELETE_SERVER_IN_USE", // ✅ Добавлено
}

throw new TRPCError({
  code: "CONFLICT",
  message: ERROR_CODES.DELETE_SERVER_IN_USE, // ✅ Используется
})

// Client - разработчик забывает добавить перевод
const translateError = (errorCode: string): string => {
  switch (errorCode) {
    // ❌ Нет case для DELETE_SERVER_IN_USE
    default:
      return t`An unexpected error occurred. Please try again.`
    // Пользователь видит generic ошибку вместо конкретной
  }
}
```

**Статистика**:

- 89 error codes в `errorCodes.ts`
- 213 использований `ERROR_CODES.` в server code
- ~160 case statements в `useErrorTranslation.ts`
- ❌ Нет проверки полноты покрытия

#### 2. Hardcoded английские сообщения в middleware

**Проблема**: Middleware и tRPC procedures содержат hardcoded английские тексты:

```typescript
// trpc.ts - middleware
throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "The session is invalid", // ❌ Hardcoded English
})

throw new TRPCError({
  code: "FORBIDDEN",
  message: `Access denied. User does not have access to domain ${domain_id}`, // ❌ Template string
})

throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "Failed to scope session to project. User may not have access to this project.", // ❌ Long English
})
```

**Последствия**:

- Немецкие пользователи видят английские сообщения даже при выбранном `de` языке
- Невозможно добавить новые языки (французский, испанский, и т.д.)
- Нарушение единообразия UX

#### 3. Client не знает язык пользователя при SSR/первом запросе

**Проблема**: Server не имеет доступа к:

- Browser `Accept-Language` header (не передается в tRPC context)
- Client-side i18n state (`i18n.locale`)

**Текущий flow**:

```
1. User выбирает язык в UI → i18n.activate("de")
2. User делает tRPC call → server не знает о выборе
3. Server возвращает error.message = "CREATE_FLAVOR_FAILED"
4. Client переводит через useErrorTranslation → t`Failed to create...` (на DE)
```

**Проблема**: Если в будущем потребуется server-side rendering или email уведомления с ошибками, server не сможет локализовать сообщения.

#### 4. Отсутствие type safety

**Проблема**: Нет гарантии, что client обрабатывает все возможные коды ошибок:

```typescript
// Server добавляет код
export const ERROR_CODES = {
  NEW_ERROR_CODE: "NEW_ERROR_CODE",
}

// TypeScript НЕ заставляет добавить case в switch
// Ошибка обнаружится только в runtime
```

#### 5. Масштабируемость

**Текущий подход**:

- 160+ case statements в switch
- При добавлении нового домена (e.g., Orchestration, Database) нужно добавлять десятки новых cases
- Файл `useErrorTranslation.ts` растет линейно с количеством features

---

## Архитектурные варианты решения

### Вариант 1: Error codes как i18n ключи (рекомендуется)

**Суть**: Server бросает error codes, client автоматически переводит их через Lingui catalog.

**Архитектура**:

```typescript
// ========== SERVER ==========
// errorCodes.ts
export const ERROR_CODES = {
  FLAVORS_FETCH_FAILED: "error.flavors.fetch_failed",     // i18n key format
  CREATE_FLAVOR_FORBIDDEN: "error.flavors.create.forbidden",
  SESSION_INVALID: "error.auth.session_invalid",
} as const

// flavorRouter.ts
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: ERROR_CODES.FLAVORS_FETCH_FAILED,  // "error.flavors.fetch_failed"
})

// ========== CLIENT ==========
// messages.po
msgid "error.flavors.fetch_failed"
msgstr "Failed to fetch flavors from server."

msgid "error.flavors.create.forbidden"
msgstr "You don't have permission to create flavors."

// useErrorTranslation.ts (УДАЛЕН - не нужен!)

// Component
import { i18n } from "@lingui/core"

onError: (error) => {
  const messageKey = error.message  // "error.flavors.fetch_failed"
  const translated = i18n._(messageKey)  // Lingui автоматически переводит

  toast({ title: "Error", description: translated })
}
```

**Преимущества**:

- ✅ **Единый источник истины**: Переводы в `.po` файлах
- ✅ **Type safety**: TypeScript может проверить, что все ключи существуют
- ✅ **Автоматическая экстракция**: `pnpm check-i18n` находит непереведенные ключи
- ✅ **Масштабируемость**: Добавление нового error = 1 строка в PO файле
- ✅ **Стандартная практика**: Соответствует i18n best practices
- ✅ **Удаление дублирования**: Убираем гигантский switch в `useErrorTranslation`

**Недостатки**:

- ⚠️ **Миграция**: Нужно переименовать все 89+ error codes
- ⚠️ **Breaking change**: Изменяется формат error messages
- ⚠️ **Fallback**: Нужен механизм для ключей, которых нет в catalog

---

### Вариант 2: Server-side i18n с Accept-Language header

**Суть**: Server переводит сообщения на основе `Accept-Language` header.

**Архитектура**:

```typescript
// ========== SERVER ==========
// i18n.ts (server-side Lingui setup)
import { i18n } from "@lingui/core"
import { messages as enMessages } from "../locales/en/messages"
import { messages as deMessages } from "../locales/de/messages"

i18n.load({ en: enMessages, de: deMessages })

// context.ts
export function createContext(req: FastifyRequest) {
  const locale = req.headers["accept-language"]?.split(",")[0] || "en"
  i18n.activate(locale)

  return {
    locale,
    t: i18n._, // Expose translation function
  }
}

// trpc.ts
throw new TRPCError({
  code: "UNAUTHORIZED",
  message: ctx.t("error.auth.session_invalid"), // Переводится на server
})

// ========== CLIENT ==========
// trpcClient.ts
httpBatchLink({
  url: config.bffEndpoint,
  headers: () => ({
    "Accept-Language": i18n.locale, // Передаем текущий язык
  }),
})

// Component
onError: (error) => {
  // Сообщение уже переведено на server
  toast({ title: "Error", description: error.message })
}
```

**Преимущества**:

- ✅ **Полная локализация**: Все сообщения приходят уже переведенными
- ✅ **Работает для SSR**: Server может отрендерить локализованные ошибки
- ✅ **Работает для emails**: Уведомления могут быть локализованы
- ✅ **Client проще**: Не нужно переводить на клиенте

**Недостатки**:

- ❌ **Дублирование catalog**: Нужны `.po` файлы и на server, и на client
- ❌ **Bundle size**: Server bundle включает все переводы
- ❌ **Сложность**: Lingui официально не поддерживает Node.js runtime
- ❌ **Dynamic locale**: Если user меняет язык в UI, нужно invalidate все queries
- ❌ **Caching**: HTTP cache может вернуть ответ на неправильном языке

---

### Вариант 3: Структурированные ошибки с параметрами

**Суть**: Server возвращает error code + параметры, client форматирует с i18n.

**Архитектура**:

```typescript
// ========== SERVER ==========
// Structured error format
throw new TRPCError({
  code: "FORBIDDEN",
  message: JSON.stringify({
    code: "error.auth.domain_access_denied",
    params: { domainId: domain_id },
  }),
})

// ========== CLIENT ==========
// messages.po
msgid "error.auth.domain_access_denied"
msgstr "Access denied. User does not have access to domain {domainId}"

// Component
import { i18n } from "@lingui/core"

onError: (error) => {
  const parsed = JSON.parse(error.message)
  const translated = i18n._(parsed.code, parsed.params)

  toast({ title: "Error", description: translated })
}
```

**Преимущества**:

- ✅ **Параметризация**: Поддержка динамических значений (IDs, counts)
- ✅ **Client-side locale**: Пользователь может менять язык без invalidation
- ✅ **Rich formatting**: Plurals, select, date/time formatting

**Недостатки**:

- ⚠️ **Парсинг**: Нужно парсить JSON в каждом error handler
- ⚠️ **Типизация**: Сложнее обеспечить type safety для параметров
- ⚠️ **Fallback**: Если парсинг fail, теряется сообщение

---

### Вариант 4: Гибрид - codes для домена, structured для middleware

**Суть**: Комбинация Варианта 1 (для domain errors) и Варианта 3 (для middleware).

**Архитектура**:

```typescript
// ========== SERVER ==========
// Domain errors - simple codes
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "error.flavors.fetch_failed", // Simple i18n key
})

// Middleware errors - structured with params
throw new TRPCError({
  code: "FORBIDDEN",
  message: JSON.stringify({
    code: "error.auth.domain_access_denied",
    params: { domainId: domain_id },
  }),
})

// ========== CLIENT ==========
// Unified error handler
function translateTRPCError(error: unknown): string {
  const message = getTRPCErrorMessage(error)

  // Try parsing as structured error
  if (message.startsWith("{")) {
    try {
      const { code, params } = JSON.parse(message)
      return i18n._(code, params)
    } catch {
      // Fall through to simple translation
    }
  }

  // Simple i18n key
  return i18n._(message)
}
```

**Преимущества**:

- ✅ **Лучшее из обоих**: Простота для domain errors, гибкость для middleware
- ✅ **Постепенная миграция**: Можно мигрировать по частям
- ✅ **Обратная совместимость**: Старые коды работают как fallback

**Недостатки**:

- ⚠️ **Сложность**: Два разных формата ошибок
- ⚠️ **Inconsistency**: Разработчики должны знать, когда использовать какой формат

---

## Рекомендуемое решение

### Вариант 1 (Error codes как i18n ключи) + Улучшения

**Почему именно этот вариант**:

1. **Соответствует архитектуре проекта**:
   - Lingui уже используется на client
   - PO файлы уже есть и поддерживаются
   - `pnpm check-i18n` уже в CI/CD pipeline

2. **Минимальная сложность**:
   - Не требует server-side i18n setup
   - Не требует парсинга JSON
   - Привычный паттерн для React разработчиков

3. **Масштабируемость**:
   - Линейный рост PO файла (а не switch cases)
   - Автоматическая экстракция непереведенных ключей
   - Легко добавлять новые языки

4. **Developer Experience**:
   - Type safety через TypeScript + Lingui
   - Автокомплит для i18n ключей в IDE
   - Compile-time проверка через `check-i18n`

### Улучшения над базовым Вариантом 1

#### 1. Структурированный формат для параметризации

**Когда нужны параметры** (domain IDs, counts, names):

```typescript
// Server
throw new TRPCError({
  code: "FORBIDDEN",
  message: JSON.stringify({
    key: "error.auth.domain_access_denied",
    params: { domainId: domain_id },
  }),
})

// Client - умный helper
function translateError(error: unknown): string {
  const message = getTRPCErrorMessage(error)

  // Structured error
  if (message.startsWith("{")) {
    const { key, params } = JSON.parse(message)
    return i18n._(key, params)
  }

  // Simple key
  if (message.startsWith("error.")) {
    const translated = i18n._(message)
    // Fallback if key not in catalog
    return translated !== message ? translated : i18n._("error.unknown")
  }

  // Legacy hardcoded message (for backwards compat during migration)
  return message
}
```

#### 2. Type-safe error code generator

**Проблема**: Опечатки в error codes не отлавливаются compile-time.

**Решение**:

```typescript
// errorCodes.ts
export const ERROR_CODES = {
  FLAVORS: {
    FETCH_FAILED: "error.flavors.fetch_failed",
    CREATE_FORBIDDEN: "error.flavors.create.forbidden",
  },
  AUTH: {
    SESSION_INVALID: "error.auth.session_invalid",
    DOMAIN_ACCESS_DENIED: "error.auth.domain_access_denied",
  },
} as const

// Type для всех возможных ключей
export type ErrorCode =
  (typeof ERROR_CODES)[keyof typeof ERROR_CODES][keyof (typeof ERROR_CODES)[keyof typeof ERROR_CODES]]

// Helper для создания structured errors
export function createStructuredError(code: ErrorCode, params?: Record<string, string | number>): string {
  return params ? JSON.stringify({ key: code, params }) : code
}

// Usage
throw new TRPCError({
  code: "FORBIDDEN",
  message: createStructuredError(ERROR_CODES.AUTH.DOMAIN_ACCESS_DENIED, { domainId: domain_id }),
})
```

#### 3. Compile-time проверка полноты переводов

**Цель**: Гарантировать, что каждый error code имеет перевод.

**Реализация**:

```typescript
// scripts/validateErrorTranslations.ts
import { ERROR_CODES } from "../src/server/errorCodes"
import { messages as enMessages } from "../src/locales/en/messages"
import { messages as deMessages } from "../src/locales/de/messages"

// Extract all error code values
const allErrorCodes = Object.values(ERROR_CODES).flatMap((category) =>
  typeof category === "object" ? Object.values(category) : [category]
)

// Check English translations
const missingEn = allErrorCodes.filter((code) => !(code in enMessages))
if (missingEn.length > 0) {
  console.error("Missing English translations:", missingEn)
  process.exit(1)
}

// Check German translations
const missingDe = allErrorCodes.filter((code) => !(code in deMessages))
if (missingDe.length > 0) {
  console.error("Missing German translations:", missingDe)
  process.exit(1)
}
```

**В CI**:

```json
// package.json
{
  "scripts": {
    "check-i18n": "lingui extract && lingui compile && tsx scripts/validateErrorTranslations.ts"
  }
}
```

#### 4. Централизованный error helper

**Цель**: Единая точка обработки ошибок во всех компонентах.

```typescript
// utils/translateTRPCError.ts
import { i18n } from "@lingui/core"
import { getTRPCErrorMessage } from "./trpcErrors"

interface StructuredError {
  key: string
  params?: Record<string, string | number>
}

/**
 * Translates a tRPC error to a user-friendly localized message.
 *
 * Supports three formats:
 * 1. Structured error: { key: "error.foo", params: { id: "123" } }
 * 2. Simple i18n key: "error.foo.bar"
 * 3. Legacy hardcoded message (for backwards compatibility)
 *
 * @param error - The tRPC error to translate
 * @param fallback - Fallback message if translation not found
 * @returns Localized error message
 */
export function translateTRPCError(error: unknown, fallback?: string): string {
  const message = getTRPCErrorMessage(error)

  // Try parsing as structured error
  if (message.startsWith("{")) {
    try {
      const { key, params }: StructuredError = JSON.parse(message)
      const translated = i18n._(key, params)

      // If key not found in catalog, Lingui returns the key itself
      if (translated === key) {
        console.warn(`[i18n] Missing translation for error key: ${key}`)
        return fallback ?? i18n._("error.unknown")
      }

      return translated
    } catch (parseError) {
      console.error("[i18n] Failed to parse structured error:", message)
      return fallback ?? i18n._("error.unknown")
    }
  }

  // Simple i18n key (starts with "error.")
  if (message.startsWith("error.")) {
    const translated = i18n._(message)

    if (translated === message) {
      console.warn(`[i18n] Missing translation for error key: ${message}`)
      return fallback ?? i18n._("error.unknown")
    }

    return translated
  }

  // Legacy hardcoded message or unknown format
  // During migration, this handles old error messages
  console.warn("[i18n] Legacy error message format:", message)
  return message
}
```

---

## План реализации

### Phase 1: Infrastructure Setup (2-3 часа)

#### Task 1.1: Реорганизация ERROR_CODES

**Файл**: `packages/aurora/src/server/errorCodes.ts`

**До**:

```typescript
export const ERROR_CODES = {
  GET_FLAVOR_DETAILS_FAILED: "GET_FLAVOR_DETAILS_FAILED",
  FLAVORS_FETCH_FAILED: "FLAVORS_FETCH_FAILED",
  // ...
}
```

**После**:

```typescript
/**
 * Centralized error codes for server-side error handling.
 *
 * Each code is an i18n key that maps to a translation in:
 * - packages/aurora/src/locales/en/messages.po
 * - packages/aurora/src/locales/de/messages.po
 *
 * Format: error.<domain>.<action>.<reason>
 * Examples:
 *   - error.flavors.fetch.failed
 *   - error.auth.session.invalid
 *   - error.network.security_group.create.forbidden
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTH: {
    SESSION_INVALID: "error.auth.session.invalid",
    SESSION_EXPIRED: "error.auth.session.expired",
    RESCOPE_PROJECT_FAILED: "error.auth.rescope.project_failed",
    RESCOPE_DOMAIN_FAILED: "error.auth.rescope.domain_failed",
    DOMAIN_ACCESS_DENIED: "error.auth.domain.access_denied",
    USER_INFO_FETCH_FAILED: "error.auth.user_info.fetch_failed",
  },

  // Compute - Flavors
  FLAVORS: {
    FETCH_FAILED: "error.flavors.fetch.failed",
    GET_DETAILS_FAILED: "error.flavors.get_details.failed",
    CREATE_FAILED: "error.flavors.create.failed",
    DELETE_FAILED: "error.flavors.delete.failed",
    EXTRA_SPECS_CREATE_FAILED: "error.flavors.extra_specs.create.failed",
    EXTRA_SPECS_GET_FAILED: "error.flavors.extra_specs.get.failed",
    EXTRA_SPECS_DELETE_FAILED: "error.flavors.extra_specs.delete.failed",
    ACCESS_GET_FAILED: "error.flavors.access.get.failed",
    TENANT_ACCESS_ADD_FAILED: "error.flavors.tenant_access.add.failed",
    TENANT_ACCESS_REMOVE_FAILED: "error.flavors.tenant_access.remove.failed",
  },

  // Service Availability
  SERVICES: {
    COMPUTE_UNAVAILABLE: "error.services.compute.unavailable",
    COMPUTE_CONNECTION_FAILED: "error.services.compute.connection_failed",
    IDENTITY_UNAVAILABLE: "error.services.identity.unavailable",
    NETWORK_UNAVAILABLE: "error.services.network.unavailable",
    STORAGE_UNAVAILABLE: "error.services.storage.unavailable",
  },

  // Generic
  GENERIC: {
    UNKNOWN: "error.unknown",
    INTERNAL_SERVER_ERROR: "error.internal_server",
    VALIDATION_FAILED: "error.validation.failed",
  },
} as const

// Type for all error codes (flat)
type ErrorCodeCategory = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
export type ErrorCode = ErrorCodeCategory[keyof ErrorCodeCategory]

// Helper to create structured errors with parameters
export interface StructuredError {
  key: ErrorCode
  params?: Record<string, string | number | boolean>
}

export function createStructuredError(code: ErrorCode, params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) {
    return code
  }
  return JSON.stringify({ key: code, params } satisfies StructuredError)
}
```

---

#### Task 1.2: Обновление middleware с новыми кодами

**Файл**: `packages/aurora/src/server/trpc.ts`

**Заменить hardcoded сообщения**:

```typescript
import { ERROR_CODES, createStructuredError } from "./errorCodes"

// protectedProcedure
if (opts.ctx.validateSession() === false) {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: ERROR_CODES.AUTH.SESSION_INVALID, // ✅ i18n key
  })
}

// projectScopedProcedure
if (!openstackSession) {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: ERROR_CODES.AUTH.RESCOPE_PROJECT_FAILED, // ✅ i18n key
  })
}

// domainScopedProcedure
if (!userInfo) {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: ERROR_CODES.AUTH.USER_INFO_FETCH_FAILED, // ✅ i18n key
  })
}

if (!hasAccess) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: createStructuredError(
      ERROR_CODES.AUTH.DOMAIN_ACCESS_DENIED,
      { domainId: domain_id } // ✅ Параметризация
    ),
  })
}
```

---

#### Task 1.3: Client-side helper

**Создать**: `packages/aurora/src/client/utils/translateTRPCError.ts`

```typescript
import { i18n } from "@lingui/core"
import { getTRPCErrorMessage } from "./trpcErrors"

interface StructuredError {
  key: string
  params?: Record<string, string | number | boolean>
}

/**
 * Translates a tRPC error to a user-friendly localized message.
 *
 * Supports:
 * - Structured errors: { key: "error.foo", params: { id: "123" } }
 * - Simple i18n keys: "error.foo.bar"
 * - Legacy hardcoded messages (for backwards compatibility)
 *
 * @param error - The tRPC error object
 * @param fallbackKey - Optional fallback i18n key (defaults to "error.unknown")
 * @returns Localized error message
 *
 * @example
 * // Simple key
 * translateTRPCError(error)
 * // => "Failed to fetch flavors from server."
 *
 * // Structured with params
 * translateTRPCError(error)
 * // => "Access denied. User does not have access to domain abc-123"
 *
 * // With fallback
 * translateTRPCError(error, "error.operation_failed")
 * // => "Operation failed. Please try again."
 */
export function translateTRPCError(error: unknown, fallbackKey = "error.unknown"): string {
  const message = getTRPCErrorMessage(error, "")

  if (!message) {
    return i18n._(fallbackKey)
  }

  // Try parsing as structured error
  if (message.startsWith("{")) {
    try {
      const structured: StructuredError = JSON.parse(message)
      const translated = i18n._(structured.key, structured.params)

      // Lingui returns the key itself if translation not found
      if (translated === structured.key) {
        console.warn(`[translateTRPCError] Missing translation for: ${structured.key}`)
        return i18n._(fallbackKey)
      }

      return translated
    } catch (parseError) {
      console.error("[translateTRPCError] Failed to parse structured error:", message, parseError)
      return i18n._(fallbackKey)
    }
  }

  // Simple i18n key (starts with "error.")
  if (message.startsWith("error.")) {
    const translated = i18n._(message)

    if (translated === message) {
      console.warn(`[translateTRPCError] Missing translation for: ${message}`)
      return i18n._(fallbackKey)
    }

    return translated
  }

  // Legacy hardcoded message or unknown format
  // During migration period, this branch handles old error formats
  if (import.meta.env.DEV) {
    console.warn("[translateTRPCError] Legacy error format (should migrate):", message)
  }

  return message
}

/**
 * Hook version of translateTRPCError for use in React components.
 * Re-translates when i18n locale changes.
 */
export function useTranslateTRPCError() {
  // Force re-render when locale changes
  const locale = i18n.locale

  return (error: unknown, fallbackKey = "error.unknown") => {
    return translateTRPCError(error, fallbackKey)
  }
}
```

---

#### Task 1.4: Добавление переводов в PO файлы

**Файл**: `packages/aurora/src/locales/en/messages.po`

**Добавить секцию для ошибок**:

```po
# =============================================================================
# Error Messages
# =============================================================================

# Authentication & Authorization
msgid "error.auth.session.invalid"
msgstr "Your session is invalid. Please log in again."

msgid "error.auth.session.expired"
msgstr "Your session has expired. Please log in again."

msgid "error.auth.rescope.project_failed"
msgstr "Failed to access this project. You may not have permission."

msgid "error.auth.rescope.domain_failed"
msgstr "Failed to access this domain. Please try again or contact support."

msgid "error.auth.domain.access_denied"
msgstr "Access denied. You don't have access to domain {domainId}."

msgid "error.auth.user_info.fetch_failed"
msgstr "Failed to verify your access. Please try again or contact support."

# Compute - Flavors
msgid "error.flavors.fetch.failed"
msgstr "Failed to fetch flavors from server. Please try again."

msgid "error.flavors.get_details.failed"
msgstr "Failed to load flavor details. Please try again."

msgid "error.flavors.create.failed"
msgstr "Failed to create the flavor. Please try again."

msgid "error.flavors.delete.failed"
msgstr "Failed to delete the flavor. Please try again."

msgid "error.flavors.extra_specs.create.failed"
msgstr "Failed to create extra specs. Please try again."

msgid "error.flavors.extra_specs.get.failed"
msgstr "Failed to load extra specs. Please try again."

msgid "error.flavors.extra_specs.delete.failed"
msgstr "Failed to delete the extra spec. Please try again."

msgid "error.flavors.access.get.failed"
msgstr "Failed to fetch flavor access information. Please try again."

msgid "error.flavors.tenant_access.add.failed"
msgstr "Failed to add tenant access to flavor. Please try again."

msgid "error.flavors.tenant_access.remove.failed"
msgstr "Failed to remove tenant access from flavor. Please try again."

# Service Availability
msgid "error.services.compute.unavailable"
msgstr "The compute service is currently unavailable. Please try again later."

msgid "error.services.compute.connection_failed"
msgstr "Unable to connect to the compute service. Please check your connection."

msgid "error.services.identity.unavailable"
msgstr "The identity service is currently unavailable. Please try again later."

msgid "error.services.network.unavailable"
msgstr "The network service is currently unavailable. Please try again later."

msgid "error.services.storage.unavailable"
msgstr "The storage service is currently unavailable. Please try again later."

# Generic
msgid "error.unknown"
msgstr "An unexpected error occurred. Please try again."

msgid "error.internal_server"
msgstr "Internal server error. Please try again later."

msgid "error.validation.failed"
msgstr "Validation failed. Please check your input."
```

**Аналогично для немецкого** (`de/messages.po`):

```po
msgid "error.auth.session.invalid"
msgstr "Ihre Sitzung ist ungültig. Bitte melden Sie sich erneut an."

msgid "error.flavors.fetch.failed"
msgstr "Flavors konnten nicht vom Server abgerufen werden. Bitte versuchen Sie es erneut."

# ... и т.д.
```

---

### Phase 2: Migration of Domain Routers (4-6 часов)

#### Task 2.1: Миграция Flavor router

**Файл**: `packages/aurora/src/server/Compute/routers/flavorRouter.ts`

**До**:

```typescript
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE, // "COMPUTE_SERVICE_UNAVAILABLE"
})
```

**После**:

```typescript
import { ERROR_CODES } from "../../errorCodes"

throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: ERROR_CODES.SERVICES.COMPUTE_UNAVAILABLE, // "error.services.compute.unavailable"
})
```

**Полная замена**:

```typescript
// flavorRouter.ts
export const flavorRouter = {
  getFlavorById: projectScopedProcedure
    .input(z.object({ project_id: z.string(), flavorId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const compute = ctx.openstack?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.SERVICES.COMPUTE_UNAVAILABLE, // ✅ Новый ключ
          })
        }

        return await getFlavorById(compute, input.flavorId)
      } catch (error) {
        if (error instanceof TRPCError) throw error

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.FLAVORS.GET_DETAILS_FAILED, // ✅ Новый ключ
          cause: error,
        })
      }
    }),

  // ... остальные procedures аналогично
}
```

---

#### Task 2.2: Миграция компонентов на новый helper

**Файл**: `packages/aurora/src/client/routes/_auth/projects/$projectId/compute/-components/Flavors/-components/CreateFlavorModal.tsx`

**До**:

```typescript
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"

const { translateError } = useErrorTranslation()

const createMutation = trpcReact.compute.flavor.createFlavor.useMutation({
  onError: (error) => {
    const message = translateError(error.message) // ❌ Старый хук
    toast({ title: "Error", description: message })
  },
})
```

**После**:

```typescript
import { translateTRPCError } from "@/client/utils/translateTRPCError"

const createMutation = trpcReact.compute.flavor.createFlavor.useMutation({
  onError: (error) => {
    const message = translateTRPCError(error) // ✅ Новый helper
    toast({ title: "Error", description: message })
  },
})
```

**Еще лучше - с fallback**:

```typescript
onError: (error) => {
  const message = translateTRPCError(error, "error.flavors.create.failed")
  toast({
    title: t`Error`,
    description: message,
    variant: "error",
  })
}
```

---

### Phase 3: Validation & Tooling (2 часа)

#### Task 3.1: Script для проверки полноты переводов

**Создать**: `packages/aurora/scripts/validateErrorTranslations.ts`

```typescript
#!/usr/bin/env tsx

import { ERROR_CODES } from "../src/server/errorCodes"
import { messages as enMessages } from "../src/locales/en/messages"
import { messages as deMessages } from "../src/locales/de/messages"

/**
 * Validates that all error codes have translations in all supported locales.
 *
 * Run with: pnpm tsx scripts/validateErrorTranslations.ts
 * CI: Automatically runs after `pnpm check-i18n`
 */

// Extract all error code values recursively
function extractErrorCodes(obj: Record<string, any>, prefix = ""): string[] {
  const codes: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      codes.push(value)
    } else if (typeof value === "object" && value !== null) {
      codes.push(...extractErrorCodes(value, `${prefix}${key}.`))
    }
  }

  return codes
}

const allErrorCodes = extractErrorCodes(ERROR_CODES)

console.log(`\n📋 Found ${allErrorCodes.length} error codes to validate\n`)

// Check English translations
console.log("🇬🇧 Checking English translations...")
const missingEn = allErrorCodes.filter((code) => !enMessages[code])
if (missingEn.length > 0) {
  console.error(`❌ Missing ${missingEn.length} English translations:`)
  missingEn.forEach((code) => console.error(`   - ${code}`))
  process.exit(1)
} else {
  console.log("✅ All error codes have English translations")
}

// Check German translations
console.log("\n🇩🇪 Checking German translations...")
const missingDe = allErrorCodes.filter((code) => !deMessages[code])
if (missingDe.length > 0) {
  console.error(`❌ Missing ${missingDe.length} German translations:`)
  missingDe.forEach((code) => console.error(`   - ${code}`))
  process.exit(1)
} else {
  console.log("✅ All error codes have German translations")
}

// Check for unused translations (translations that don't match any error code)
console.log("\n🧹 Checking for unused error translations...")
const errorKeys = Object.keys(enMessages).filter((key) => key.startsWith("error."))
const unusedKeys = errorKeys.filter((key) => !allErrorCodes.includes(key))
if (unusedKeys.length > 0) {
  console.warn(`⚠️  Found ${unusedKeys.length} unused error translations (may be legacy):`)
  unusedKeys.slice(0, 10).forEach((key) => console.warn(`   - ${key}`))
  if (unusedKeys.length > 10) {
    console.warn(`   ... and ${unusedKeys.length - 10} more`)
  }
}

console.log("\n✅ All error translations are valid!\n")
```

**Обновить**: `packages/aurora/package.json`

```json
{
  "scripts": {
    "check-i18n": "lingui extract && lingui compile && tsx scripts/validateErrorTranslations.ts",
    "validate-errors": "tsx scripts/validateErrorTranslations.ts"
  }
}
```

---

#### Task 3.2: ESLint rule для принудительного использования ERROR_CODES

**Создать**: `packages/aurora/.eslintrc.cjs`

```javascript
module.exports = {
  // ... existing config
  rules: {
    // ... existing rules

    // Prevent hardcoded error messages in TRPCError
    "no-restricted-syntax": [
      "error",
      {
        selector: "NewExpression[callee.name='TRPCError'] Property[key.name='message'] Literal[value=/^[A-Z].*$/]",
        message: "Use ERROR_CODES instead of hardcoded error messages in TRPCError",
      },
    ],
  },
}
```

**Что это запрещает**:

```typescript
// ❌ ESLint error
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "Something went wrong", // Hardcoded string starting with capital letter
})

// ✅ OK
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: ERROR_CODES.GENERIC.UNKNOWN, // Using constant
})
```

---

### Phase 4: Testing (2-3 часа)

#### Task 4.1: Unit tests для translateTRPCError

**Создать**: `packages/aurora/src/client/utils/translateTRPCError.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest"
import { translateTRPCError } from "./translateTRPCError"
import { i18n } from "@lingui/core"
import { messages as enMessages } from "../../locales/en/messages"

describe("translateTRPCError", () => {
  beforeEach(() => {
    i18n.load({ en: enMessages })
    i18n.activate("en")
  })

  describe("Simple i18n key", () => {
    it("should translate valid error key", () => {
      const error = { message: "error.flavors.fetch.failed" }
      const result = translateTRPCError(error)

      expect(result).toBe("Failed to fetch flavors from server. Please try again.")
      expect(result).not.toBe("error.flavors.fetch.failed")
    })

    it("should return fallback for missing key", () => {
      const error = { message: "error.nonexistent.key" }
      const result = translateTRPCError(error)

      expect(result).toBe("An unexpected error occurred. Please try again.")
    })

    it("should use custom fallback", () => {
      const error = { message: "error.nonexistent.key" }
      const result = translateTRPCError(error, "error.internal_server")

      expect(result).toBe("Internal server error. Please try again later.")
    })
  })

  describe("Structured error with params", () => {
    it("should translate with parameters", () => {
      const error = {
        message: JSON.stringify({
          key: "error.auth.domain.access_denied",
          params: { domainId: "abc-123" },
        }),
      }
      const result = translateTRPCError(error)

      expect(result).toContain("abc-123")
      expect(result).toContain("Access denied")
    })

    it("should handle missing params", () => {
      const error = {
        message: JSON.stringify({
          key: "error.flavors.fetch.failed",
        }),
      }
      const result = translateTRPCError(error)

      expect(result).toBe("Failed to fetch flavors from server. Please try again.")
    })

    it("should return fallback for invalid JSON", () => {
      const error = { message: "{invalid json" }
      const result = translateTRPCError(error)

      expect(result).toBe("An unexpected error occurred. Please try again.")
    })
  })

  describe("Legacy hardcoded messages", () => {
    it("should pass through legacy English messages", () => {
      const error = { message: "Something went wrong" }
      const result = translateTRPCError(error)

      expect(result).toBe("Something went wrong")
    })

    it("should handle empty message", () => {
      const error = { message: "" }
      const result = translateTRPCError(error)

      expect(result).toBe("An unexpected error occurred. Please try again.")
    })
  })

  describe("Edge cases", () => {
    it("should handle non-error objects", () => {
      const result = translateTRPCError(null)
      expect(result).toBe("An unexpected error occurred. Please try again.")
    })

    it("should handle errors without message", () => {
      const error = { code: "INTERNAL_SERVER_ERROR" }
      const result = translateTRPCError(error)

      expect(result).toBe("An unexpected error occurred. Please try again.")
    })
  })
})
```

---

#### Task 4.2: Integration test для полного flow

**Создать**: `packages/aurora/src/client/utils/translateTRPCError.integration.test.tsx`

```typescript
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { translateTRPCError } from "./translateTRPCError"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { messages as enMessages } from "../../locales/en/messages"
import { messages as deMessages } from "../../locales/de/messages"

describe("translateTRPCError - i18n integration", () => {
  it("should translate to German when locale is de", () => {
    i18n.load({ de: deMessages })
    i18n.activate("de")

    const error = { message: "error.flavors.fetch.failed" }
    const result = translateTRPCError(error)

    expect(result).toBe("Flavors konnten nicht vom Server abgerufen werden. Bitte versuchen Sie es erneut.")
    expect(result).not.toContain("Failed to fetch") // English
  })

  it("should re-translate when locale changes", () => {
    i18n.load({ en: enMessages, de: deMessages })

    const error = { message: "error.auth.session.invalid" }

    // English
    i18n.activate("en")
    const enResult = translateTRPCError(error)
    expect(enResult).toContain("session is invalid")

    // German
    i18n.activate("de")
    const deResult = translateTRPCError(error)
    expect(deResult).toContain("Sitzung ist ungültig")
  })

  it("should work in React component", () => {
    i18n.load({ en: enMessages })
    i18n.activate("en")

    function ErrorDisplay({ error }: { error: unknown }) {
      const message = translateTRPCError(error)
      return <div data-testid="error">{message}</div>
    }

    const error = { message: "error.flavors.create.failed" }
    render(
      <I18nProvider i18n={i18n}>
        <ErrorDisplay error={error} />
      </I18nProvider>
    )

    expect(screen.getByTestId("error")).toHaveTextContent("Failed to create the flavor")
  })
})
```

---

### Phase 5: Documentation (1 час)

#### Task 5.1: Обновление CLAUDE.md

**Файл**: `CLAUDE.md`

**Добавить секцию**:

````markdown
## Error Handling and Internationalization

Aurora uses a centralized error handling system with full i18n support.

### Error Code Architecture

**Server-side** (`packages/aurora/src/server/errorCodes.ts`):

- All errors use i18n keys: `error.<domain>.<action>.<reason>`
- Organized by domain (AUTH, FLAVORS, SERVICES, etc.)
- Type-safe via TypeScript const assertions

```typescript
import { ERROR_CODES, createStructuredError } from "./errorCodes"

// Simple error
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: ERROR_CODES.FLAVORS.FETCH_FAILED, // "error.flavors.fetch.failed"
})

// Error with dynamic parameters
throw new TRPCError({
  code: "FORBIDDEN",
  message: createStructuredError(ERROR_CODES.AUTH.DOMAIN_ACCESS_DENIED, { domainId: domain_id }),
})
```
````

**Client-side** (`packages/aurora/src/client/utils/translateTRPCError.ts`):

- Automatically translates error codes to user-friendly messages
- Supports current locale (en, de)
- Handles legacy hardcoded messages during migration

```typescript
import { translateTRPCError } from "@/client/utils/translateTRPCError"

const mutation = trpcReact.compute.flavor.createFlavor.useMutation({
  onError: (error) => {
    const message = translateTRPCError(error)
    toast({ title: t`Error`, description: message })
  },
})
```

### Adding New Error Codes

1. **Add to `errorCodes.ts`**:

```typescript
export const ERROR_CODES = {
  MY_DOMAIN: {
    OPERATION_FAILED: "error.my_domain.operation.failed",
  },
}
```

2. **Add translations** to `locales/en/messages.po`:

```po
msgid "error.my_domain.operation.failed"
msgstr "Operation failed. Please try again."
```

3. **Add German translation** to `locales/de/messages.po`:

```po
msgid "error.my_domain.operation.failed"
msgstr "Vorgang fehlgeschlagen. Bitte versuchen Sie es erneut."
```

4. **Run validation**:

```bash
pnpm check-i18n  # Automatically validates all error codes have translations
```

5. **Use in router**:

```typescript
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: ERROR_CODES.MY_DOMAIN.OPERATION_FAILED,
})
```

### Error Format Types

**Simple key** (most common):

```typescript
throw new TRPCError({
  message: "error.flavors.fetch.failed",
})
// Client sees: "Failed to fetch flavors from server."
```

**Structured with parameters**:

```typescript
throw new TRPCError({
  message: JSON.stringify({
    key: "error.auth.domain.access_denied",
    params: { domainId: "abc-123" },
  }),
})
// Client sees: "Access denied. You don't have access to domain abc-123."
```

**Legacy hardcoded** (deprecated, for backwards compat):

```typescript
throw new TRPCError({
  message: "Something went wrong",
})
// Client sees: "Something went wrong" (unchanged)
```

### Best Practices

1. **Always use ERROR_CODES** - never hardcode error messages in TRPCError
2. **Use structured format** when you need dynamic values (IDs, counts, names)
3. **Keep keys descriptive** - `error.flavors.create.forbidden` not `error.fc_forbid`
4. **Test in both locales** - verify German translations make sense
5. **Run check-i18n** - catches missing translations at build time

### Validation

CI automatically validates:

- ✅ All ERROR_CODES have English translations
- ✅ All ERROR_CODES have German translations
- ⚠️ Warns about unused translations (potential legacy keys)

Manual validation:

```bash
pnpm validate-errors
```

### Migration from Legacy Code

Old pattern (deprecated):

```typescript
const { translateError } = useErrorTranslation()
const message = translateError(error.message)
```

New pattern:

```typescript
import { translateTRPCError } from "@/client/utils/translateTRPCError"
const message = translateTRPCError(error)
```

The old `useErrorTranslation` hook is deprecated and will be removed in a future version.

````

---

## Примеры кода

### Пример 1: Simple domain error

**Server**:
```typescript
// packages/aurora/src/server/Compute/routers/flavorRouter.ts
export const flavorRouter = {
  createFlavor: projectScopedProcedure
    .input(FlavorInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const compute = ctx.openstack?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.SERVICES.COMPUTE_UNAVAILABLE,
          })
        }

        return await createFlavor(compute, input.flavor)
      } catch (error) {
        if (error instanceof TRPCError) throw error

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.FLAVORS.CREATE_FAILED,
          cause: error,
        })
      }
    }),
}
````

**Client**:

```typescript
// Component
import { translateTRPCError } from "@/client/utils/translateTRPCError"

const createMutation = trpcReact.compute.flavor.createFlavor.useMutation({
  onSuccess: () => {
    toast({ title: t`Success`, description: t`Flavor created successfully.` })
  },
  onError: (error) => {
    const message = translateTRPCError(error)
    toast({ title: t`Error`, description: message, variant: "error" })
  },
})
```

**Результат**:

- EN: "Failed to create the flavor. Please try again."
- DE: "Flavor konnte nicht erstellt werden. Bitte versuchen Sie es erneut."

---

### Пример 2: Structured error с параметрами

**Server**:

```typescript
// packages/aurora/src/server/trpc.ts
if (!hasAccess) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: createStructuredError(ERROR_CODES.AUTH.DOMAIN_ACCESS_DENIED, { domainId: domain_id }),
  })
}
```

**PO файл**:

```po
# en/messages.po
msgid "error.auth.domain.access_denied"
msgstr "Access denied. You don't have access to domain {domainId}."

# de/messages.po
msgid "error.auth.domain.access_denied"
msgstr "Zugriff verweigert. Sie haben keinen Zugriff auf Domäne {domainId}."
```

**Client** (автоматически):

```typescript
const message = translateTRPCError(error)
// EN: "Access denied. You don't have access to domain abc-123."
// DE: "Zugriff verweigert. Sie haben keinen Zugriff auf Domäne abc-123."
```

---

### Пример 3: Global error handler (опционально)

**Для максимального DRY** можно создать global error handler:

```typescript
// packages/aurora/src/client/App.tsx
import { translateTRPCError } from "./utils/translateTRPCError"
import { useNotifications } from "@cloudoperators/juno-ui-components"

const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        mutations: {
          onError: (error) => {
            // Автоматически показываем toast для всех ошибок
            const message = translateTRPCError(error)

            // Skip 401 (handled by tRPC link interceptor)
            if (!isTRPCUnauthorized(error)) {
              toast({
                title: t`Error`,
                description: message,
                variant: "error",
              })
            }
          },
        },
      },
    })
)
```

**Теперь компоненты могут не обрабатывать ошибки явно**:

```typescript
// Минимальный компонент - ошибки обрабатываются глобально
const deleteMutation = trpcReact.compute.flavor.deleteFlavor.useMutation({
  onSuccess: () => {
    toast({ title: t`Success`, description: t`Flavor deleted.` })
  },
  // onError не нужен - handled globally
})
```

---

## Тестирование

### Unit tests

**Что тестировать**:

1. ✅ `translateTRPCError` переводит simple keys
2. ✅ `translateTRPCError` переводит structured errors с params
3. ✅ `translateTRPCError` возвращает fallback для missing keys
4. ✅ `translateTRPCError` обрабатывает legacy hardcoded messages
5. ✅ `createStructuredError` корректно форматирует JSON

```bash
pnpm --filter @cobaltcore-dev/aurora test translateTRPCError
```

### Integration tests

**Что тестировать**:

1. ✅ Server throws error с i18n key
2. ✅ Client получает и переводит ошибку
3. ✅ Locale switch меняет язык ошибки
4. ✅ Missing translation показывает fallback

```bash
pnpm --filter @cobaltcore-dev/aurora test translateTRPCError.integration
```

### E2E tests

**Что тестировать**:

1. ✅ User видит локализованную ошибку в toast
2. ✅ User переключает язык → ошибки на новом языке
3. ✅ Structured error с params отображается корректно

```typescript
// apps/dashboard/e2e/errorTranslation.spec.ts
test("should show localized error message", async ({ page }) => {
  // 1. Login and navigate
  await page.goto("/projects/test/compute/flavors")

  // 2. Mock BFF to return error
  await page.route("**/polaris-bff/**", (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "error.flavors.create.failed",
        },
      }),
    })
  })

  // 3. Trigger action
  await page.click('button:has-text("Create Flavor")')
  await page.fill('input[name="name"]', "test")
  await page.click('button[type="submit"]')

  // 4. Assert English error
  await expect(page.locator(".juno-toast")).toContainText("Failed to create the flavor")

  // 5. Switch to German
  await page.click('button[aria-label="Language"]')
  await page.click('text="Deutsch"')

  // 6. Trigger same action
  await page.click('button:has-text("Flavor erstellen")')
  await page.fill('input[name="name"]', "test2")
  await page.click('button[type="submit"]')

  // 7. Assert German error
  await expect(page.locator(".juno-toast")).toContainText("Flavor konnte nicht erstellt werden")
})
```

---

## Миграция существующего кода

### Strategy: Постепенная миграция (3 фазы)

#### Phase 1: Новый код (✅ Начать немедленно)

**Правило**: Все NEW code использует новую систему.

```typescript
// ✅ NEW router/procedure
throw new TRPCError({
  message: ERROR_CODES.MY_DOMAIN.OPERATION_FAILED,
})

// ✅ NEW component
const message = translateTRPCError(error)
```

**Enforcement**:

- ESLint rule запрещает hardcoded messages
- Code review checklist

---

#### Phase 2: Critical paths (🔄 По мере возможности)

**Приоритет**: Мигрировать часто используемые error paths.

**Порядок**:

1. ✅ Middleware (`trpc.ts`) - **DONE in Task 1.2**
2. 🔄 Flavors (уже частично имеет ERROR_CODES)
3. 🔄 Authentication (`authRouters`)
4. 🔄 Security Groups
5. 🔄 Storage (Swift, Ceph)

**Для каждого домена**:

1. Добавить секцию в `ERROR_CODES`
2. Добавить переводы в `messages.po` (en, de)
3. Заменить `throw new TRPCError({ message: "..." })` на `ERROR_CODES.X.Y`
4. Обновить компоненты с `translateTRPCError`
5. Удалить старые case statements из `useErrorTranslation`

---

#### Phase 3: Legacy cleanup (🗓️ После полной миграции)

**Когда**: Все домены мигрированы.

**Действия**:

1. Удалить `useErrorTranslation.ts`
2. Удалить старые error code константы (если остались)
3. Update imports в компонентах
4. Финальный `pnpm validate-errors`

---

### Migration Checklist (per domain)

**Для каждого domain router** (например, Flavors):

- [ ] **Task 1**: Add error codes to `errorCodes.ts`

  ```typescript
  FLAVORS: {
    FETCH_FAILED: "error.flavors.fetch.failed",
    // ...
  }
  ```

- [ ] **Task 2**: Add EN translations to `locales/en/messages.po`

  ```po
  msgid "error.flavors.fetch.failed"
  msgstr "Failed to fetch flavors..."
  ```

- [ ] **Task 3**: Add DE translations to `locales/de/messages.po`

  ```po
  msgid "error.flavors.fetch.failed"
  msgstr "Flavors konnten nicht..."
  ```

- [ ] **Task 4**: Update server router

  ```typescript
  throw new TRPCError({
    message: ERROR_CODES.FLAVORS.FETCH_FAILED,
  })
  ```

- [ ] **Task 5**: Update client components

  ```typescript
  const message = translateTRPCError(error)
  ```

- [ ] **Task 6**: Remove old cases from `useErrorTranslation`

  ```typescript
  // DELETE:
  case "FLAVORS_FETCH_FAILED":
    return t`Failed to...`
  ```

- [ ] **Task 7**: Test in both locales (EN, DE)

- [ ] **Task 8**: Run `pnpm validate-errors`

---

## Оценка трудозатрат

### Total: ~15-20 часов

| Phase                             | Tasks       | Time       |
| --------------------------------- | ----------- | ---------- |
| Phase 1: Infrastructure           | 4 tasks     | 2-3h       |
| Phase 2: Migration (Flavors only) | 2 tasks     | 4-6h       |
| Phase 3: Validation & Tooling     | 2 tasks     | 2h         |
| Phase 4: Testing                  | 2 tasks     | 2-3h       |
| Phase 5: Documentation            | 1 task      | 1h         |
| **Phase 6: Full Migration**       | All domains | **20-30h** |

**Реалистичный план**:

- **Week 1**: Phase 1-5 (infrastructure + one domain) = 15h
- **Week 2-4**: Phase 6 (remaining domains) = 30h
- **Total**: ~45 hours для полной миграции всех доменов

**MVP подход** (рекомендуется):

- Реализовать infrastructure (Phase 1-5) = 15h
- Мигрировать ТОЛЬКО Flavors + Auth = 5h
- Остальные домены мигрировать постепенно в следующих спринтах

---

## Альтернативные подходы (не рекомендуются)

### ❌ Подход "error объект вместо строки"

**Идея**: Передавать объект вместо строки в `TRPCError.message`.

**Проблемы**:

- tRPC ожидает `message: string`, не `object`
- Нужно stringify/parse вручную
- Теряется type safety

### ❌ Подход "error codes в query params"

**Идея**: Передавать код ошибки отдельным полем.

**Проблемы**:

- tRPC не поддерживает custom error fields напрямую
- Нужен custom error serializer
- Breaking change для всех clients

### ❌ Подход "все переводы на server"

**Проблемы**:

- Дублирование catalog (server + client)
- Lingui не designed для Node.js
- Сложность с dynamic locale switching

---

## Заключение

### Рекомендация

**Реализовать Вариант 1** (Error codes как i18n ключи) с улучшениями:

- ✅ Соответствует существующей архитектуре (Lingui + PO files)
- ✅ Минимальная сложность
- ✅ Type-safe via TypeScript
- ✅ Автоматическая валидация через CI
- ✅ Постепенная миграция без breaking changes

### Следующие шаги

1. **Создать branch**: `feat/error-i18n`
2. **Реализовать Phase 1** (infrastructure) - 2-3h
3. **Мигрировать 1 домен** (Flavors) для proof of concept - 4h
4. **Получить feedback** от команды
5. **Создать PR** с документацией и examples
6. **Постепенно мигрировать** остальные домены в следующих спринтах

### Метрики успеха

- ✅ Все новые ошибки используют `ERROR_CODES`
- ✅ `pnpm validate-errors` проходит в CI
- ✅ Нет hardcoded английских сообщений в новом коде
- ✅ Пользователи видят локализованные ошибки на выбранном языке
- ✅ Разработчики используют `translateTRPCError` вместо `useErrorTranslation`

---

**Дата создания**: 2026-07-13  
**Автор анализа**: Claude (Opus 4.8)  
**Статус**: ✅ Ready for implementation
