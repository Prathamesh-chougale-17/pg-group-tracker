import { reconciliationData } from "@/lib/server/services"
import { errorResponse, ok } from "@/lib/server/http"
import { requireAuth } from "@/lib/server/auth"
export const runtime = "nodejs"
export async function GET() {
  try {
    await requireAuth()
    return ok(await reconciliationData())
  } catch (error) {
    return errorResponse(error)
  }
}
