import { reconciliationMatchSchema } from "@/lib/domain/schemas"
import { confirmMatch } from "@/lib/server/services"
import { errorResponse, ok } from "@/lib/server/http"
import { requireAuth } from "@/lib/server/auth"
export const runtime = "nodejs"
export async function POST(request: Request) {
  try {
    await requireAuth()
    return ok(
      await confirmMatch(reconciliationMatchSchema.parse(await request.json())),
      { status: 201 }
    )
  } catch (error) {
    return errorResponse(error)
  }
}
