import { listStudents } from "@/lib/server/services"
import { errorResponse, ok } from "@/lib/server/http"
import { requireAuth } from "@/lib/server/auth"
export const runtime = "nodejs"
export async function GET(request: Request) {
  try {
    await requireAuth()
    return ok(
      await listStudents({
        q: new URL(request.url).searchParams.get("q") ?? "",
      })
    )
  } catch (error) {
    return errorResponse(error)
  }
}
