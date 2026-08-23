import "server-only"
import { ObjectId, type ClientSession, type Db } from "mongodb"
import {
  calculateOccupancy,
  normalizeName,
  normalizePhone,
  placementRuleError,
  rawReport,
  similarNames,
  studentSearchClauses,
} from "@/lib/domain/logic"
import { ensureIndexes, getDb, getRawDb } from "./mongodb"
import { GROUP_IDS, type Gender, type Student } from "@/lib/domain/types"
import type { z } from "zod"
import type {
  reconciliationMatchSchema,
  studentAdminUpdateSchema,
  studentCreateSchema,
  studentUpdateSchema,
} from "@/lib/domain/schemas"

const publicStudent = (student: Record<string, unknown>) => {
  const safe = { ...student }
  if (safe.currentGroup === "NOT_SURE") safe.currentGroup = null
  delete safe.source
  delete safe.normalizedName
  delete safe.normalizedPhone
  delete safe.desktopPartner
  return safe
}
export async function studentsDb() {
  return getDb()
}

async function assertPlacementRules(
  db: Db,
  student: Student,
  input: {
    currentGroup: Student["currentGroup"]
    gender: Student["gender"]
    desktopRequired: boolean | null
    projectPartnerIds?: string[]
  },
  session: ClientSession
) {
  const groupId = GROUP_IDS.find((id) => id === input.currentGroup)
  const placementChanged =
    student.currentGroup !== input.currentGroup ||
    student.gender !== input.gender
  const sameGenderCount =
    groupId && placementChanged
      ? await db.collection<Student>("students").countDocuments(
          {
            _id: { $ne: student._id },
            currentGroup: groupId,
            gender: input.gender,
          },
          { session }
        )
      : 0
  let projectPartnerIds = input.projectPartnerIds
  if (projectPartnerIds === undefined && student.projectGroup) {
    const projectGroup = await db
      .collection<{ _id: string; members: string[] }>("projectGroups")
      .findOne({ _id: student.projectGroup }, { session })
    projectPartnerIds = projectGroup?.members.filter((id) => id !== student._id)
  }
  const concreteGroup = groupId
  const conflictingProjectPartner =
    concreteGroup && projectPartnerIds?.length
      ? await db.collection<Student>("students").findOne(
          {
            _id: { $in: projectPartnerIds },
            currentGroup: {
              $in: GROUP_IDS.filter((groupId) => groupId !== concreteGroup),
            },
          },
          { session }
        )
      : null

  const error = placementRuleError({
    currentGroup: input.currentGroup,
    gender: input.gender,
    desktopRequired: input.desktopRequired,
    sameGenderCount,
    conflictingProjectPartnerName: conflictingProjectPartner?.name,
  })
  if (error) throw new Error(`CONFLICT:${error}`)
}
export async function listStudents(
  filters: {
    q?: string
    group?: string
    exception?: string
  } = {}
) {
  const db = await studentsDb(),
    query: Record<string, unknown> = {}
  if (filters.q) {
    query.$or = studentSearchClauses(filters.q)
  }
  if (filters.group === "UNASSIGNED") query.currentGroup = null
  else if (filters.group) query.currentGroup = filters.group
  if (filters.exception) query.isException = filters.exception === "true"
  return (
    await db
      .collection<Student>("students")
      .find(query)
      .sort({ name: 1 })
      .limit(250)
      .toArray()
  ).map((s) => publicStudent(s as unknown as Record<string, unknown>))
}
export async function createException(
  input: z.infer<typeof studentCreateSchema>
) {
  const db = await studentsDb(),
    normalizedPhone = normalizePhone(input.phone),
    normalizedName = normalizeName(input.name)
  await ensureIndexes(db)
  if (normalizedPhone.length !== 10)
    throw new Error("CONFLICT:Enter a valid 10-digit Indian phone number")
  const existing = await db
    .collection<Student>("students")
    .findOne({ normalizedPhone })
  if (existing)
    throw new Error(`CONFLICT:Student already exists: ${existing.name}`)
  const candidates = await db
    .collection<Student>("students")
    .find({ normalizedName: { $regex: normalizedName.split(" ")[0] } })
    .limit(40)
    .toArray()
  const similar = similarNames(input.name, candidates)
  if (similar.length && !input.acknowledgeSimilarName)
    throw new Error(
      `CONFLICT:Possible existing student found: ${similar.map((s) => s.name).join(", ")}`
    )
  const now = new Date(),
    student: Student = {
      _id: new ObjectId().toHexString(),
      name: input.name.trim(),
      normalizedName,
      phone: input.phone.trim(),
      normalizedPhone,
      gender: input.gender,
      currentGroup: null,
      projectGroup: null,
      desktopRequired: null,
      notes: input.notes,
      isException: true,
      createdAt: now,
      updatedAt: now,
    }
  await db.collection<Student>("students").insertOne(student)
  await db.collection("auditEvents").insertOne({
    type: "EXCEPTION_STUDENT_CREATED",
    studentId: student._id,
    at: now,
  })
  return publicStudent(student as unknown as Record<string, unknown>)
}
export async function updateStudent(
  id: string,
  input: z.infer<typeof studentUpdateSchema>
) {
  const db = await studentsDb()
  await ensureIndexes(db)
  const student = await db.collection<Student>("students").findOne({ _id: id })
  if (!student) throw new Error("NOT_FOUND")
  if (input.projectPartnerIds.includes(id))
    throw new Error("CONFLICT:A student cannot be their own partner")
  const now = new Date()
  const filter: Record<string, unknown> = { _id: id }
  if (input.expectedUpdatedAt)
    filter.updatedAt = new Date(input.expectedUpdatedAt)
  const session = db.client.startSession()
  let updated: Student | null = null
  try {
    await session.withTransaction(async () => {
      await assertPlacementRules(
        db,
        student,
        {
          currentGroup: input.currentGroup,
          gender: student.gender,
          desktopRequired: input.desktopRequired,
          projectPartnerIds: input.projectPartnerIds,
        },
        session
      )
      if (student.projectGroup && !input.projectPartnerIds.length) {
        await db
          .collection<{ _id: string }>("projectGroups")
          .deleteOne({ _id: student.projectGroup }, { session })
        await db
          .collection<Student>("students")
          .updateMany(
            { projectGroup: student.projectGroup },
            { $set: { projectGroup: null, updatedAt: now } },
            { session }
          )
      }
      if (input.projectPartnerIds.length) {
        const memberIds = [...new Set([id, ...input.projectPartnerIds])].sort()
        const groups = db.collection<{
          _id: string
          members: string[]
          membersKey: string
          name: string
          createdAt: Date
          updatedAt: Date
        }>("projectGroups")
        const conflict = await groups.findOne(
          {
            members: { $in: memberIds },
            membersKey: { $ne: memberIds.join(":") },
          },
          { session }
        )
        if (conflict)
          throw new Error(
            "CONFLICT:A selected student already belongs to another project group"
          )
        const groupId = student.projectGroup ?? new ObjectId().toHexString()
        await groups.updateOne(
          { _id: groupId },
          {
            $set: {
              name: `Project group · ${memberIds.length} members`,
              members: memberIds,
              membersKey: memberIds.join(":"),
              updatedAt: now,
            },
            $setOnInsert: { _id: groupId, createdAt: now },
          },
          { upsert: true, session }
        )
        await db
          .collection<Student>("students")
          .updateMany(
            { _id: { $in: memberIds } },
            { $set: { projectGroup: groupId, updatedAt: now } },
            { session }
          )
      }
      updated = await db.collection<Student>("students").findOneAndUpdate(
        filter,
        {
          $set: {
            currentGroup: input.currentGroup,
            desktopRequired: input.desktopRequired,
            notes: input.notes,
            updatedAt: now,
          },
          $unset: { desktopPartner: "" },
        },
        { returnDocument: "after", session }
      )
      if (!updated)
        throw new Error(
          "CONFLICT:This student changed elsewhere. Refresh and try again."
        )
      await db.collection("auditEvents").insertOne(
        {
          type: "STUDENT_UPDATED",
          studentId: id,
          at: now,
        },
        { session }
      )
    })
  } finally {
    await session.endSession()
  }
  if (!updated) throw new Error("CONFLICT:The update could not be completed")
  return publicStudent(updated as unknown as Record<string, unknown>)
}

