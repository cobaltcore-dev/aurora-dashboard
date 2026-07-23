---
name: quick-security-check
description: Быстрая проверка безопасности конкретного файла или компонента
whenToUse: Когда нужно быстро проверить один файл на security проблемы
---

export const meta = {
name: 'quick-security-check',
description: 'Быстрая security проверка указанного файла',
phases: [
{ title: 'Security Check', detail: 'Анализ безопасности' }
]
}

phase('Security Check')

// Файл для проверки можно передать через args
const targetFile = args?.file || 'apps/dashboard/src/server/server.ts'

log(`🔒 Проверяю безопасность: ${targetFile}`)

const result = await agent(
`Проведи детальный security audit файла: ${targetFile}

Проверь:

1. Authentication и Authorization
2. Input validation и sanitization
3. SQL injection риски
4. XSS уязвимости
5. Secrets и credentials
6. CORS configuration
7. Rate limiting
8. Error handling (не раскрывает ли sensitive info)

Будь максимально придирчивым. Даже потенциальные риски отмечай.`,
{
label: 'security-audit',
agentType: 'security-reviewer',
schema: {
type: 'object',
properties: {
overallRisk: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low', 'None'] },
findings: {
type: 'array',
items: {
type: 'object',
properties: {
severity: { type: 'string' },
line: { type: 'number' },
code: { type: 'string' },
issue: { type: 'string' },
risk: { type: 'string' },
fix: { type: 'string' }
},
required: ['severity', 'issue', 'fix']
}
},
recommendations: { type: 'array', items: { type: 'string' } }
},
required: ['overallRisk', 'findings']
}
}
)

if (result.findings.length === 0) {
log('✅ Security проблем не найдено!')
} else {
log(`⚠️ Найдено проблем: ${result.findings.length}`)
}

return result
