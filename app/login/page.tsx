import { LoginForm } from "@/components/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const next = (await searchParams).next
  return <LoginForm next={typeof next === "string" ? next : "/students"} />
}
