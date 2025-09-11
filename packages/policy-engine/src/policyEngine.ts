import { z, ZodError } from "zod"
import { tokenize } from "./lexer"
import { parse, ParseResult } from "./parser"
import { evaluate, EvaluationContext, PolicyContext } from "./evaluator"
import { createDebugTrace, DebugTrace } from "./debugTrace"

export interface PolicyEngineOptions {
  debug?: boolean
}

export const PolicyConfigSchema = z.record(z.string(), z.string()).refine((data) => Object.keys(data).length > 0, {
  message: "Policy configuration must contain at least one rule",
})

export type PolicyCheckParams = Record<string, unknown>

export const KeystoneTokenPayloadSchema = z
  .object({
    audit_ids: z.array(z.string()).optional(),
    catalog: z.array(z.any()).optional(),
    expires_at: z.string().optional(),
    issued_at: z.string().optional(),
    methods: z.array(z.string()).optional(),
    roles: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      )
      .optional(),
    system: z
      .object({
        all: z.boolean().optional(),
      })
      .optional(),
    project: z
      .object({
        id: z.string(),
        name: z.string(),
        domain: z.object({
          id: z.string(),
          name: z.string(),
        }),
        parent_id: z.string().optional(),
      })
      .optional(),
    domain: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .optional(),
    user: z
      .object({
        id: z.string(),
        name: z.string(),
        domain: z.object({
          id: z.string(),
          name: z.string(),
        }),
        password_expires_at: z.string().optional(),
      })
      .optional(),
    is_admin_project: z.boolean().optional(),
    is_admin: z.boolean().optional(),
  })
  .catchall(z.any())

export const PolicyOptionsSchema = z.object({
  debug: z.boolean().optional(),
  debugDetails: z.boolean().optional(),
  strictParameterValidation: z.boolean().optional(),
  defaultParams: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.undefined()])).optional(),
})

export type PolicyConfig = z.infer<typeof PolicyConfigSchema>
export type KeystoneTokenPayload = z.infer<typeof KeystoneTokenPayloadSchema>
export type PolicyOptions = z.infer<typeof PolicyOptionsSchema>
export type RuleOptions = Omit<PolicyOptions, "defaultParams">

export interface ParameterValidationResult {
  isValid: boolean
  requiredParams: string[]
  providedParams: string[]
  missingParams: string[]
  extraParams: string[]
}

interface UserPolicy {
  check: (ruleName: string, params?: PolicyCheckParams) => boolean
  tokenPayload: KeystoneTokenPayload
  getRequiredParameters: (ruleName: string) => string[]
  checkRequiredParameters: (ruleName: string, params?: PolicyCheckParams) => ParameterValidationResult
  validateParameters: (ruleName: string, params?: PolicyCheckParams) => void
}

export class PolicyEngine {
  private config: PolicyConfig
  private compiledRules: Map<string, ParseResult> = new Map()

  constructor(config: PolicyConfig) {
    try {
      PolicyConfigSchema.parse(config)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new Error(`(Policy configuration) ${z.treeifyError(error).errors.join("; ")}`)
      } else throw error
    }

