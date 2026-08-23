import { TrackerApp } from "@/components/tracker-app"

export default async function StudentCollectionPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  return <TrackerApp section="collect" initialStudentId={studentId} />
}
