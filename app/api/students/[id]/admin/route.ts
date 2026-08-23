import {
  studentAdminUpdateSchema,
  studentDeleteSchema,
} from "@/lib/domain/schemas"
import { errorResponse, ok } from "@/lib/server/http"
import { adminUpdateStudent, deleteStudent } from "@/lib/server/services"
import { requireAuth, verifyPassword } from "@/lib/server/auth"

export const runtime = "nodejs"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
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
    await requireAuth()
    const { password } = studentDeleteSchema.parse(await request.json())
    if (!verifyPassword(password)) throw new Error("UNAUTHORIZED")
    return ok(await deleteStudent((await params).id))
  } catch (error) {
    return errorResponse(error)
  }
}
