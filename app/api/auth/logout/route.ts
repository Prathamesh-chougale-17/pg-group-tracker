import { AUTH_COOKIE_NAME } from "@/lib/server/auth"

export async function POST() {
  const response = Response.json({ data: { success: true } })
  response.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  )
  return response
}
