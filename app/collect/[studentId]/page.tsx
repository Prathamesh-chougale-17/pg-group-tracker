import { TrackerApp } from "@/components/tracker-app"
import { isAuthenticated } from "@/lib/server/auth"
import { redirect } from "next/navigation"

export default async function StudentCollectionPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  if (!(await isAuthenticated()))
    redirect(`/login?next=/collect/${encodeURIComponent(studentId)}`)
  return <TrackerApp section="collect" initialStudentId={studentId} />
}
