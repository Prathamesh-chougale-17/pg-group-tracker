import { studentCreateSchema } from "@/lib/domain/schemas"
import { createException, listStudents } from "@/lib/server/services"
import { errorResponse, ok } from "@/lib/server/http"
import { requireAuth } from "@/lib/server/auth"
export const runtime = "nodejs"
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    return ok(await listStudents(Object.fromEntries(url.searchParams)))
  } catch (error) {
    return errorResponse(error)
  }
}
export async function POST(request: Request) {
  try {
    await requireAuth()
    return ok(
      await createException(studentCreateSchema.parse(await request.json())),
      { status: 201 }
    )
  } catch (error) {
    return errorResponse(error)
  }
}
