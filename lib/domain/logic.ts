import type { CurrentGroup, Gender, Student } from "./types"
import { GROUP_CAPACITIES, GROUP_IDS } from "./types"
import { rawCandidateSchema, rawPhoneSchema } from "./schemas"

export const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "")
  return digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits
}
export const normalizeName = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/\s+/g, " ")
export function levenshtein(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const old = row[j]
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
      prev = old
    }
  }
  return row[b.length]
}
export function similarNames(
  name: string,
  students: Pick<Student, "_id" | "name" | "normalizedName">[]
) {
  const target = normalizeName(name)
  return students.filter(
    (s) =>
      s.normalizedName === target ||
      levenshtein(target, s.normalizedName) <=
        Math.max(2, Math.floor(target.length * 0.15))
  )
}
export function calculateOccupancy(
  students: Pick<Student, "currentGroup" | "gender">[]
) {
  return GROUP_IDS.map((id) => {
    const members = students.filter((s) => s.currentGroup === id)
    const boys = members.filter((s) => s.gender === "BOY").length
    const girls = members.filter((s) => s.gender === "GIRL").length
    const capacity = GROUP_CAPACITIES[id]
    return {
      id,
      boys,
      girls,
      total: boys + girls,
      capacity: { ...capacity, total: capacity.boys + capacity.girls },
      remaining: {
        boys: capacity.boys - boys,
        girls: capacity.girls - girls,
        total: capacity.boys + capacity.girls - boys - girls,
      },
    }
  })
}
export function placementRuleError(input: {
  currentGroup: CurrentGroup
  gender: Gender
  desktopRequired: boolean | null
  desktopPartnerId: string | null
  desktopPartnerGroup?: CurrentGroup
  sameGenderCount: number
  conflictingProjectPartnerName?: string
}) {
  if (input.desktopRequired) {
    if (input.currentGroup !== "D6")
      return "Students using desktops must be assigned to D6"
    if (!input.desktopPartnerId)
      return "Students using desktops must select a desktop partner"
    if (input.desktopPartnerGroup !== "D6")
      return "The selected desktop partner must also be assigned to D6"
  }

  const groupId = GROUP_IDS.find((id) => id === input.currentGroup)
  if (groupId) {
    const capacity = GROUP_CAPACITIES[groupId],
      limit = input.gender === "BOY" ? capacity.boys : capacity.girls
    if (input.sameGenderCount >= limit)
      return `${groupId} has reached its ${input.gender === "BOY" ? "male" : "female"} capacity of ${limit}`
  }

  if (input.conflictingProjectPartnerName)
    return `${input.conflictingProjectPartnerName} is assigned to a different group. Project partners must remain in the same group`

  return null
}
export function rawReport(
  documents: unknown[],
  usedNameIds = new Set<string>(),
  usedPhoneIds = new Set<string>()
) {
  const names: Array<ReturnType<typeof rawCandidateSchema.parse>> = [],
    phones: Array<ReturnType<typeof rawPhoneSchema.parse>> = [],
    invalid: unknown[] = []
  for (const document of documents) {
    const name = rawCandidateSchema.safeParse(document)
    if (name.success) {
      names.push(name.data)
      continue
    }
    const phone = rawPhoneSchema.safeParse(document)
    if (phone.success) {
      phones.push(phone.data)
      continue
    }
    invalid.push(document)
  }
  const phoneCounts = new Map<string, number>(),
    nameCounts = new Map<string, number>()
  phones.forEach((p) =>
    phoneCounts.set(
      normalizePhone(p.phoneNumber),
      (phoneCounts.get(normalizePhone(p.phoneNumber)) ?? 0) + 1
    )
  )
  names.forEach((n) =>
    nameCounts.set(
      normalizeName(n.name),
      (nameCounts.get(normalizeName(n.name)) ?? 0) + 1
    )
  )
  return {
    names,
    phones,
    invalid,
    unmatchedNames: names.filter((n) => !usedNameIds.has(n._id)),
    unmatchedPhones: phones.filter((p) => !usedPhoneIds.has(p._id)),
    suspiciousNames: names.filter(
      (n) => (nameCounts.get(normalizeName(n.name)) ?? 0) > 1
    ),
    suspiciousPhones: phones.filter(
      (p) => (phoneCounts.get(normalizePhone(p.phoneNumber)) ?? 0) > 1
    ),
  }
}
