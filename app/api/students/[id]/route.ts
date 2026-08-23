import { studentUpdateSchema } from "@/lib/domain/schemas"
import { updateStudent } from "@/lib/server/services"
import { errorResponse, ok } from "@/lib/server/http"
import { requireAuth } from "@/lib/server/auth"
export const runtime = "nodejs"
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    return ok(
      await updateStudent(
        (await params).id,
        studentUpdateSchema.parse(await request.json())
      )
    )
  } catch (error) {
    return errorResponse(error)
  }
}
