import { ZodError } from "zod"
export const ok = (data: unknown, init?: ResponseInit) =>
  Response.json({ data }, init)
export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return Response.json(
      { error: error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    )
  if (error instanceof Error && error.message.startsWith("CONFLICT:"))
    return Response.json({ error: error.message.slice(9) }, { status: 409 })
  if (error instanceof Error && error.message === "NOT_FOUND")
    return Response.json({ error: "Record not found" }, { status: 404 })
  if (error instanceof Error && error.message === "UNAUTHORIZED")
    return Response.json({ error: "Authentication required" }, { status: 401 })
  console.error(
    "API request failed",
    error instanceof Error ? error.message : "Unknown error"
  )
  return Response.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 }
  )
}
