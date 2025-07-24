import { z } from "zod"
import { tokenize } from "./lexer"
import { parse, ASTNode } from "./parser"
import { evaluate, EvaluationContext, PolicyContext } from "./evaluator"
import { createDebugTrace } from "./debugTrace"

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
  .catchall(z.any()) // Allow additional properties

export const PolicyOptionsSchema = z
  .object({
    debug: z.boolean().optional(),
  })
  .optional()
  .default({})

export type PolicyConfig = z.infer<typeof PolicyConfigSchema>
export type KeystoneTokenPayload = z.infer<typeof KeystoneTokenPayloadSchema>
export type PolicyOptions = z.infer<typeof PolicyOptionsSchema>

interface UserPolicy {
  check: (ruleName: string, params?: PolicyCheckParams) => boolean
}

export class PolicyEngine {
  private config: PolicyConfig
  private compiledRules: Map<string, ASTNode> = new Map()

  constructor(config: PolicyConfig) {
    if (!config || typeof config !== "object") {
      throw new Error("PolicyEngine requires a valid configuration object")
    }

    this.config = config
    this.compileRules()
  }

  private compileRules(): void {
    for (const [ruleName, ruleExpression] of Object.entries(this.config)) {
      try {
        const tokens = tokenize(ruleExpression.trim())
        const ast = parse(tokens)
        this.compiledRules.set(ruleName, ast)
      } catch (error) {
        throw new Error(`Failed to compile rule '${ruleName}': ${error}`)
      }
    }
  }

  policy(tokenPayload: unknown, options: unknown = {}): UserPolicy {
    // Validate inputs with Zod
    const validatedTokenPayload = KeystoneTokenPayloadSchema.parse(tokenPayload)
    const validatedOptions = PolicyOptionsSchema.parse(options)

    const context = this.buildContext(validatedTokenPayload)

    return {
      check: (ruleName: string, params?: PolicyCheckParams): boolean => {
        return this.checkRule(ruleName, context, params, validatedOptions)
      },
    }
  }

  private buildContext(tokenPayload: KeystoneTokenPayload): PolicyContext {
    return {
      // Core token properties
      roles: tokenPayload.roles || [],
      user: tokenPayload.user,
      project: tokenPayload.project,
      domain: tokenPayload.domain,
      system: tokenPayload.system,

      // Flattened properties for easier access in policies
      user_id: tokenPayload.user?.id,
      user_name: tokenPayload.user?.name,
      domain_id: tokenPayload.domain?.id || tokenPayload.project?.domain?.id || tokenPayload.user?.domain?.id,
      domain_name: tokenPayload.domain?.name || tokenPayload.project?.domain?.name || tokenPayload.user?.domain?.name,
      project_id: tokenPayload.project?.id,
      project_domain_id: tokenPayload.project?.domain?.id,
      user_domain_id: tokenPayload.user?.domain?.id,
      is_admin: tokenPayload.is_admin || tokenPayload.roles?.some((role) => role.name === "admin"),
      is_admin_project: tokenPayload.is_admin_project,

      // System scope handling
      system_scope: tokenPayload.system?.all ? "all" : undefined,

      // For policies that reference token.* explicitly
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

      // Support legacy flat properties (for backward compatibility with tests)
      ...tokenPayload,
    }
  }

  private checkRule(
    ruleName: string,
    context: PolicyContext,
    params?: PolicyCheckParams,
    options: PolicyOptions = {}
  ): boolean {
    const debugTrace = options.debug ? createDebugTrace(`Checking rule: ${ruleName}`) : null

    try {
      // Get the rule AST (compiled or default)
      let ruleAst = this.compiledRules.get(ruleName)

      if (!ruleAst) {
        // Fall back to _default rule
        ruleAst = this.compiledRules.get("_default")
        if (!ruleAst) {
          throw new Error(`Rule '${ruleName}' not found and no _default rule available`)
        }
        debugTrace?.add(`Rule '${ruleName}' not found, using _default`)
      }

      // Create evaluation context
      const evaluationContext: EvaluationContext = {
        getRule: (name: string) => {
          debugTrace?.add(`Evaluating nested rule: ${name}`, 1)
          return () => this.checkRule(name, context, params, { debug: false })
        },
        context,
        params: params || {},
      }

      // Evaluate the rule
      const evaluationFunction = evaluate(ruleAst)
      const result = evaluationFunction(evaluationContext)

      debugTrace?.add(`Result: ${result}`)

      if (options.debug) {
        debugTrace?.log()
      }

      return result
    } catch (error) {
      debugTrace?.add(`Error: ${error}`)
      if (options.debug) {
        debugTrace?.log()
      }
      throw error
    }
  }
}
