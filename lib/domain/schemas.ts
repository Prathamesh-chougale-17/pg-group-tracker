import { z } from "zod"
import { GROUP_IDS } from "./types"

export const rawCandidateSchema = z.object({
  _id: z.string().regex(/^candidate_name:/),
  type: z.literal("candidate_name"),
  name: z.string().trim().min(2),
  sourceIndex: z.number().int().nonnegative(),
})
export const rawPhoneSchema = z.object({
  _id: z.string().regex(/^phone_number:/),
  type: z.literal("phone_number"),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/),
  sourceIndex: z.number().int().nonnegative(),
})
export const genderSchema = z.enum(["BOY", "GIRL"])
export const currentGroupSchema = z.enum([...GROUP_IDS, "NOT_SURE"]).nullable()
export const studentCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(18),
  gender: genderSchema,
  notes: z.string().trim().max(1000).default(""),
  acknowledgeSimilarName: z.boolean().default(false),
})
export const studentUpdateSchema = z.object({
  currentGroup: currentGroupSchema,
  projectPartnerIds: z.array(z.string()).max(8).default([]),
  desktopRequired: z.boolean().nullable(),
  desktopPartnerId: z.string().nullable(),
  notes: z.string().trim().max(1000),
  expectedUpdatedAt: z.string().datetime().optional(),
})
export const studentAdminUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(18),
  gender: genderSchema,
  currentGroup: currentGroupSchema,
  desktopRequired: z.boolean().nullable(),
  notes: z.string().trim().max(1000),
  expectedUpdatedAt: z.string().datetime().optional(),
})
export const studentDeleteSchema = z.object({
  password: z.string().min(1),
})
export const reconciliationMatchSchema = z.object({
  sessionId: z.string().min(1),
  candidateNameDocumentId: z.string().regex(/^candidate_name:/),
  phoneNumberDocumentId: z.string().regex(/^phone_number:/),
  gender: genderSchema,
  confirmed: z.literal(true),
})
export const reconciliationSessionSchema = z.object({
  sessionId: z.string().min(1).optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]).default("IN_PROGRESS"),
  skippedNameIds: z.array(z.string()).default([]),
  skippedPhoneIds: z.array(z.string()).default([]),
})