export async function adminUpdateStudent(
  id: string,
  input: z.infer<typeof studentAdminUpdateSchema>
) {
  const db = await studentsDb()
  await ensureIndexes(db)
  const student = await db.collection<Student>("students").findOne({ _id: id })
  if (!student) throw new Error("NOT_FOUND")

  const normalizedPhone = normalizePhone(input.phone)
  if (normalizedPhone.length !== 10)
    throw new Error("CONFLICT:Enter a valid 10-digit Indian phone number")
  const duplicate = await db.collection<Student>("students").findOne({
    _id: { $ne: id },
    normalizedPhone,
  })
  if (duplicate)
    throw new Error(
      `CONFLICT:Phone number already belongs to ${duplicate.name}`
    )

  const now = new Date(),
    filter: Record<string, unknown> = { _id: id }
  if (input.expectedUpdatedAt)
    filter.updatedAt = new Date(input.expectedUpdatedAt)

  const session = db.client.startSession()
  let updated: Student | null = null
  try {
    await session.withTransaction(async () => {
      await assertPlacementRules(
        db,
        student,
        {
          currentGroup: input.currentGroup,
          gender: input.gender,
          desktopRequired: input.desktopRequired,
        },
        session
      )

      updated = await db.collection<Student>("students").findOneAndUpdate(
        filter,
        {
          $set: {
            name: input.name,
            normalizedName: normalizeName(input.name),
            phone: input.phone,
            normalizedPhone,
            gender: input.gender,
            currentGroup: input.currentGroup,
            desktopRequired: input.desktopRequired,
            notes: input.notes,
            updatedAt: now,
          },
          $unset: { desktopPartner: "" },
        },
        { returnDocument: "after", session }
      )
      if (!updated)
        throw new Error(
          "CONFLICT:This student changed elsewhere. Refresh and try again."
        )

      await db
        .collection("reconciliationMatches")
        .updateMany(
          { studentId: id },
          { $set: { gender: input.gender } },
          { session }
        )
      await db.collection("auditEvents").insertOne(
        {
          type: "STUDENT_ADMIN_UPDATED",
          studentId: id,
          at: now,
        },
        { session }
      )
    })
  } finally {
    await session.endSession()
  }
  if (!updated) throw new Error("CONFLICT:The update could not be completed")
  return publicStudent(updated as unknown as Record<string, unknown>)
}

