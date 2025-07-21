// const { parse } = require("./parser")
import { parse } from "./parser"

describe("parse", () => {
  it("returns parsed object", () => {
    const result = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
    ])
    expect(typeof result === "object").toEqual(true)
  })

  it("A and B", () => {
    // A and B
    const tree = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
    ])
    // console.log(tree)
    expect(tree).toEqual({
      operator: "and",
      left: { type: "expression", value: "A" },
      right: { type: "expression", value: "B" },
    })
  })

  it("not A or B", () => {
    // A and B
    const tree = parse([
      { type: "operator", value: "not" },
      { type: "expression", value: "A" },
      { type: "operator", value: "or" },
      { type: "expression", value: "B" },
    ])
    // console.log(tree)
    expect(tree).toEqual({
      operator: "or",
      left: {
        operator: "not",
        right: { type: "expression", value: "A" },
      },
      right: { type: "expression", value: "B" },
    })
  })

  it("not A and B", () => {
    // A and B
    const tree = parse([
      { type: "operator", value: "not" },
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
    ])
    // console.log(tree)
    expect(tree).toEqual({
      operator: "and",
      left: {
        operator: "not",
        right: { type: "expression", value: "A" },
      },
      right: { type: "expression", value: "B" },
    })
  })

  it("not ((((A and B)))) and (C)", () => {
    // A and B
    const tree = parse([
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
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      operator: "and",
      left: {
        operator: "not",
        right: {
          operator: "and",
          left: { type: "expression", value: "A" },
          right: { type: "expression", value: "B" },
        },
      },
      right: { type: "expression", value: "C" },
    })
  })

  it("not ((A and B) and (C or D))", () => {
    // A and B
    const tree = parse([
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
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      operator: "not",
      right: {
        operator: "and",
        left: {
          operator: "and",
          left: { type: "expression", value: "A" },
          right: { type: "expression", value: "B" },
        },
        right: {
          operator: "or",
          left: { type: "expression", value: "C" },
          right: { type: "expression", value: "D" },
        },
      },
    })
  })

  it("A or B or C", () => {
    // A or B or C
    expect(
      parse([
        { type: "expression", value: "A" },
        { type: "operator", value: "or" },
        { type: "expression", value: "B" },
        { type: "operator", value: "or" },
        { type: "expression", value: "C" },
      ])
    ).toEqual({
      operator: "or",
      left: { type: "expression", value: "A" },
      right: {
        operator: "or",
        left: { type: "expression", value: "B" },
        right: { type: "expression", value: "C" },
      },
    })
  })

  it("A and B or C", () => {
    // A and B or C
    const tree = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
      { type: "operator", value: "or" },
      { type: "expression", value: "C" },
    ])
    // console.log(tree)
    expect(tree).toEqual({
      operator: "or",
      left: {
        operator: "and",
        left: { type: "expression", value: "A" },
        right: { type: "expression", value: "B" },
      },
      right: { type: "expression", value: "C" },
    })
  })

  it("A and ( B or C )", () => {
    // A and ( B or C )
    const tree = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "B" },
      { type: "operator", value: "or" },
      { type: "expression", value: "C" },
      { type: "operator", value: ")" },
    ])

    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      operator: "and",
      left: { type: "expression", value: "A" },
      right: {
        operator: "or",
        left: { type: "expression", value: "B" },
        right: { type: "expression", value: "C" },
      },
    })
  })

  it("A or ( B and C )", () => {
    // A and ( B or C )
    const tree = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "or" },
      { type: "operator", value: "(" },
      { type: "expression", value: "B" },
      { type: "operator", value: "and" },
      { type: "expression", value: "C" },
      { type: "operator", value: ")" },
    ])

    // console.log(tree)
    expect(tree).toEqual({
      operator: "or",
      left: { type: "expression", value: "A" },
      right: {
        operator: "and",
        left: { type: "expression", value: "B" },
        right: { type: "expression", value: "C" },
      },
    })
  })

  it("A and not B", () => {
    // A and not B
    const tree = parse([
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "operator", value: "not" },
      { type: "expression", value: "B" },
    ])
    // console.log(tree)
    expect(tree).toEqual({
      operator: "and",
      left: { type: "expression", value: "A" },
      right: { operator: "not", right: { type: "expression", value: "B" } },
    })
  })

  it("A and ( B or C  and ( D or E ) )", () => {
    // A and ( B or C  and ( D or E ) )
    const tree = parse([
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
    // console.log(">>>>>>>>>>>>>>>>>>>>")
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      operator: "and",
      left: { type: "expression", value: "A" },
      right: {
        operator: "or",
        left: { type: "expression", value: "B" },
        right: {
          operator: "and",
          left: { type: "expression", value: "C" },
          right: {
            operator: "or",
            left: { type: "expression", value: "D" },
            right: { type: "expression", value: "E" },
          },
        },
      },
    })
  })

  it("A and ( (B or C)  and ( D or E ) )", () => {
    // A and ( B or C  and ( D or E ) )
    const tree = parse([
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
    // console.log(">>>>>>>>>>>>>>>>>>>>")
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      operator: "and",
      left: { type: "expression", value: "A" },
      right: {
        operator: "and",
        left: {
          operator: "or",
          left: { type: "expression", value: "B" },
          right: { type: "expression", value: "C" },
        },
        right: {
          operator: "or",
          left: { type: "expression", value: "D" },
          right: { type: "expression", value: "E" },
        },
      },
    })
  })

  it("not not A and not (B or C)", () => {
    // A and ( B or C  and ( D or E ) )
    const tree = parse([
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
    // console.log(">>>>>>>>>>>>>>>>>>>>")
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      operator: "and",
      left: {
        operator: "not",
        right: {
          operator: "not",
          right: { type: "expression", value: "A" },
        },
      },
      right: {
        operator: "not",
        right: {
          operator: "or",
          left: { type: "expression", value: "B" },
          right: { type: "expression", value: "C" },
        },
      },
    })
  })

  it("not A and B", () => {
    // A and ( B or C  and ( D or E ) )
    const tree = parse([
      { type: "operator", value: "not" },
      { type: "expression", value: "A" },
      { type: "operator", value: "and" },
      { type: "expression", value: "B" },
    ])
    // console.log(">>>>>>>>>>>>>>>>>>>>")
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      operator: "and",
      left: {
        operator: "not",
        right: { type: "expression", value: "A" },
      },
      right: { type: "expression", value: "B" },
    })
  })

  it("rule:admin_required and (token.is_admin_project:True or domain_id:'ccadmin')", () => {
    const tree = parse([
      { type: "expression", value: "rule:admin_required" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "token.is_admin_project:True" },
      { type: "operator", value: "or" },
      { type: "expression", value: "domain_id:'ccadmin'" },
      { type: "operator", value: ")" },
    ])
    // console.log(">>>>>>>>>>>>>>>>>>>>")
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      operator: "and",
      left: {
        type: "expression",
        value: "rule:admin_required",
      },
      right: {
        left: { type: "expression", value: "token.is_admin_project:True" },
        operator: "or",
        right: { type: "expression", value: "domain_id:'ccadmin'" },
      },
    })
  })

  it("A)", () => {
    const tree = parse([{ type: "expression", value: "A" }])
    // console.log(">>>>>>>>>>>>>>>>>>>>")
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      type: "expression",
      value: "A",
    })
  })

  it("@ and (! or B)", () => {
    const tree = parse([
      { type: "expression", value: "@" },
      { type: "operator", value: "and" },
      { type: "operator", value: "(" },
      { type: "expression", value: "!" },
      { type: "operator", value: "or" },
      { type: "expression", value: "B" },
      { type: "operator", value: ")" },
    ])
    // console.log(">>>>>>>>>>>>>>>>>>>>")
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      operator: "and",
      left: {
        type: "expression",
        value: "@",
      },
      right: {
        left: { type: "expression", value: "!" },
        operator: "or",
        right: { type: "expression", value: "B" },
      },
    })
  })

  it("@", () => {
    const tree = parse([{ type: "expression", value: "@" }])
    // console.log(">>>>>>>>>>>>>>>>>>>>")
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      type: "expression",
      value: "@",
    })
  })

  it("!", () => {
    const tree = parse([{ type: "expression", value: "!" }])
    // console.log(">>>>>>>>>>>>>>>>>>>>")
    // console.log(JSON.stringify(tree, null, 2))
    expect(tree).toEqual({
      type: "expression",
      value: "!",
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