    this.config = config
    this.compileRules()
  }

  private compileRules(): void {
    for (const [ruleName, ruleExpression] of Object.entries(this.config)) {
      try {
        const tokens = tokenize(ruleExpression.trim())
        const parseResult = parse(tokens)
        this.compiledRules.set(ruleName, parseResult)
      } catch (error) {
        throw new Error(`Failed to compile rule '${ruleName}': ${error}`)
      }
    }
  }

  /**
   * Get rule metadata (direct parameters and rules, not nested)
   */
  getRuleMetadata(ruleName: string): { requiredParams: string[]; usedRules: string[] } | null {
    const parseResult = this.compiledRules.get(ruleName)
    if (!parseResult) {
      return null
    }
    return {
      requiredParams: parseResult.requiredParams,
      usedRules: parseResult.usedRules,
    }
  }

  /**
   * Get all required parameters for a rule (including nested rules)
   */
  getRequiredParameters(ruleName: string, visitedRules: Set<string> = new Set()): string[] {
    // Prevent infinite recursion
    if (visitedRules.has(ruleName)) {
      return []
    }
    visitedRules.add(ruleName)

    const parseResult = this.compiledRules.get(ruleName) || this.compiledRules.get("_default")
    if (!parseResult) {
      throw new Error(`Rule '${ruleName}' not found and no _default rule available`)
    }

    const allParams = new Set<string>()

    // Add direct parameters from this rule
    parseResult.requiredParams.forEach((param) => allParams.add(param))

    // Add parameters from nested rules
    parseResult.usedRules.forEach((nestedRuleName) => {
      try {
        const nestedParams = this.getRequiredParameters(nestedRuleName, visitedRules)
        nestedParams.forEach((param) => allParams.add(param))
      } catch (error) {
        // If nested rule doesn't exist, continue (it might be a context check, not a rule)
        console.warn(`Warning: Could not find nested rule '${nestedRuleName}' when analyzing '${ruleName}'`, error)
      }
    })

    return Array.from(allParams).sort()
  }

  /**
   * Check if all required parameters are provided for a rule
   */
  checkRequiredParameters(ruleName: string, params?: PolicyCheckParams): ParameterValidationResult {
    const requiredParams = this.getRequiredParameters(ruleName)
    const providedParams = params ? Object.keys(params) : []
    const missingParams = requiredParams.filter((p) => !providedParams.includes(p))
    const extraParams = providedParams.filter((p) => !requiredParams.includes(p))

    return {
      isValid: missingParams.length === 0,
      requiredParams,
      providedParams,
      missingParams,
      extraParams,
    }
  }

  /**
   * Validate parameters before checking a rule (throws error if invalid)
   */
  validateParameters(ruleName: string, params?: PolicyCheckParams): void {
    const paramCheck = this.checkRequiredParameters(ruleName, params)

    if (!paramCheck.isValid) {
      throw new Error(
        `Missing required parameters for rule '${ruleName}': [${paramCheck.missingParams.join(", ")}]. ` +
          `Required: [${paramCheck.requiredParams.join(", ")}], ` +
          `Provided: [${paramCheck.providedParams.join(", ")}]`
      )
    }
  }

  policy(tokenPayload: unknown, options?: PolicyOptions): UserPolicy {
    const validatedTokenPayload = KeystoneTokenPayloadSchema.parse(tokenPayload)
    const validatedOptions = options ? PolicyOptionsSchema.parse(options) : undefined
    const context = this.buildContext(validatedTokenPayload)
    const defaultParams = validatedOptions?.defaultParams || {}

    return {
      check: (ruleName: string, params?: PolicyCheckParams): boolean => {
        params = { ...defaultParams, ...params }
        // Optional strict parameter validation
        if (validatedOptions?.strictParameterValidation) {
          this.validateParameters(ruleName, params)
        }

        // Choose the appropriate method based on debug flag
        if (validatedOptions?.debug) {
          return this.checkRuleWithDebug(ruleName, context, params, validatedOptions)
        } else {
          return this.checkRule(ruleName, context, params)
        }
      },
      tokenPayload: validatedTokenPayload,

      // Add parameter management methods
      getRequiredParameters: (ruleName: string) => this.getRequiredParameters(ruleName),
      checkRequiredParameters: (ruleName: string, params?: PolicyCheckParams) =>
        this.checkRequiredParameters(ruleName, params),
      validateParameters: (ruleName: string, params?: PolicyCheckParams) => this.validateParameters(ruleName, params),
    }
  }

  get policyConfig(): PolicyConfig {
    return this.config
  }

  get configRules(): string[] {
    return Object.keys(this.config)
  }

  /**
   * Get a summary of all rules and their parameters
   */
  getRulesSummary(): Record<string, { requiredParams: string[]; usedRules: string[] }> {
    const summary: Record<string, { requiredParams: string[]; usedRules: string[] }> = {}

    for (const ruleName of this.configRules) {
      summary[ruleName] = {
        requiredParams: this.getRequiredParameters(ruleName),
        usedRules: this.getRuleMetadata(ruleName)?.usedRules || [],
      }
    }

    return summary
  }

  // Lightweight production method - no debug overhead
  private checkRule(ruleName: string, context: PolicyContext, params?: PolicyCheckParams): boolean {
    // Get the rule parse result (compiled or default)
    let parseResult = this.compiledRules.get(ruleName)
    if (!parseResult) {
      parseResult = this.compiledRules.get("_default")
      if (!parseResult) {
        throw new Error(`Rule '${ruleName}' not found and no _default rule available`)
      }
    }

    // Extract the AST from the parse result
    const ruleAst = parseResult.ast

    // Create evaluation context
    const evaluationContext: EvaluationContext = {
      getRule: (name: string) => {
        return () => this.checkRule(name, context, params) // Recursive call without debug
      },
      context,
      params: params || {},
    }

    // Evaluate the rule
    const evaluationFunction = evaluate(ruleAst)
    return evaluationFunction(evaluationContext)
  }

  // Debug-enabled method with full tracing
  private checkRuleWithDebug(
    ruleName: string,
    context: PolicyContext,
    params?: PolicyCheckParams,
    options?: RuleOptions
  ): boolean {
    const mainTrace = createDebugTrace()

    console.log(`\n🎯 Starting policy check for rule: '${ruleName}'`)

    // Show parameter analysis first
    try {
      const paramCheck = this.checkRequiredParameters(ruleName, params)
      if (paramCheck.requiredParams.length > 0) {
        console.log(`📝 Required parameters: [${paramCheck.requiredParams.join(", ")}]`)
        mainTrace?.add(`📝 Required parameters: [${paramCheck.requiredParams.join(", ")}]`, 0, "info")

        if (paramCheck.missingParams.length > 0) {
          console.log(`⚠️  Missing parameters: [${paramCheck.missingParams.join(", ")}]`)
          mainTrace?.add(`⚠️  Missing parameters: [${paramCheck.missingParams.join(", ")}]`, 0, "info")
        }

        if (paramCheck.extraParams.length > 0) {
          console.log(`ℹ️  Extra parameters: [${paramCheck.extraParams.join(", ")}]`)
          mainTrace?.add(`ℹ️  Extra parameters: [${paramCheck.extraParams.join(", ")}]`, 0, "info")
        }

        if (paramCheck.isValid) {
          console.log(`✅ All required parameters provided`)
          mainTrace?.add(`✅ All required parameters provided`, 0, "info")
        }
      }
    } catch (error) {
      console.log(`⚠️  Parameter analysis failed: ${error}`)
      mainTrace?.add(`⚠️  Parameter analysis failed: ${error}`, 0, "info")
    }

    if (params && Object.keys(params).length > 0) {
      console.log(`📋 Check parameters:`, params)
      mainTrace?.add(`📋 Parameters: ${JSON.stringify(params)}`, 0, "info")
    }

    const result = this.checkRuleWithTrace(ruleName, context, params, options, 0, mainTrace)

    console.log(`\n🔍 Complete Policy Evaluation Trace:`)
    console.log("═".repeat(60))
    mainTrace?.log()
    console.log("═".repeat(60))
    console.log(`\n🏁 Final result for '${ruleName}': ${result ? "✅ ALLOWED" : "❌ DENIED"}\n`)

    return result
  }

  private buildContext(tokenPayload: KeystoneTokenPayload): PolicyContext {
    return {
      roles: tokenPayload.roles || [],
      user: tokenPayload.user,
      project: tokenPayload.project,
      domain: tokenPayload.domain,
      system: tokenPayload.system,
      user_id: tokenPayload.user?.id,
      user_name: tokenPayload.user?.name,
      domain_id: tokenPayload.domain?.id || tokenPayload.project?.domain?.id || tokenPayload.user?.domain?.id,
      domain_name: tokenPayload.domain?.name || tokenPayload.project?.domain?.name || tokenPayload.user?.domain?.name,
      project_id: tokenPayload.project?.id,
      project_domain_id: tokenPayload.project?.domain?.id,
      user_domain_id: tokenPayload.user?.domain?.id,
      is_admin: tokenPayload.is_admin || tokenPayload.roles?.some((role) => role.name === "admin"),
      is_admin_project: tokenPayload.is_admin_project,
      system_scope: tokenPayload.system?.all ? "all" : undefined,
      token: {
        domain: {
          id: tokenPayload.domain?.id || tokenPayload.project?.domain?.id,
        },
        project: {
          domain: {
            id: tokenPayload.project?.domain?.id,
          },
        },
        user: tokenPayload.user,
      },
      ...tokenPayload,
    }
  }

  private checkRuleWithTrace(
    ruleName: string,
    context: PolicyContext,
    params?: PolicyCheckParams,
    options?: RuleOptions,
    currentLevel: number = 0,
    parentTrace?: DebugTrace | null
  ): boolean {
    const localTrace = options?.debug ? createDebugTrace() : null

    try {
      // Get the rule parse result (compiled or default)
      let parseResult = this.compiledRules.get(ruleName)
      let actualRuleName = ruleName
      let usingDefault = false

      if (!parseResult) {
        parseResult = this.compiledRules.get("_default")
        if (!parseResult) {
          throw new Error(`Rule '${ruleName}' not found and no _default rule available`)
        }
        actualRuleName = "_default"
        usingDefault = true
      }

      const ruleExpression = this.config[actualRuleName]
      const ruleAst = parseResult.ast

      // Start rule in trace
      localTrace?.startRule(ruleName, currentLevel, ruleExpression)

      if (usingDefault) {
        localTrace?.add(`⚠️  Rule '${ruleName}' not found, using '_default'`, currentLevel + 1, "info")
      }

      // Show direct rule parameters and references (not nested analysis)
      if (localTrace && currentLevel === 0) {
        // Only show for top-level rule
        if (parseResult.requiredParams.length > 0) {
          localTrace?.add(`📝 Direct parameters: [${parseResult.requiredParams.join(", ")}]`, currentLevel + 1, "info")
        }
        if (parseResult.usedRules.length > 0) {
          localTrace?.add(`🔗 Direct rule references: [${parseResult.usedRules.join(", ")}]`, currentLevel + 1, "info")
        }
      }

      // Log relevant context values for debugging
      if (localTrace && options?.debugDetails) {
        if (context.project_id) {
          localTrace.addContext(`project_id`, context.project_id, currentLevel + 1)
        }
        if (context.user_id) {
          localTrace.addContext(`user_id`, context.user_id, currentLevel + 1)
        }
        if (context.is_admin !== undefined) {
          localTrace.addContext(`is_admin`, context.is_admin, currentLevel + 1)
        }
        if (params && Object.keys(params).length > 0) {
          localTrace.addContext(`params`, params, currentLevel + 1)
        }
      }

      // Create evaluation context
      const evaluationContext: EvaluationContext = {
        getRule: (name: string) => {
          return () => {
            localTrace?.add(`🔗 Calling nested rule: '${name}'`, currentLevel + 1, "info")
            const nestedResult = this.checkRuleWithTrace(
              name,
              context,
              params,
              { ...options, debugDetails: false },
              currentLevel + 2,
              localTrace
            )
            localTrace?.addEvaluation(`Nested rule '${name}'`, nestedResult, currentLevel + 1)
            return nestedResult
          }
        },
        context,
        params: params || {},
      }

      // Evaluate the rule
      const evaluationFunction = evaluate(ruleAst)
      const result = evaluationFunction(evaluationContext)

      localTrace?.endRule(ruleName, result, currentLevel)

      // Merge local trace into parent trace
      if (parentTrace && localTrace) {
        parentTrace.merge(localTrace)
      }

      return result
    } catch (error) {
      localTrace?.add(`💥 Error in rule '${ruleName}': ${error}`, currentLevel, "error")
      localTrace?.endRule(ruleName, false, currentLevel)

      // Merge error trace into parent
      if (parentTrace && localTrace) {
        parentTrace.merge(localTrace)
      }

      throw error
    }
  }
}
