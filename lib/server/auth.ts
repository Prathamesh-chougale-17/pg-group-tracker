import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

export const AUTH_COOKIE_NAME = "pg_tracker_session"
const SESSION_PAYLOAD = "pg-group-tracker-admin-v1"

function configuredPassword() {
  const password = process.env.STUDENT_DELETE_PASSWORD
  if (!password) throw new Error("STUDENT_DELETE_PASSWORD is not configured")
  return password
}

function digest(value: string) {
  return createHmac("sha256", configuredPassword()).update(value).digest()
}

export function verifyPassword(password: string) {
  return timingSafeEqual(digest(password), digest(configuredPassword()))
}

export function sessionToken() {
  return digest(SESSION_PAYLOAD).toString("base64url")
}

export async function isAuthenticated() {
  const value = (await cookies()).get(AUTH_COOKIE_NAME)?.value
  if (!value) return false
  const expected = sessionToken()
  const actualBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  )
}

export async function requireAuth() {
  if (!(await isAuthenticated())) throw new Error("UNAUTHORIZED")
}
