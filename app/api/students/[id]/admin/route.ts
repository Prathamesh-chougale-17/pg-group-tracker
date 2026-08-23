import { createHash, timingSafeEqual } from "node:crypto"

import {
  studentAdminUpdateSchema,
  studentDeleteSchema,
} from "@/lib/domain/schemas"
import { errorResponse, ok } from "@/lib/server/http"
import { adminUpdateStudent, deleteStudent } from "@/lib/server/services"

export const runtime = "nodejs"

const digest = (value: string) => createHash("sha256").update(value).digest()

function verifyDeletePassword(password: string) {
  const configured = process.env.STUDENT_DELETE_PASSWORD
  if (!configured) throw new Error("STUDENT_DELETE_PASSWORD is not configured")
  if (!timingSafeEqual(digest(password), digest(configured)))
    throw new Error("UNAUTHORIZED")
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return ok(
      await adminUpdateStudent(
        (await params).id,
        studentAdminUpdateSchema.parse(await request.json())
      )
    )
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { password } = studentDeleteSchema.parse(await request.json())
    verifyDeletePassword(password)
    return ok(await deleteStudent((await params).id))
  } catch (error) {
    return errorResponse(error)
  }
}
