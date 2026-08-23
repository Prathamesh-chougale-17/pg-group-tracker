import { notFound } from "next/navigation"

import { TrackerApp } from "@/components/tracker-app"
import { GROUP_IDS, type GroupId } from "@/lib/domain/types"

function isGroupId(value: string): value is GroupId {
  return GROUP_IDS.some((groupId) => groupId === value)
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  if (!isGroupId(groupId)) notFound()

  return <TrackerApp section="groups" selectedGroupId={groupId} />
}
