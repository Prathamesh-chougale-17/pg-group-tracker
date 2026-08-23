import { notFound, redirect } from "next/navigation"

import { TrackerApp, type TrackerSection } from "@/components/tracker-app"
import { isAuthenticated } from "@/lib/server/auth"

const sections = ["overview", "students", "groups", "reconcile"] as const

function isTrackerSection(value: string): value is TrackerSection {
  return sections.some((section) => section === value)
}

export function generateStaticParams() {
  return sections.map((section) => ({ section }))
}

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { section } = await params
  if (!isTrackerSection(section)) notFound()
  if (
    (section === "students" || section === "reconcile") &&
    !(await isAuthenticated())
  )
    redirect(`/login?next=/${section}`)

  const student = (await searchParams).student
  return (
    <TrackerApp
      section={section}
      initialStudentId={typeof student === "string" ? student : undefined}
    />
  )
}
