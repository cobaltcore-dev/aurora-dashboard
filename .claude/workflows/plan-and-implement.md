---
name: plan-and-implement
description: Полный цикл разработки - планирование с анализом архитектуры → реализация → ревью
whenToUse: Когда нужно реализовать новую фичу или значительное изменение с тщательным планированием
---

export const meta = {
name: 'plan-and-implement',
description: 'Планирование → Реализация → Ревью',
phases: [
{ title: 'Планирование', detail: 'Анализ архитектуры и создание плана', model: 'opus' },
{ title: 'Реализация', detail: 'Выполнение плана', model: 'sonnet' },
{ title: 'Ревью', detail: 'Проверка результата' }
]
}

// Задача должна быть передана через args
if (!args || !args.task) {
throw new Error('Необходимо передать задачу через args: { task: "описание задачи" }')
}

const taskDescription = args.task

// ============================================
// ФАЗА 1: ПЛАНИРОВАНИЕ
// ============================================
phase('Планирование')

log('🎯 Задача: ' + taskDescription)
log('📐 Создаю детальный план разработки...')

const plan = await agent(
`Создай детальный план разработки для следующей задачи:

${taskDescription}

ВАЖНО:

1. Проанализируй текущую архитектуру проекта (aurora-dashboard)
2. Найди похожие существующие компоненты/функции для примера
3. Определи все потенциальные проблемы и риски
4. Если что-то неясно - задай вопросы пользователю через AskUserQuestion
5. Создай пошаговый план, который другой разработчик сможет выполнить

Следуй структуре из твоих инструкций:

- Overview
- Architecture Analysis
- Potential Problems & Mitigations
- Prerequisites
- Implementation Steps (детальные, с конкретными путями к файлам)
- Testing Plan
- Acceptance Criteria
- Open Questions`,
  {
  label: 'dev-planner',
  phase: 'Планирование',
  agentType: 'dev-planner',
  model: 'opus',
  schema: {
  type: 'object',
  properties: {
  overview: { type: 'string' },
  architectureAnalysis: {
  type: 'object',
  properties: {
  currentState: { type: 'array', items: { type: 'string' } },
  proposedChanges: { type: 'array', items: { type: 'string' } }
  }
  },
  potentialProblems: {
  type: 'array',
  items: {
  type: 'object',
  properties: {
  risk: { type: 'string' },
  severity: { type: 'string', enum: ['High', 'Medium', 'Low'] },
  mitigation: { type: 'string' }
  }
  }
  },
  prerequisites: { type: 'array', items: { type: 'string' } },
  implementationSteps: {
  type: 'array',
  items: {
  type: 'object',
  properties: {
  stepNumber: { type: 'number' },
  title: { type: 'string' },
  files: { type: 'array', items: { type: 'string' } },
  instructions: { type: 'array', items: { type: 'string' } },
  expectedOutcome: { type: 'string' },
  verification: { type: 'string' }
  },
  required: ['stepNumber', 'title', 'instructions']
  }
  },
  testingPlan: {
  type: 'object',
  properties: {
  unitTests: { type: 'array', items: { type: 'string' } },
  integrationTests: { type: 'array', items: { type: 'string' } },
  manualVerification: { type: 'array', items: { type: 'string' } }
  }
  },
  acceptanceCriteria: { type: 'array', items: { type: 'string' } },
  openQuestions: { type: 'array', items: { type: 'string' } }
  },
  required: ['overview', 'implementationSteps', 'acceptanceCriteria']
  }
  }
  )

if (!plan) {
log('❌ Планирование не завершено')
return { status: 'planning_failed' }
}

log('✅ План создан!')
log(`📊 Количество шагов: ${plan.implementationSteps.length}`)

// Показываем потенциальные проблемы
if (plan.potentialProblems && plan.potentialProblems.length > 0) {
log('⚠️ Выявленные риски:')
plan.potentialProblems.forEach(p => {
log(`  ${p.severity}: ${p.risk}`)
})
}

// Если есть открытые вопросы - останавливаемся
if (plan.openQuestions && plan.openQuestions.length > 0) {
log('❓ Есть открытые вопросы - требуется уточнение у пользователя')
return {
status: 'needs_clarification',
plan,
openQuestions: plan.openQuestions
}
}

// ============================================
// ФАЗА 2: РЕАЛИЗАЦИЯ
// ============================================
phase('Реализация')

log('🔨 Начинаю реализацию плана...')

