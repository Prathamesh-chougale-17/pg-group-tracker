import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { WifiOffIcon } from "lucide-react"

export default function OfflinePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/20 p-6">
      <Empty className="max-w-md rounded-xl border bg-background">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WifiOffIcon />
          </EmptyMedia>
          <EmptyTitle>You are offline</EmptyTitle>
          <EmptyDescription>
            Reconnect to load current student and group information. Database
            changes are never stored from an offline copy.
          </EmptyDescription>
        </EmptyHeader>
        <Button render={<Link href="/overview" />}>Try again</Button>
      </Empty>
    </main>
  )
}
