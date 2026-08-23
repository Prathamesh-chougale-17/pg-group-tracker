import { errorResponse, ok } from "@/lib/server/http"
import { studentsDb } from "@/lib/server/services"
import { requireAuth } from "@/lib/server/auth"
export const runtime = "nodejs"
export async function GET() {
  try {
    await requireAuth()
    return ok(
      await (
        await studentsDb()
      )
        .collection("projectGroups")
        .find({})
        .sort({ updatedAt: -1 })
        .toArray()
    )
  } catch (error) {
    return errorResponse(error)
  }
}