export async function deleteStudent(id: string) {
  const db = await studentsDb()
  const student = await db.collection<Student>("students").findOne({ _id: id })
  if (!student) throw new Error("NOT_FOUND")

  const now = new Date(),
    session = db.client.startSession()
  try {
    await session.withTransaction(async () => {
      const projectGroups = db.collection<{
          _id: string
          members: string[]
          membersKey: string
          name: string
          updatedAt: Date
        }>("projectGroups"),
        projectGroup = await projectGroups.findOne({ members: id }, { session })
      if (projectGroup) {
        const remaining = projectGroup.members.filter(
          (memberId) => memberId !== id
        )
        if (remaining.length >= 2) {
          await projectGroups.updateOne(
            { _id: projectGroup._id },
            {
              $set: {
                members: remaining,
                membersKey: [...remaining].sort().join(":"),
                name: `Project group · ${remaining.length} members`,
                updatedAt: now,
              },
            },
            { session }
          )
        } else {
          await projectGroups.deleteOne({ _id: projectGroup._id }, { session })
          await db
            .collection<Student>("students")
            .updateMany(
              { _id: { $in: remaining } },
              { $set: { projectGroup: null, updatedAt: now } },
              { session }
            )
        }
      }

      await db
        .collection("reconciliationMatches")
        .deleteMany({ studentId: id }, { session })
      const result = await db
        .collection<Student>("students")
        .deleteOne({ _id: id }, { session })
      if (!result.deletedCount) throw new Error("NOT_FOUND")
      await db.collection("auditEvents").insertOne(
        {
          type: "STUDENT_DELETED",
          studentId: id,
          name: student.name,
          at: now,
        },
        { session }
      )
    })
  } finally {
    await session.endSession()
  }
  return { id }
}
export async function dashboard() {
  const db = await studentsDb(),
    students = await db.collection<Student>("students").find({}).toArray()
  const assigned = students.filter((student) =>
    GROUP_IDS.some((groupId) => groupId === student.currentGroup)
  ).length
  return {
    stats: {
      total: students.length,
      assigned,
      unassigned: students.length - assigned,
      desktopUsers: students.filter((s) => s.desktopRequired).length,
      exceptions: students.filter((s) => s.isException).length,
      projectGroups: await db.collection("projectGroups").countDocuments(),
    },
    occupancy: calculateOccupancy(students),
  }
}
export async function reconciliationData() {
  const db = await studentsDb()
  const rawDb = await getRawDb()
  const [names, phones, matches, session] = await Promise.all([
    rawDb
      .collection<{ _id: string; name: string; sourceIndex: number }>("student")
      .find({})
      .sort({ sourceIndex: 1 })
      .toArray(),
    rawDb
      .collection<{ _id: string; phoneNumber: string; sourceIndex: number }>(
        "phone-number"
      )
      .find({})
      .sort({ sourceIndex: 1 })
      .toArray(),
    db.collection("reconciliationMatches").find({}).toArray(),
    db
      .collection("importSessions")
      .findOne({ status: "IN_PROGRESS" }, { sort: { updatedAt: -1 } }),
  ])
  const raw = [
    ...names.map((document) => ({
      ...document,
      type: "candidate_name" as const,
    })),
    ...phones.map((document) => ({
      ...document,
      type: "phone_number" as const,
    })),
  ]
  const report = rawReport(
    raw,
    new Set(matches.map((m) => String(m.candidateNameDocumentId))),
    new Set(matches.map((m) => String(m.phoneNumberDocumentId)))
  )
  return { ...report, matched: matches.length, session }
}
export async function confirmMatch(
  input: z.infer<typeof reconciliationMatchSchema>
) {
  const db = await studentsDb()
  await ensureIndexes(db)
  const rawDb = await getRawDb()
  const [nameDoc, phoneDoc] = await Promise.all([
    rawDb
      .collection<{ _id: string; name: string; sourceIndex: number }>("student")
      .findOne({ _id: input.candidateNameDocumentId }),
    rawDb
      .collection<{ _id: string; phoneNumber: string; sourceIndex: number }>(
        "phone-number"
      )
      .findOne({ _id: input.phoneNumberDocumentId }),
  ])
  if (!nameDoc || !phoneDoc)
    throw new Error("CONFLICT:The selected raw records no longer exist")
  const normalizedPhone = normalizePhone(String(phoneDoc.phoneNumber)),
    now = new Date(),
    id = new ObjectId().toHexString()
  const student: Student = {
    _id: id,
    name: String(nameDoc.name),
    normalizedName: normalizeName(String(nameDoc.name)),
    phone: String(phoneDoc.phoneNumber),
    normalizedPhone,
    gender: input.gender,
    currentGroup: null,
    projectGroup: null,
    desktopRequired: null,
    notes: "",
    isException: false,
    source: {
      candidateNameDocumentId: input.candidateNameDocumentId,
      phoneNumberDocumentId: input.phoneNumberDocumentId,
      verifiedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  }
  const session = db.client.startSession()
  try {
    await session.withTransaction(async () => {
      await db.collection<Student>("students").insertOne(student, { session })
      await db
        .collection<{
          _id: string
          sessionId: string
          studentId: string
          candidateNameDocumentId: string
          phoneNumberDocumentId: string
          gender: Gender
          verifiedAt: Date
        }>("reconciliationMatches")
        .insertOne(
          {
            _id: new ObjectId().toHexString(),
            sessionId: input.sessionId,
            studentId: id,
            candidateNameDocumentId: input.candidateNameDocumentId,
            phoneNumberDocumentId: input.phoneNumberDocumentId,
            gender: input.gender,
            verifiedAt: now,
          },
          { session }
        )
      await db
        .collection<{
          _id: string
          status: string
          createdAt: Date
          updatedAt: Date
        }>("importSessions")
        .updateOne(
          { _id: input.sessionId },
          {
            $set: { status: "IN_PROGRESS", updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true, session }
        )
    })
  } catch {
    throw new Error(
      "CONFLICT:That name, phone, or raw source record is already assigned"
    )
  } finally {
    await session.endSession()
  }
  return publicStudent(student as unknown as Record<string, unknown>)
}
