import { parse } from "./parser"

describe("parse", () => {
  it("returns parsed object", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
    ])
    expect(typeof result === "object").toEqual(true)
    expect(result.ast).toBeDefined()
    expect(result.requiredParams).toBeDefined()
    expect(result.usedRules).toBeDefined()
  })

  it("A and B", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: { type: "expression", value: "A", requiredParams: [] },
      right: { type: "expression", value: "B", requiredParams: [] },
      requiredParams: [],
    })
    expect(result.requiredParams).toEqual([])
    expect(result.usedRules).toEqual(["A", "B"])
  })

  it("not A or B", () => {
    const result = parse([
      { type: "operator", value: "not" },
      { type: "expression", value: "A" },
      { type: "operator", value: "or" },
      { type: "expression", value: "B" },
    ])
    expect(result.ast).toEqual({
      operator: "or",
      left: {
        operator: "not",
        right: { type: "expression", value: "A", requiredParams: [] },
        requiredParams: [],
      },
      right: { type: "expression", value: "B", requiredParams: [] },
      requiredParams: [],
    })
  })

  it("not A and B", () => {
    const result = parse([
      { type: "operator", value: "not" },
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: {
        operator: "not",
        right: { type: "expression", value: "A", requiredParams: [] },
        requiredParams: [],
      },
      right: { type: "expression", value: "B", requiredParams: [] },
      requiredParams: [],
    })
  })

  it("not ((((A and B)))) and (C)", () => {
    const result = parse([
      { type: "operator", value: "not" },
      { type: "operator", value: "(" },
      { type: "operator", value: "(" },
      { type: "operator", value: "(" },
      { type: "operator", value: "(" },
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
      { type: "operator", value: ")" },
      { type: "operator", value: ")" },
      { type: "operator", value: ")" },
      { type: "operator", value: ")" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "C" },
      { type: "operator", value: ")" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: {
        operator: "not",
        right: {
          operator: "and",
          left: { type: "expression", value: "A", requiredParams: [] },
          right: { type: "expression", value: "B", requiredParams: [] },
          requiredParams: [],
        },
        requiredParams: [],
      },
      right: { type: "expression", value: "C", requiredParams: [] },
      requiredParams: [],
    })
  })

  it("not ((A and B) and (C or D))", () => {
    const result = parse([
      { type: "operator", value: "not" },
      { type: "operator", value: "(" },
      { type: "operator", value: "(" },
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
      { type: "operator", value: ")" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "C" },
      { type: "operator", value: "or" },
      { type: "expression", value: "D" },
      { type: "operator", value: ")" },
      { type: "operator", value: ")" },
    ])
    expect(result.ast).toEqual({
      operator: "not",
      right: {
        operator: "and",
        left: {
          operator: "and",
          left: { type: "expression", value: "A", requiredParams: [] },
          right: { type: "expression", value: "B", requiredParams: [] },
          requiredParams: [],
        },
        right: {
          operator: "or",
          left: { type: "expression", value: "C", requiredParams: [] },
          right: { type: "expression", value: "D", requiredParams: [] },
          requiredParams: [],
        },
        requiredParams: [],
      },
      requiredParams: [],
    })
  })

  it("A or B or C", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "or" },
      { type: "expression", value: "B" },
      { type: "operator", value: "or" },
      { type: "expression", value: "C" },
    ])

    expect(result.ast).toEqual({
      operator: "or",
      left: {
        type: "expression",
        value: "A",
        requiredParams: [],
      },
      right: {
        operator: "or",
        left: { type: "expression", value: "B", requiredParams: [] },
        right: { type: "expression", value: "C", requiredParams: [] },
        requiredParams: [],
      },
      requiredParams: [],
    })
  })

  it("A and B or C", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
      { type: "operator", value: "or" },
      { type: "expression", value: "C" },
    ])
    expect(result.ast).toEqual({
      operator: "or",
      left: {
        operator: "and",
        left: { type: "expression", value: "A", requiredParams: [] },
        right: { type: "expression", value: "B", requiredParams: [] },
        requiredParams: [],
      },
      right: { type: "expression", value: "C", requiredParams: [] },
      requiredParams: [],
    })
  })

  it("A and ( B or C )", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "B" },
      { type: "operator", value: "or" },
      { type: "expression", value: "C" },
      { type: "operator", value: ")" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: { type: "expression", value: "A", requiredParams: [] },
      right: {
        operator: "or",
        left: { type: "expression", value: "B", requiredParams: [] },
        right: { type: "expression", value: "C", requiredParams: [] },
        requiredParams: [],
      },
      requiredParams: [],
    })
  })

  it("A or ( B and C )", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "or" },
      { type: "operator", value: "(" },
      { type: "expression", value: "B" },
      { type: "operator", value: "and" },
      { type: "expression", value: "C" },
      { type: "operator", value: ")" },
    ])
    expect(result.ast).toEqual({
      operator: "or",
      left: { type: "expression", value: "A", requiredParams: [] },
      right: {
        operator: "and",
        left: { type: "expression", value: "B", requiredParams: [] },
        right: { type: "expression", value: "C", requiredParams: [] },
        requiredParams: [],
      },
      requiredParams: [],
    })
  })

  it("A and not B", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "operator", value: "not" },
      { type: "expression", value: "B" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: { type: "expression", value: "A", requiredParams: [] },
      right: {
        operator: "not",
        right: { type: "expression", value: "B", requiredParams: [] },
        requiredParams: [],
      },
      requiredParams: [],
    })
  })

  it("A and ( B or C  and ( D or E ) )", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "B" },
      { type: "operator", value: "or" },
      { type: "expression", value: "C" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "D" },
      { type: "operator", value: "or" },
      { type: "expression", value: "E" },
      { type: "operator", value: ")" },
      { type: "operator", value: ")" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: { type: "expression", value: "A", requiredParams: [] },
      right: {
        operator: "or",
        left: {
          type: "expression",
          value: "B",
          requiredParams: [],
        },
        right: {
          operator: "and",
          left: {
            type: "expression",
            value: "C",
            requiredParams: [],
          },
          right: {
            operator: "or",
            left: { type: "expression", value: "D", requiredParams: [] },
            right: { type: "expression", value: "E", requiredParams: [] },
            requiredParams: [],
          },
          requiredParams: [],
        },
        requiredParams: [],
      },
      requiredParams: [],
    })
  })

  it("A and ( (B or C)  and ( D or E ) )", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "operator", value: "(" },
      { type: "expression", value: "B" },
      { type: "operator", value: "or" },
      { type: "expression", value: "C" },
      { type: "operator", value: ")" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "D" },
      { type: "operator", value: "or" },
      { type: "expression", value: "E" },
      { type: "operator", value: ")" },
      { type: "operator", value: ")" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: { type: "expression", value: "A", requiredParams: [] },
      right: {
        operator: "and",
        left: {
          operator: "or",
          left: { type: "expression", value: "B", requiredParams: [] },
          right: { type: "expression", value: "C", requiredParams: [] },
          requiredParams: [],
        },
        right: {
          operator: "or",
          left: { type: "expression", value: "D", requiredParams: [] },
          right: { type: "expression", value: "E", requiredParams: [] },
          requiredParams: [],
        },
        requiredParams: [],
      },
      requiredParams: [],
    })
  })

  it("not not A and not (B or C)", () => {
    const result = parse([
      { type: "operator", value: "not" },
      { type: "operator", value: "not" },
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "operator", value: "not" },
      { type: "operator", value: "(" },
      { type: "expression", value: "B" },
      { type: "operator", value: "or" },
      { type: "expression", value: "C" },
      { type: "operator", value: ")" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: {
        operator: "not",
        right: {
          operator: "not",
          right: { type: "expression", value: "A", requiredParams: [] },
          requiredParams: [],
        },
        requiredParams: [],
      },
      right: {
        operator: "not",
        right: {
          operator: "or",
          left: { type: "expression", value: "B", requiredParams: [] },
          right: { type: "expression", value: "C", requiredParams: [] },
          requiredParams: [],
        },
        requiredParams: [],
      },
      requiredParams: [],
    })
  })

  it("not A and B", () => {
    const result = parse([
      { type: "operator", value: "not" },
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: {
        operator: "not",
        right: { type: "expression", value: "A", requiredParams: [] },
        requiredParams: [],
      },
      right: { type: "expression", value: "B", requiredParams: [] },
      requiredParams: [],
    })
  })

  it("rule:admin_required and (token.is_admin_project:True or domain_id:'ccadmin')", () => {
    const result = parse([
      { type: "expression", value: "rule:admin_required" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "token.is_admin_project:True" },
      { type: "operator", value: "or" },
      { type: "expression", value: "domain_id:'ccadmin'" },
      { type: "operator", value: ")" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: {
        type: "expression",
        value: "rule:admin_required",
        requiredParams: [],
      },
      right: {
        left: { type: "expression", value: "token.is_admin_project:True", requiredParams: [] },
        operator: "or",
        right: { type: "expression", value: "domain_id:'ccadmin'", requiredParams: [] },
        requiredParams: [],
      },
      requiredParams: [],
    })
    expect(result.usedRules).toContain("admin_required")
  })

  it("A", () => {
    const result = parse([{ type: "expression", value: "A" }])
    expect(result.ast).toEqual({
      type: "expression",
      value: "A",
      requiredParams: [],
    })
    expect(result.usedRules).toEqual(["A"])
  })

  it("@ and (! or B)", () => {
    const result = parse([
      { type: "expression", value: "@" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "!" },
      { type: "operator", value: "or" },
      { type: "expression", value: "B" },
      { type: "operator", value: ")" },
    ])
    expect(result.ast).toEqual({
      operator: "and",
      left: {
        type: "expression",
        value: "@",
        requiredParams: [],
      },
      right: {
        left: { type: "expression", value: "!", requiredParams: [] },
        operator: "or",
        right: { type: "expression", value: "B", requiredParams: [] },
        requiredParams: [],
      },
      requiredParams: [],
    })
  })

  it("@", () => {
    const result = parse([{ type: "expression", value: "@" }])
    expect(result.ast).toEqual({
      type: "expression",
      value: "@",
      requiredParams: [],
    })
  })

  it("!", () => {
    const result = parse([{ type: "expression", value: "!" }])
    expect(result.ast).toEqual({
      type: "expression",
      value: "!",
      requiredParams: [],
    })
  })

  describe("PARSE ERROR", () => {
    it("and", () => {
      expect(() => {
        parse([{ type: "operator", value: "and" }])
      }).toThrowError("PARSE ERROR: tokens must not begin with 'and' or 'or'")
    })

    it("or A", () => {
      expect(() => {
        parse([
          { type: "operator", value: "or" },
          { type: "expression", value: "A" },
        ])
      }).toThrowError("PARSE ERROR: tokens must not begin with 'and' or 'or'")
    })

    it("A or B and", () => {
      expect(() => {
        parse([
          { type: "expression", value: "A" },
          { type: "operator", value: "or" },
          { type: "expression", value: "B" },
          { type: "operator", value: "and" },
        ])
      }).toThrowError("PARSE ERROR: tokens must not end with 'and' or 'or' or 'not'")
    })

    it("A or B not", () => {
      expect(() => {
        parse([
          { type: "expression", value: "A" },
          { type: "operator", value: "or" },
          { type: "expression", value: "B" },
          { type: "operator", value: "not" },
        ])
      }).toThrowError("PARSE ERROR: tokens must not end with 'and' or 'or' or 'not'")
    })

    it("A or B or", () => {
      expect(() => {
        parse([
          { type: "expression", value: "A" },
          { type: "operator", value: "or" },
          { type: "expression", value: "B" },
          { type: "operator", value: "or" },
        ])
      }).toThrowError("PARSE ERROR: tokens must not end with 'and' or 'or' or 'not'")
    })

    it("A or or B", () => {
      expect(() => {
        parse([
          { type: "expression", value: "A" },
          { type: "operator", value: "or" },
          { type: "operator", value: "or" },
          { type: "expression", value: "B" },
        ])
      }).toThrowError("PARSE ERROR: tokens must not contain two operators of the type 'and' or 'or' in a row")
    })

    it("A B", () => {
      expect(() => {
        parse([
          { type: "expression", value: "A" },
          { type: "expression", value: "B" },
        ])
      }).toThrowError("PARSE ERROR: tokens must not contain two expressions in a row")
    })
  })
})
