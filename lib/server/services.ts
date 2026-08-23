import "server-only"
import { ObjectId } from "mongodb"
import {
  calculateOccupancy,
  normalizeName,
  normalizePhone,
  rawReport,
  similarNames,
} from "@/lib/domain/logic"
import { ensureIndexes, getDb, getRawDb } from "./mongodb"
import type { Gender, Student } from "@/lib/domain/types"
import type { z } from "zod"
import type {
  reconciliationMatchSchema,
  studentCreateSchema,
  studentUpdateSchema,
} from "@/lib/domain/schemas"

const publicStudent = (student: Record<string, unknown>) => {
  const safe = { ...student }
  delete safe.source
  delete safe.normalizedName
  delete safe.normalizedPhone
  return safe
}
export async function studentsDb() {
  return getDb()
}
export async function listStudents(
  filters: {
    q?: string
    visited?: string
    group?: string
    exception?: string
  } = {}
) {
  const db = await studentsDb(),
    query: Record<string, unknown> = {}
  if (filters.q) {
    const normalized = normalizeName(filters.q),
      phone = normalizePhone(filters.q)
    query.$or = [
      {
        normalizedName: {
          $regex: normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        },
      },
      { normalizedPhone: { $regex: phone } },
    ]
  }
  if (filters.visited) query.visited = filters.visited === "true"
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
      visited: false,
      currentGroup: null,
      projectGroup: null,
      desktopRequired: null,
      desktopPartner: null,
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
  if (input.desktopPartnerId === id || input.projectPartnerIds.includes(id))
    throw new Error("CONFLICT:A student cannot be their own partner")
  if (input.desktopRequired && input.desktopPartnerId) {
    const partner = await db
      .collection<Student>("students")
      .findOne({ _id: input.desktopPartnerId })
    if (!partner) throw new Error("CONFLICT:Desktop partner was not found")
  }
  const now = new Date()
  const filter: Record<string, unknown> = { _id: id }
  if (input.expectedUpdatedAt)
    filter.updatedAt = new Date(input.expectedUpdatedAt)
  const session = db.client.startSession()
  let updated: Student | null = null
  try {
    await session.withTransaction(async () => {
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
      if (
        student.desktopPartner &&
        student.desktopPartner !== input.desktopPartnerId
      ) {
        const oldPair = [id, student.desktopPartner].sort().join(":")
        await db
          .collection("desktopPairs")
          .deleteOne({ pairKey: oldPair }, { session })
        await db
          .collection<Student>("students")
          .updateOne(
            { _id: student.desktopPartner },
            { $set: { desktopPartner: null, updatedAt: now } },
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
      if (input.desktopRequired && input.desktopPartnerId) {
        const pair = [id, input.desktopPartnerId].sort()
        await db
          .collection<{
            _id: string
            student1: string
            student2: string
            pairKey: string
            status: string
            createdAt: Date
            updatedAt: Date
          }>("desktopPairs")
          .updateOne(
            { pairKey: pair.join(":") },
            {
              $setOnInsert: {
                _id: new ObjectId().toHexString(),
                student1: pair[0],
                student2: pair[1],
                pairKey: pair.join(":"),
                status: "PENDING",
                createdAt: now,
              },
              $set: { updatedAt: now },
            },
            { upsert: true, session }
          )
        await db
          .collection<Student>("students")
          .updateOne(
            { _id: input.desktopPartnerId },
            { $set: { desktopPartner: id, updatedAt: now } },
            { session }
          )
      }
      updated = await db.collection<Student>("students").findOneAndUpdate(
        filter,
        {
          $set: {
            currentGroup: input.currentGroup,
            desktopRequired: input.desktopRequired,
            desktopPartner: input.desktopPartnerId,
            notes: input.notes,
            visited: input.markVisited ? true : student.visited,
            updatedAt: now,
          },
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
          markVisited: input.markVisited,
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
export async function dashboard() {
  const db = await studentsDb(),
    students = await db.collection<Student>("students").find({}).toArray()
  const assigned = students.filter(
    (s) => s.currentGroup && s.currentGroup !== "NOT_SURE"
  ).length
  return {
    stats: {
      total: students.length,
      visited: students.filter((s) => s.visited).length,
      notVisited: students.filter((s) => !s.visited).length,
      assigned,
      unassigned: students.filter((s) => s.currentGroup === null).length,
      notSure: students.filter((s) => s.currentGroup === "NOT_SURE").length,
      desktopUsers: students.filter((s) => s.desktopRequired).length,
      exceptions: students.filter((s) => s.isException).length,
      projectGroups: await db.collection("projectGroups").countDocuments(),
    },
    occupancy: calculateOccupancy(students),
    nextStudent: students
      .filter((s) => !s.visited)
      .sort((a, b) => a.name.localeCompare(b.name))[0]
      ? publicStudent(
          students
            .filter((s) => !s.visited)
            .sort((a, b) =>
              a.name.localeCompare(b.name)
            )[0] as unknown as Record<string, unknown>
        )
      : null,
  }
}
export async function reconciliationData() {
  const db = await studentsDb()
  const rawDb = await getRawDb()
  const [raw, matches, session] = await Promise.all([
    rawDb
      .collection("cdac")
      .find({ type: { $in: ["candidate_name", "phone_number"] } })
      .sort({ sourceIndex: 1 })
      .toArray(),
    db.collection("reconciliationMatches").find({}).toArray(),
    db
      .collection("importSessions")
      .findOne({ status: "IN_PROGRESS" }, { sort: { updatedAt: -1 } }),
  ])
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
  const raw = (await getRawDb()).collection<{
    _id: string
    type: string
    name?: string
    phoneNumber?: string
  }>("cdac")
  const [nameDoc, phoneDoc] = await Promise.all([
    raw.findOne({ _id: input.candidateNameDocumentId, type: "candidate_name" }),
    raw.findOne({ _id: input.phoneNumberDocumentId, type: "phone_number" }),
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
    visited: false,
    currentGroup: null,
    projectGroup: null,
    desktopRequired: null,
    desktopPartner: null,
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
