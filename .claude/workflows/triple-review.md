---
name: triple-review
description: Параллельное ревью кода тремя специализированными агентами (security, performance, architecture)
whenToUse: Когда нужно комплексное ревью изменений с разных точек зрения
---

export const meta = {
name: 'triple-review',
description: 'Запускает security, performance и architecture ревьюеров параллельно',
phases: [
{ title: 'Анализ изменений', detail: 'Определяем что ревьюить' },
{ title: 'Параллельное ревью', detail: 'Три ревьюера работают одновременно' },
{ title: 'Сводка', detail: 'Объединяем результаты' }
]
}

// Фаза 1: Узнаем что изменилось
phase('Анализ изменений')

log('🔍 Определяю какие файлы нужно отревьюить...')

const changedFiles = await agent(
'Проанализируй git diff и найди все измененные TypeScript/JavaScript файлы. Верни список файлов с кратким описанием что в них изменилось.',
{
label: 'analyze-changes',
schema: {
type: 'object',
properties: {
files: {
type: 'array',
items: {
type: 'object',
properties: {
path: { type: 'string' },
type: { type: 'string', enum: ['frontend', 'backend', 'config', 'test'] },
summary: { type: 'string' }
},
required: ['path', 'type', 'summary']
}
},
totalFiles: { type: 'number' },
hasSecurityRelevant: { type: 'boolean' },
hasPerformanceRelevant: { type: 'boolean' }
},
required: ['files', 'totalFiles']
}
}
)

if (!changedFiles || changedFiles.totalFiles === 0) {
log('⚠️ Нет изменений для ревью')
return { message: 'Нет изменений в рабочей директории' }
}

log(`📊 Найдено файлов: ${changedFiles.totalFiles}`)

// Фаза 2: Параллельное ревью тремя агентами
phase('Параллельное ревью')

log('🚀 Запускаю трех ревьюеров параллельно...')

const reviews = await parallel([
// Security Reviewer
() => agent(
`Проведи security review следующих файлов:

${changedFiles.files.map(f => `- ${f.path}: ${f.summary}`).join('\n')}

Проверь:

1. Authentication/Authorization уязвимости
2. Input validation
3. SQL injection, XSS, CSRF риски
4. Secrets и sensitive data
5. API security

Верни структурированный список находок.`,
{
label: 'security-reviewer',
phase: 'Параллельное ревью',
agentType: 'security-reviewer',
schema: {
type: 'object',
properties: {
findings: {
type: 'array',
items: {
type: 'object',
properties: {
severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
file: { type: 'string' },
line: { type: 'number' },
issue: { type: 'string' },
risk: { type: 'string' },
fix: { type: 'string' }
},
required: ['severity', 'file', 'issue', 'fix']
}
},
summary: { type: 'string' }
},
required: ['findings', 'summary']
}
}
),

// Performance Reviewer
() => agent(
`Проведи performance review следующих файлов:

${changedFiles.files.map(f => `- ${f.path}: ${f.summary}`).join('\n')}

Проверь:

1. React rendering оптимизации (useMemo, useCallback)
2. Database query эффективность
3. Bundle size и lazy loading
4. Ненужные re-renders
5. API call оптимизации

Верни структурированный список находок.`,
{
label: 'performance-reviewer',
phase: 'Параллельное ревью',
agentType: 'performance-reviewer',
schema: {
type: 'object',
properties: {
findings: {
type: 'array',
items: {
type: 'object',
properties: {
impact: { type: 'string', enum: ['High', 'Medium', 'Low'] },
file: { type: 'string' },
line: { type: 'number' },
issue: { type: 'string' },
improvement: { type: 'string' },
expectedGain: { type: 'string' }
},
required: ['impact', 'file', 'issue', 'improvement']
}
},
summary: { type: 'string' }
},
required: ['findings', 'summary']
}
}
),

// Architecture Reviewer
() => agent(
`Проведи architecture review следующих файлов:

${changedFiles.files.map(f => `- ${f.path}: ${f.summary}`).join('\n')}

Проверь:

1. Design patterns использование
2. SOLID principles
3. Code organization и modularity
4. Coupling и cohesion
5. Technical debt

Верни структурированный список находок.`,
{
label: 'architecture-reviewer',
phase: 'Параллельное ревью',
agentType: 'architecture-reviewer',
schema: {
type: 'object',
properties: {
findings: {
type: 'array',
items: {
type: 'object',
properties: {
category: { type: 'string', enum: ['Design', 'Organization', 'Scalability', 'Maintainability'] },
file: { type: 'string' },
issue: { type: 'string' },
recommendation: { type: 'string' },
effort: { type: 'string', enum: ['Small', 'Medium', 'Large'] }
},
required: ['category', 'file', 'issue', 'recommendation']
}
},
summary: { type: 'string' }
},
required: ['findings', 'summary']
}
}
)
])

log('✅ Все ревью завершены!')

// Фаза 3: Сводка результатов
phase('Сводка')

const [securityReview, performanceReview, architectureReview] = reviews.filter(Boolean)

const totalFindings =
(securityReview?.findings?.length || 0) +
(performanceReview?.findings?.length || 0) +
(architectureReview?.findings?.length || 0)

log(`📋 Всего находок: ${totalFindings}`)

// Подсчитываем критичные находки
const criticalCount = securityReview?.findings?.filter(f => f.severity === 'Critical').length || 0
const highSeverityCount = securityReview?.findings?.filter(f => f.severity === 'High').length || 0

if (criticalCount > 0) {
log(`🚨 ВНИМАНИЕ: ${criticalCount} критичных security находок!`)
}

return {
changedFiles: changedFiles.files,
security: securityReview,
performance: performanceReview,
architecture: architectureReview,
summary: {
totalFindings,
criticalIssues: criticalCount,
highSeverityIssues: highSeverityCount,
performanceImprovements: performanceReview?.findings?.filter(f => f.impact === 'High').length || 0,
architectureIssues: architectureReview?.findings?.length || 0
}
}
