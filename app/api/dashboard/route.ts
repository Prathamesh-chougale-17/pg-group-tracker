import { dashboard } from "@/lib/server/services"
import { errorResponse, ok } from "@/lib/server/http"
export const runtime = "nodejs"
export async function GET() {
  try {
    return ok(await dashboard())
  } catch (error) {
    return errorResponse(error)
  }
}
