import { describe, expect, it } from "vitest"
import {
  calculateOccupancy,
  nextUnvisited,
  normalizeName,
  normalizePhone,
  rawReport,
  similarNames,
} from "./logic"
import {
  rawCandidateSchema,
  rawPhoneSchema,
  studentUpdateSchema,
} from "./schemas"

describe("raw source validation", () => {
  it("validates each source type without relating sourceIndex", () => {
    expect(
      rawCandidateSchema.parse({
        _id: "candidate_name:0",
        type: "candidate_name",
        name: "A Student",
        sourceIndex: 0,
      }).name
    ).toBe("A Student")
    expect(
      rawPhoneSchema.parse({
        _id: "phone_number:0",
        type: "phone_number",
        phoneNumber: "+919876543210",
        sourceIndex: 0,
      }).phoneNumber
    ).toContain("9876")
  })
  it("reports malformed and unmatched documents", () => {
    const report = rawReport(
      [
        {
          _id: "candidate_name:0",
          type: "candidate_name",
          name: "A Student",
          sourceIndex: 0,
        },
        {
          _id: "phone_number:9",
          type: "phone_number",
          phoneNumber: "+919876543210",
          sourceIndex: 9,
        },
        { type: "broken" },
      ],
      new Set(["candidate_name:0"])
    )
    expect(report.invalid).toHaveLength(1)
    expect(report.unmatchedNames).toHaveLength(0)
    expect(report.unmatchedPhones).toHaveLength(1)
  })
  it("flags duplicate raw values", () => {
    const report = rawReport([
      {
        _id: "candidate_name:0",
        type: "candidate_name",
        name: "Same Name",
        sourceIndex: 0,
      },
      {
        _id: "candidate_name:1",
        type: "candidate_name",
        name: "same name",
        sourceIndex: 1,
      },
    ])
    expect(report.suspiciousNames).toHaveLength(2)
  })
})
describe("student rules", () => {
  it("normalizes Indian phone numbers", () =>
    expect(normalizePhone("+91 98765-43210")).toBe("9876543210"))
  it("warns for exact and fuzzy names", () =>
    expect(
      similarNames("Prathmesh Chougale", [
        {
          _id: "1",
          name: "Prathamesh Chougale",
          normalizedName: normalizeName("Prathamesh Chougale"),
        },
      ])
    ).toHaveLength(1))
  it("accepts null and NOT_SURE current groups", () => {
    const base = {
      projectPartnerIds: [],
      desktopRequired: null,
      desktopPartnerId: null,
      notes: "",
      markVisited: false,
    }
    expect(
      studentUpdateSchema.parse({ ...base, currentGroup: null }).currentGroup
    ).toBeNull()
    expect(
      studentUpdateSchema.parse({ ...base, currentGroup: "NOT_SURE" })
        .currentGroup
    ).toBe("NOT_SURE")
  })
  it("keeps over-capacity groups selectable and reports negative remaining", () => {
    const students = Array.from({ length: 41 }, () => ({
      currentGroup: "D1" as const,
      gender: "BOY" as const,
    }))
    const d1 = calculateOccupancy(students)[0]
    expect(d1.total).toBe(41)
    expect(d1.remaining.total).toBe(-1)
  })
  it("calculates gender occupancy", () => {
    const d6 = calculateOccupancy([
      { currentGroup: "D6", gender: "BOY" },
      { currentGroup: "D6", gender: "GIRL" },
    ])[5]
    expect(d6).toMatchObject({ boys: 1, girls: 1, total: 2 })
  })
  it("selects the next alphabetical unvisited student", () =>
    expect(
      nextUnvisited([
        { _id: "1", name: "Zed", visited: false },
        { _id: "2", name: "Amy", visited: false },
      ])?._id
    ).toBe("2"))
})