const implementation = await agent(
`Выполни следующий план разработки:

## Overview

${plan.overview}

## Architecture Context

Текущее состояние:
${plan.architectureAnalysis.currentState.join('\n')}

Планируемые изменения:
${plan.architectureAnalysis.proposedChanges.join('\n')}

## Риски и меры предосторожности

${plan.potentialProblems.map(p => `⚠️ [${p.severity}] ${p.risk}\nМитигация: ${p.mitigation}`).join('\n\n')}

## Шаги реализации

${plan.implementationSteps.map(step => `

### Step ${step.stepNumber}: ${step.title}

Файлы: ${step.files ? step.files.join(', ') : 'см. инструкции'}

Инструкции:
${step.instructions.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}

Ожидаемый результат: ${step.expectedOutcome || 'см. инструкции'}

Проверка: ${step.verification || 'см. acceptance criteria'}
`).join('\n---\n')}

## Testing Plan

Unit тесты:
${plan.testingPlan.unitTests ? plan.testingPlan.unitTests.map(t => `- ${t}`).join('\n') : '- (см. инструкции)'}

Ручная проверка:
${plan.testingPlan.manualVerification ? plan.testingPlan.manualVerification.map(t => `- ${t}`).join('\n') : '- (см. инструкции)'}

## Acceptance Criteria

${plan.acceptanceCriteria.map(c => `✅ ${c}`).join('\n')}

---

ВАЖНО:

- Выполняй шаги последовательно
- Тестируй после каждого шага
- Следуй существующим паттернам кода
- Если что-то неясно или не соответствует плану - спроси пользователя
- Отчитывайся о прогрессе`,
  {
  label: 'dev-executor',
  phase: 'Реализация',
  agentType: 'dev-executor',
  schema: {
  type: 'object',
  properties: {
  completedSteps: {
  type: 'array',
  items: {
  type: 'object',
  properties: {
  stepNumber: { type: 'number' },
  status: { type: 'string', enum: ['completed', 'skipped', 'failed'] },
  notes: { type: 'string' }
  }
  }
  },
  filesModified: { type: 'array', items: { type: 'string' } },
  filesCreated: { type: 'array', items: { type: 'string' } },
  testingResults: {
  type: 'object',
  properties: {
  unitTests: { type: 'string', enum: ['passed', 'failed', 'not_run'] },
  manualVerification: { type: 'string', enum: ['passed', 'failed', 'not_done'] }
  }
  },
  acceptanceCriteriaMet: { type: 'array', items: { type: 'boolean' } },
  deviationsFromPlan: { type: 'array', items: { type: 'string' } },
  issues: { type: 'array', items: { type: 'string' } }
  },
  required: ['completedSteps', 'filesModified', 'testingResults']
  }
  }
  )

if (!implementation) {
log('❌ Реализация не завершена')
return { status: 'implementation_failed', plan }
}

log('✅ Реализация завершена!')
log(`📝 Изменено файлов: ${implementation.filesModified.length}`)
log(`📝 Создано файлов: ${implementation.filesCreated.length}`)

// ============================================
// ФАЗА 3: БЫСТРОЕ РЕВЬЮ
// ============================================
phase('Ревью')

log('🔍 Проверяю результат...')

// Запускаем только security reviewer для быстрой проверки
const securityCheck = await agent(
`Проведи быстрый security review следующих изменений:

Измененные файлы:
${implementation.filesModified.join('\n')}

Созданные файлы:
${implementation.filesCreated.join('\n')}

Контекст задачи: ${taskDescription}

Проверь критичные security аспекты:

1. Auth/Authorization
2. Input validation
3. Sensitive data exposure
4. Injection risks

Сфокусируйся на критичных проблемах.`,
{
label: 'security-check',
phase: 'Ревью',
agentType: 'security-reviewer',
schema: {
type: 'object',
properties: {
overallStatus: { type: 'string', enum: ['safe', 'concerns', 'critical_issues'] },
criticalIssues: { type: 'array', items: { type: 'string' } },
recommendations: { type: 'array', items: { type: 'string' } }
},
required: ['overallStatus']
}
}
)

if (securityCheck?.criticalIssues?.length > 0) {
log('🚨 ВНИМАНИЕ: Найдены критичные security проблемы!')
}

log('✅ Workflow завершен!')

// ============================================
// ИТОГОВЫЙ РЕЗУЛЬТАТ
// ============================================

return {
status: 'success',
task: taskDescription,
plan: {
overview: plan.overview,
stepsCount: plan.implementationSteps.length,
risks: plan.potentialProblems
},
implementation: {
completedSteps: implementation.completedSteps.length,
filesModified: implementation.filesModified,
filesCreated: implementation.filesCreated,
testingResults: implementation.testingResults,
issues: implementation.issues
},
security: {
status: securityCheck?.overallStatus,
criticalIssues: securityCheck?.criticalIssues || [],
recommendations: securityCheck?.recommendations || []
},
summary: {
allAcceptanceCriteriaMet: implementation.acceptanceCriteriaMet.every(Boolean),
hasDeviations: implementation.deviationsFromPlan.length > 0,
hasCriticalSecurityIssues: (securityCheck?.criticalIssues?.length || 0) > 0
}
}
