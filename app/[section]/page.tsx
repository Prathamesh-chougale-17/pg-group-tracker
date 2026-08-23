import { notFound } from "next/navigation"

import { TrackerApp, type TrackerSection } from "@/components/tracker-app"

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

  const student = (await searchParams).student
  return (
    <TrackerApp
      section={section}
      initialStudentId={typeof student === "string" ? student : undefined}
    />
  )
}
