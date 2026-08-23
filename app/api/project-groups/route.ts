import { errorResponse, ok } from "@/lib/server/http"
import { studentsDb } from "@/lib/server/services"
export const runtime = "nodejs"
export async function GET() {
  try {
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
