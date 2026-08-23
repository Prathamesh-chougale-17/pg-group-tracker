import {
  AUTH_COOKIE_NAME,
  sessionToken,
  verifyPassword,
} from "@/lib/server/auth"

export const runtime = "nodejs"

const allowedDestination = (value: unknown) =>
  typeof value === "string" &&
  (value === "/students" ||
    value === "/reconcile" ||
    value.startsWith("/collect/"))
    ? value
    : "/students"

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: unknown; next?: unknown }
  if (typeof body.password !== "string" || !verifyPassword(body.password))
    return Response.json({ error: "Incorrect password" }, { status: 401 })

  const response = Response.json({
    data: { next: allowedDestination(body.next) },
  })
  response.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE_NAME}=${sessionToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  )
  return response
}
