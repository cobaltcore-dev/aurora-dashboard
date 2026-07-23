---
name: create-plan
description: Создает детальный план разработки с анализом архитектуры (без реализации)
whenToUse: Когда нужно только спланировать задачу, посмотреть на план и решить стоит ли его выполнять
---

export const meta = {
name: 'create-plan',
description: 'Анализ и планирование без реализации',
phases: [
{ title: 'Анализ', detail: 'Изучение архитектуры проекта' },
{ title: 'Планирование', detail: 'Создание детального плана', model: 'opus' }
]
}

// Задача передается через args
if (!args || !args.task) {
throw new Error('Необходимо передать задачу через args: { task: "описание задачи" }')
}

const taskDescription = args.task

phase('Анализ')

log('🎯 Задача: ' + taskDescription)
log('🔍 Анализирую текущую архитектуру...')

// Сначала быстрый анализ архитектуры
const architecture = await agent(
`Проанализируй текущую архитектуру проекта aurora-dashboard в контексте задачи:

${taskDescription}

Найди:

1. Похожие существующие компоненты/функции
2. Релевантные файлы и модули
3. Используемые паттерны и подходы
4. Зависимости и ограничения

Верни структурированный анализ.`,
{
label: 'architecture-analysis',
agentType: 'Explore',
schema: {
type: 'object',
properties: {
relevantFiles: { type: 'array', items: { type: 'string' } },
existingPatterns: { type: 'array', items: { type: 'string' } },
similarFeatures: { type: 'array', items: { type: 'string' } },
dependencies: { type: 'array', items: { type: 'string' } },
technicalStack: { type: 'object' }
},
required: ['relevantFiles', 'existingPatterns']
}
}
)

log(`📁 Найдено релевантных файлов: ${architecture.relevantFiles.length}`)

phase('Планирование')

log('📐 Создаю детальный план разработки...')

const plan = await agent(
`Создай детальный план разработки для задачи:

${taskDescription}

## Архитектурный контекст:

**Релевантные файлы:**
${architecture.relevantFiles.join('\n')}

**Существующие паттерны:**
${architecture.existingPatterns.join('\n')}

**Похожие фичи:**
${architecture.similarFeatures.join('\n')}

**Зависимости:**
${architecture.dependencies.join('\n')}

---

ИНСТРУКЦИИ:

1. Используй информацию об архитектуре выше
2. Проанализируй все риски и потенциальные проблемы
3. Если что-то неясно - используй AskUserQuestion для уточнения
4. Создай пошаговый план, который dev-executor сможет выполнить
5. Каждый шаг должен быть максимально детальным с конкретными путями к файлам

Следуй структуре из твоих инструкций.`,
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
proposedChanges: { type: 'array', items: { type: 'string' } },
reasoning: { type: 'string' }
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
verification: { type: 'string' },
estimatedTime: { type: 'string' }
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
openQuestions: { type: 'array', items: { type: 'string' } },
alternativeApproaches: {
type: 'array',
items: {
type: 'object',
properties: {
approach: { type: 'string' },
pros: { type: 'array', items: { type: 'string' } },
cons: { type: 'array', items: { type: 'string' } }
}
}
}
},
required: ['overview', 'implementationSteps', 'acceptanceCriteria']
}
}
)

if (!plan) {
log('❌ Планирование не завершено')
return { status: 'failed' }
}

log('✅ План создан!')

// Статистика
const totalSteps = plan.implementationSteps.length
const highRisks = plan.potentialProblems.filter(p => p.severity === 'High').length
const mediumRisks = plan.potentialProblems.filter(p => p.severity === 'Medium').length

log(`📊 Статистика плана:`)
log(`   Шагов реализации: ${totalSteps}`)
log(`   Рисков высокой важности: ${highRisks}`)
log(`   Рисков средней важности: ${mediumRisks}`)
log(`   Открытых вопросов: ${plan.openQuestions?.length || 0}`)

if (plan.openQuestions && plan.openQuestions.length > 0) {
log('❓ Требуются уточнения от пользователя')
}

if (highRisks > 0) {
log('⚠️ Обнаружены высокие риски - требуется внимание!')
}

// Возвращаем полный план
return {
status: 'success',
task: taskDescription,
plan: plan,
architecture: architecture,
summary: {
totalSteps,
estimatedComplexity: totalSteps <= 3 ? 'Simple' : totalSteps <= 7 ? 'Medium' : 'Complex',
highRisks,
mediumRisks,
needsClarification: (plan.openQuestions?.length || 0) > 0,
hasAlternatives: (plan.alternativeApproaches?.length || 0) > 0
}
}
