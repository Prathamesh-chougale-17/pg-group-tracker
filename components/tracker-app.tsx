"use client"
import { useDeferredValue, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast as toastManager } from "@/components/ui/toast"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
  DatabaseIcon,
  LayoutDashboardIcon,
  MonitorIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  TablePropertiesIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  GROUP_IDS,
  type CurrentGroup,
  type Gender,
  type GroupId,
} from "@/lib/domain/types"
import { cn } from "@/lib/utils"

type Student = {
  _id: string
  name: string
  phone: string
  gender: Gender
  currentGroup: CurrentGroup
  projectGroup: string | null
  desktopRequired: boolean | null
  desktopPartner: string | null
  notes: string
  isException: boolean
  updatedAt: string
}
type Occupancy = {
  id: string
  boys: number
  girls: number
  total: number
  capacity: { boys: number; girls: number; total: number }
  remaining: { boys: number; girls: number; total: number }
}
type Dashboard = {
  stats: Record<string, number>
  occupancy: Occupancy[]
}
const toast = {
  success: (title: string) => toastManager.add({ title, type: "success" }),
  error: (title: string) => toastManager.add({ title, type: "error" }),
}
const api = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || "Request failed")
  return body.data
}
const invalidateAll = (client: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    client.invalidateQueries({ queryKey: ["dashboard"] }),
    client.invalidateQueries({ queryKey: ["students"] }),
    client.invalidateQueries({ queryKey: ["reconciliation"] }),
  ])

export type TrackerSection =
  "collect" | "overview" | "students" | "groups" | "reconcile"

const navigation = [
  { section: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { section: "students", label: "Students", icon: UsersIcon },
  { section: "groups", label: "Groups", icon: TablePropertiesIcon },
  { section: "reconcile", label: "Reconcile", icon: DatabaseIcon },
] satisfies {
  section: TrackerSection
  label: string
  icon: typeof SearchIcon
}[]

export function TrackerApp({
  section,
  initialStudentId,
  selectedGroupId,
}: {
  section: TrackerSection
  initialStudentId?: string
  selectedGroupId?: GroupId
}) {
  const router = useRouter()
  const [localSelected, setLocalSelected] = useState<Student | null>(null)
  const selectedStudentQuery = useQuery({
    queryKey: ["students", "selected", initialStudentId],
    queryFn: () => api<Student[]>("/api/students"),
    enabled: Boolean(initialStudentId) && !localSelected,
  })
  const selected =
    localSelected ??
    selectedStudentQuery.data?.find(
      (student) => student._id === initialStudentId
    ) ??
    null
  return (
    <div className="min-h-svh bg-muted/20">
      <header className="sticky top-0 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <SparklesIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">PG Group Tracker</p>
            <p className="text-xs text-muted-foreground">
              Sunbeam PGCP · group assignment
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 md:py-8">
        <nav
          aria-label="Tracker sections"
          className="mb-6 grid h-auto w-full grid-cols-4 rounded-lg bg-muted p-[3px] md:w-fit"
        >
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.section}
                href={`/${item.section}`}
                aria-current={section === item.section ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
                  section === item.section &&
                    "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        {section === "collect" && (
          <CollectionMode
            selected={selected}
            onSelect={(student) => {
              setLocalSelected(student)
              router.push(
                student
                  ? `/collect/${encodeURIComponent(student._id)}`
                  : "/collect"
              )
            }}
          />
        )}
        {section === "overview" && <DashboardView />}
        {section === "students" && (
          <StudentsView
            onCollect={(student) => {
              setLocalSelected(student)
              router.push(`/collect/${encodeURIComponent(student._id)}`)
            }}
          />
        )}
        {section === "groups" && (
          <GroupsView selectedGroupId={selectedGroupId} />
        )}
        {section === "reconcile" && <ReconciliationView />}
      </main>
    </div>
  )
}

function GroupsView({ selectedGroupId }: { selectedGroupId?: GroupId }) {
  const query = useQuery({
    queryKey: ["students", "groups"],
    queryFn: () => api<Student[]>("/api/students"),
  })

  if (query.isLoading) return <LoadingCards />
  if (query.error) return <ErrorAlert error={query.error} />

  const students = query.data ?? []
  if (selectedGroupId) {
    const members = students.filter(
        (student) => student.currentGroup === selectedGroupId
      ),
      males = members.filter((student) => student.gender === "BOY").length,
      females = members.length - males

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href="/groups"
              className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← All groups
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              {selectedGroupId}
            </h1>
            <p className="text-sm text-muted-foreground">
              {members.length} students · {males} males · {females} females
            </p>
          </div>
          <Badge variant="secondary">{members.length} total</Badge>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{selectedGroupId} students</CardTitle>
            <CardDescription>
              Current students assigned to this group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupStudentsTable groupId={selectedGroupId} members={members} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Groups</h1>
        <p className="text-sm text-muted-foreground">
          Students currently assigned to D1 through D6.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GROUP_IDS.map((groupId) => {
          const members = students.filter(
              (student) => student.currentGroup === groupId
            ),
            males = members.filter(
              (student) => student.gender === "BOY"
            ).length,
            females = members.length - males

          return (
            <Link key={groupId} href={`/groups/${groupId}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{groupId}</CardTitle>
                  <CardDescription>
                    {members.length} students · {males} males · {females}{" "}
                    females
                  </CardDescription>
                </CardHeader>
                <CardFooter className="justify-between">
                  <Badge variant="secondary">{members.length} total</Badge>
                  <span className="inline-flex items-center gap-1 text-sm font-medium">
                    View students
                    <ArrowRightIcon />
                  </span>
                </CardFooter>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function GroupStudentsTable({
  groupId,
  members,
}: {
  groupId: GroupId
  members: Student[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Gender</TableHead>
          <TableHead>Desktop</TableHead>
          <TableHead>Project group</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.length ? (
          members.map((student) => (
            <TableRow key={student._id}>
              <TableCell className="font-medium">
                <Link href={`/collect/${student._id}`}>{student.name}</Link>
              </TableCell>
              <TableCell>{student.phone}</TableCell>
              <TableCell>
                {student.gender === "BOY" ? "Male" : "Female"}
              </TableCell>
              <TableCell>
                {student.desktopRequired === null
                  ? "Not decided"
                  : student.desktopRequired
                    ? "Yes"
                    : "No"}
              </TableCell>
              <TableCell>{student.projectGroup ?? "—"}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={5}
              className="h-20 text-center text-muted-foreground"
            >
              No students assigned to {groupId}.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

function DashboardView() {
  const [selectedGroupId, setSelectedGroupId] = useState<GroupId | null>(null)
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/api/dashboard"),
  })
  const studentsQuery = useQuery({
    queryKey: ["students", "overview-groups"],
    queryFn: () => api<Student[]>("/api/students"),
  })
  if (query.isLoading || studentsQuery.isLoading) return <LoadingCards />
  if (query.error) return <ErrorAlert error={query.error} />
  if (studentsQuery.error) return <ErrorAlert error={studentsQuery.error} />
  const { stats, occupancy } = query.data!,
    selectedMembers = selectedGroupId
      ? (studentsQuery.data ?? []).filter(
          (student) => student.currentGroup === selectedGroupId
        )
      : []
  const cards = [
    ["Total students", stats.total],
    ["Assigned", stats.assigned],
    ["Unassigned", stats.unassigned],
    ["Not sure", stats.notSure],
    ["Desktop users", stats.desktopUsers],
    ["Project groups", stats.projectGroups],
    ["Exceptions", stats.exceptions],
  ]
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="gap-1">
              <CardDescription>{label}</CardDescription>
              <CardTitle>{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Live group occupancy</h2>
        <OccupancyGrid
          occupancy={occupancy}
          selectedGroupId={selectedGroupId}
          onSelect={setSelectedGroupId}
        />
      </section>
      {selectedGroupId && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedGroupId} students</CardTitle>
            <CardDescription>
              {selectedMembers.length} students currently assigned to this
              group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupStudentsTable
              groupId={selectedGroupId}
              members={selectedMembers}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CollectionMode({
  selected,
  onSelect,
}: {
  selected: Student | null
  onSelect: (s: Student | null) => void
}) {
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/api/dashboard"),
  })
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      {!selected ? (
        <StudentSearch onSelect={onSelect} />
      ) : (
        <CollectionForm
          student={selected}
          occupancy={dashboard.data?.occupancy ?? []}
          onDone={onSelect}
          onBack={() => onSelect(null)}
        />
      )}
    </div>
  )
}

function StudentSearch({ onSelect }: { onSelect: (s: Student) => void }) {
  const [query, setQuery] = useState("")
  const students = useQuery({
    queryKey: ["students", query],
    queryFn: () =>
      api<Student[]>(`/api/students/search?q=${encodeURIComponent(query)}`),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Find a verified student</CardTitle>
        <CardDescription>
          Search by name or phone. Raw unmatched records never appear here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            placeholder="Search name or phone…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {students.isLoading ? (
              <div className="flex flex-col gap-2 p-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-3">
                    <span>No verified student found.</span>
                    <ExceptionDialog />
                  </div>
                </CommandEmpty>
                <CommandGroup heading="Verified students">
                  {students.data?.slice(0, 30).map((student) => (
                    <CommandItem
                      key={student._id}
                      value={student._id}
                      onSelect={() => onSelect(student)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.gender === "BOY" ? "Male" : "Female"} ·{" "}
                          {student.phone}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CardContent>
      <CardFooter>
        <ExceptionDialog />
      </CardFooter>
    </Card>
  )
}

function CollectionForm({
  student,
  occupancy,
  onDone,
  onBack,
}: {
  student: Student
  occupancy: Occupancy[]
  onDone: (next: Student | null) => void
  onBack: () => void
}) {
  const client = useQueryClient()
  const form = useForm({
    defaultValues: {
      currentGroup: student.currentGroup as CurrentGroup,
      groupAnswer:
        student.currentGroup === "NOT_SURE"
          ? "NOT_SURE"
          : student.currentGroup
            ? "YES"
            : "NO",
      projectPartnerIds: [] as string[],
      desktopRequired: student.desktopRequired,
      desktopPartnerId: student.desktopPartner,
      notes: student.notes,
    },
    onSubmit: async ({ value }) =>
      mutation.mutate({
        ...value,
        currentGroup:
          value.groupAnswer === "NO"
            ? null
            : value.groupAnswer === "NOT_SURE"
              ? "NOT_SURE"
              : value.currentGroup,
        expectedUpdatedAt: student.updatedAt,
      }),
  })
  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api<Student>(`/api/students/${student._id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await invalidateAll(client)
      toast.success(`${student.name} updated successfully.`)
      onDone(null)
    },
    onError: (error) => toast.error(error.message),
  })
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{student.name}</CardTitle>
          <CardDescription>
            {student.gender === "BOY" ? "Male" : "Female"} · {student.phone}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Have you already joined a group?</FieldLegend>
              <form.Field name="groupAnswer">
                {(field) => (
                  <ToggleGroup
                    value={[field.state.value]}
                    onValueChange={(value) =>
                      field.handleChange(value[0] ?? "NO")
                    }
                    variant="outline"
                    className="grid w-full grid-cols-3"
                  >
                    <ToggleGroupItem value="YES">Yes</ToggleGroupItem>
                    <ToggleGroupItem value="NO">No group yet</ToggleGroupItem>
                    <ToggleGroupItem value="NOT_SURE">Not sure</ToggleGroupItem>
                  </ToggleGroup>
                )}
              </form.Field>
              <form.Subscribe selector={(state) => state.values.groupAnswer}>
                {(answer) =>
                  answer === "YES" && (
                    <form.Field name="currentGroup">
                      {(field) => (
                        <Field>
                          <FieldLabel>Select reported group</FieldLabel>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {occupancy.map((group) => (
                              <button
                                type="button"
                                key={group.id}
                                data-selected={field.state.value === group.id}
                                onClick={() =>
                                  field.handleChange(group.id as CurrentGroup)
                                }
                                className="group-card text-left"
                              >
                                <span className="flex items-center justify-between font-semibold">
                                  <span>{group.id}</span>
                                  <span>
                                    {group.total}/{group.capacity.total}
                                  </span>
                                </span>
                                <span className="mt-1 block text-sm text-muted-foreground">
                                  {group.boys}/{group.capacity.boys} Males ·{" "}
                                  {group.girls}/{group.capacity.girls} Females
                                </span>
                                <span className="mt-2 block text-xs">
                                  {group.remaining.boys} Males ·{" "}
                                  {group.remaining.girls} Females remaining
                                </span>
                                {group.id === "D6" && (
                                  <Badge className="mt-2" variant="secondary">
                                    <MonitorIcon />
                                    Desktop users → D6
                                  </Badge>
                                )}
                              </button>
                            ))}
                          </div>
                        </Field>
                      )}
                    </form.Field>
                  )
                }
              </form.Subscribe>
            </FieldSet>
            <FieldSet>
              <FieldLegend>Project partners</FieldLegend>
              <form.Field name="projectPartnerIds">
                {(field) => (
                  <StudentPartnerPicker
                    excludeId={student._id}
                    placeholder="Select project partners"
                    selectedIds={field.state.value}
                    onSelect={(id) =>
                      field.handleChange([
                        ...new Set([...field.state.value, id]),
                      ])
                    }
                  />
                )}
              </form.Field>
            </FieldSet>
            <FieldSet>
              <FieldLegend>Do you want to use a desktop?</FieldLegend>
              <form.Field name="desktopRequired">
                {(field) => (
                  <ToggleGroup
                    value={[
                      field.state.value === null
                        ? "UNDECIDED"
                        : field.state.value
                          ? "YES"
                          : "NO",
                    ]}
                    onValueChange={(value) => {
                      const required =
                        value[0] === "YES"
                          ? true
                          : value[0] === "NO"
                            ? false
                            : null

                      field.handleChange(required)
                      if (required) {
                        form.setFieldValue("groupAnswer", "YES")
                        form.setFieldValue("currentGroup", "D6")
                      } else {
                        form.setFieldValue("desktopPartnerId", null)
                      }
                    }}
                    variant="outline"
                  >
                    <ToggleGroupItem value="YES">Yes</ToggleGroupItem>
                    <ToggleGroupItem value="NO">No</ToggleGroupItem>
                    <ToggleGroupItem value="UNDECIDED">
                      Not decided
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              </form.Field>
              <form.Subscribe
                selector={(state) => state.values.desktopRequired}
              >
                {(required) =>
                  required && (
                    <form.Field name="desktopPartnerId">
                      {(field) => (
                        <Field>
                          <FieldLabel>Desktop partner</FieldLabel>
                          <StudentPartnerPicker
                            excludeId={student._id}
                            placeholder="Select desktop partner"
                            selectedIds={
                              field.state.value ? [field.state.value] : []
                            }
                            onSelect={(id) => field.handleChange(id)}
                          />
                          <Alert>
                            <MonitorIcon />
                            <AlertTitle>Desktop users → D6</AlertTitle>
                            <AlertDescription>
                              This student has been assigned to D6. Select the
                              desktop partner they will share with.
                            </AlertDescription>
                          </Alert>
                        </Field>
                      )}
                    </form.Field>
                  )
                }
              </form.Subscribe>
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <form.Field name="notes">
                {(field) => (
                  <Textarea
                    id="notes"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Only information relevant to group formation"
                  />
                )}
              </form.Field>
            </Field>
            <Alert>
              <MonitorIcon />
              <AlertTitle>Desktop requirement</AlertTitle>
              <AlertDescription>
                Desktop users should be placed in D6. Partner relationships
                remain ID-based.
              </AlertDescription>
            </Alert>
          </FieldGroup>
        </CardContent>
        <CardFooter className="sticky-actions">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save student"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button type="button" variant="ghost" onClick={onBack}>
            Choose another student
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function OccupancyGrid({
  occupancy,
  selectedGroupId,
  onSelect,
}: {
  occupancy: Occupancy[]
  selectedGroupId?: GroupId | null
  onSelect?: (groupId: GroupId) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {occupancy.map((group) => (
        <button
          key={group.id}
          type="button"
          className="text-left"
          aria-pressed={selectedGroupId === group.id}
          onClick={() => onSelect?.(group.id as GroupId)}
        >
          <Card
            className={cn(
              "h-full transition-colors hover:bg-muted/50",
              selectedGroupId === group.id && "border-primary bg-muted/50"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{group.id}</CardTitle>
                <Badge
                  variant={
                    group.remaining.total <= 0 ? "destructive" : "outline"
                  }
                >
                  {group.total}/{group.capacity.total}
                </Badge>
              </div>
              <CardDescription>
                {group.boys}/{group.capacity.boys} Males · {group.girls}/
                {group.capacity.girls} Females
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Progress
                value={Math.max(0, (group.total / group.capacity.total) * 100)}
              />
              <p className="text-sm">
                Remaining: {group.remaining.boys} males ·{" "}
                {group.remaining.girls} females · {group.remaining.total} total
              </p>
              {group.id === "D6" && (
                <Badge variant="secondary">
                  <MonitorIcon />
                  Desktop group
                </Badge>
              )}
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  )
}

function StudentsView({ onCollect }: { onCollect: (s: Student) => void }) {
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search.trim())
  const query = useQuery({
    queryKey: ["students", filter, deferredSearch],
    queryFn: () => {
      const params = new URLSearchParams()
      if (deferredSearch) params.set("q", deferredSearch)
      if (filter === "unassigned") params.set("group", "UNASSIGNED")
      if (filter === "exceptions") params.set("exception", "true")
      const queryString = params.toString()
      return api<Student[]>(
        `/api/students${queryString ? `?${queryString}` : ""}`
      )
    },
  })
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <InputGroup className="min-w-60 flex-1 sm:max-w-sm">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search students by name or phone"
              placeholder="Search name or phone…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
          <ToggleGroup
            value={[filter]}
            onValueChange={(v) => setFilter(v[0] ?? "all")}
            variant="outline"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="unassigned">Unassigned</ToggleGroupItem>
            <ToggleGroupItem value="exceptions">Exceptions</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <ExceptionDialog />
      </div>
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorAlert error={query.error} />
      ) : !query.data?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No students in this view</EmptyTitle>
            <EmptyDescription>
              Try another filter or add a verified exception student.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>
              {query.data.length} students in this view
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Record type</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>{student.phone}</TableCell>
                    <TableCell>
                      {student.gender === "BOY" ? "Male" : "Female"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {student.currentGroup ?? "Unassigned"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {student.isException ? (
                        <Badge variant="secondary">Exception</Badge>
                      ) : (
                        "Verified"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCollect(student)}
                        >
                          Manage details
                        </Button>
                        <EditStudentDialog student={student} />
                        <DeleteStudentDialog student={student} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EditStudentDialog({ student }: { student: Student }) {
  const [open, setOpen] = useState(false)
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api<Student>(`/api/students/${student._id}/admin`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await invalidateAll(client)
      toast.success(`${student.name} updated`)
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })
  const form = useForm({
    defaultValues: {
      name: student.name,
      gender: student.gender,
      currentGroup: student.currentGroup,
      desktopRequired: student.desktopRequired,
      notes: student.notes,
      expectedUpdatedAt: student.updatedAt,
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>
            Update identity and group details for {student.name}.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const phone = new FormData(event.currentTarget).get("phone")
            mutation.mutate({
              ...form.state.values,
              phone: typeof phone === "string" ? phone : student.phone,
            })
          }}
        >
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="name">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={`edit-name-${student._id}`}>
                      Name
                    </FieldLabel>
                    <Input
                      id={`edit-name-${student._id}`}
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  </Field>
                )}
              </form.Field>
              <Field>
                <FieldLabel htmlFor={`edit-phone-${student._id}`}>
                  Phone
                </FieldLabel>
                <Input
                  id={`edit-phone-${student._id}`}
                  name="phone"
                  inputMode="tel"
                  autoComplete="off"
                  defaultValue={student.phone}
                />
              </Field>
            </div>
            <form.Field name="gender">
              {(field) => (
                <FieldSet>
                  <FieldLegend>Gender</FieldLegend>
                  <ToggleGroup
                    value={[field.state.value]}
                    onValueChange={(value) =>
                      field.handleChange((value[0] ?? "BOY") as Gender)
                    }
                    variant="outline"
                  >
                    <ToggleGroupItem value="BOY">Male</ToggleGroupItem>
                    <ToggleGroupItem value="GIRL">Female</ToggleGroupItem>
                  </ToggleGroup>
                </FieldSet>
              )}
            </form.Field>
            <form.Field name="currentGroup">
              {(field) => (
                <Field>
                  <FieldLabel>Current group</FieldLabel>
                  <Select
                    value={field.state.value ?? "UNASSIGNED"}
                    onValueChange={(value) =>
                      field.handleChange(
                        value === "UNASSIGNED" ? null : (value as CurrentGroup)
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                        <SelectItem value="NOT_SURE">Not sure</SelectItem>
                        {GROUP_IDS.map((groupId) => (
                          <SelectItem key={groupId} value={groupId}>
                            {groupId}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="desktopRequired">
              {(field) => (
                <FieldSet>
                  <FieldLegend>Desktop requirement</FieldLegend>
                  <ToggleGroup
                    value={[
                      field.state.value === null
                        ? "UNDECIDED"
                        : field.state.value
                          ? "YES"
                          : "NO",
                    ]}
                    onValueChange={(value) =>
                      field.handleChange(
                        value[0] === "YES"
                          ? true
                          : value[0] === "NO"
                            ? false
                            : null
                      )
                    }
                    variant="outline"
                  >
                    <ToggleGroupItem value="YES">Yes</ToggleGroupItem>
                    <ToggleGroupItem value="NO">No</ToggleGroupItem>
                    <ToggleGroupItem value="UNDECIDED">
                      Not decided
                    </ToggleGroupItem>
                  </ToggleGroup>
                </FieldSet>
              )}
            </form.Field>
            <form.Field name="notes">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={`edit-notes-${student._id}`}>
                    Notes
                  </FieldLabel>
                  <Textarea
                    id={`edit-notes-${student._id}`}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteStudentDialog({ student }: { student: Student }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      api<{ id: string }>(`/api/students/${student._id}/admin`, {
        method: "DELETE",
        body: JSON.stringify({ password }),
      }),
    onSuccess: async () => {
      await invalidateAll(client)
      toast.success(`${student.name} deleted`)
      setPassword("")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button size="sm" variant="destructive">
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {student.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the verified record and its relationships. Its raw name
            and phone will become available in Reconcile again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor={`delete-password-${student._id}`}>
            Delete password
          </FieldLabel>
          <Input
            id={`delete-password-${student._id}`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && password && !mutation.isPending)
                mutation.mutate()
            }}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!password || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Deleting…" : "Delete record"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ExceptionDialog() {
  const [open, setOpen] = useState(false),
    client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api<Student>("/api/students", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await invalidateAll(client)
      toast.success("Exception student created")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })
  const form = useForm({
    defaultValues: {
      name: "",
      phone: "",
      gender: "BOY" as Gender,
      notes: "",
      acknowledgeSimilarName: false,
    },
    onSubmit: ({ value }) => mutation.mutate(value),
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <PlusIcon data-icon="inline-start" />
            Student not registered
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add exception student</DialogTitle>
          <DialogDescription>
            Use only when genuinely absent. Phone and similar-name checks run
            before creation.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              validators={{
                onBlur: ({ value }) =>
                  value.trim().length < 2 ? "Enter the full name" : undefined,
              }}
            >
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="exception-name">Name</FieldLabel>
                  <Input
                    id="exception-name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={!field.state.meta.isValid}
                  />
                  <FieldError
                    errors={field.state.meta.errors.map((message) => ({
                      message,
                    }))}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="phone">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="exception-phone">Phone</FieldLabel>
                  <Input
                    id="exception-phone"
                    inputMode="tel"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="gender">
              {(field) => (
                <FieldSet>
                  <FieldLegend>Gender</FieldLegend>
                  <ToggleGroup
                    value={[field.state.value]}
                    onValueChange={(v) =>
                      field.handleChange((v[0] ?? "BOY") as Gender)
                    }
                    variant="outline"
                  >
                    <ToggleGroupItem value="BOY">Male</ToggleGroupItem>
                    <ToggleGroupItem value="GIRL">Female</ToggleGroupItem>
                  </ToggleGroup>
                </FieldSet>
              )}
            </form.Field>
            <form.Field name="notes">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="exception-notes">Notes</FieldLabel>
                  <Textarea
                    id="exception-notes"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Checking…" : "Check & create"}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type RawName = { _id: string; name: string }
type RawPhone = { _id: string; phoneNumber: string }
type Recon = {
  names: RawName[]
  phones: RawPhone[]
  unmatchedNames: RawName[]
  unmatchedPhones: RawPhone[]
  invalid: unknown[]
  suspiciousNames: RawName[]
  suspiciousPhones: RawPhone[]
  matched: number
  session: { _id: string } | null
}
function ReconciliationView() {
  const query = useQuery({
    queryKey: ["reconciliation"],
    queryFn: () => api<Recon>("/api/reconciliation"),
  })
  if (query.isLoading) return <LoadingCards />
  if (query.error) return <ErrorAlert error={query.error} />
  const data = query.data!
  return (
    <div className="flex flex-col gap-5">
      <Alert>
        <AlertTriangleIcon />
        <AlertTitle>Raw source data is immutable and unlinked</AlertTitle>
        <AlertDescription>
          Names and phones are never paired by sourceIndex, order, or document
          suffix. Every identity requires a human-selected name, phone, and
          gender.
        </AlertDescription>
      </Alert>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Names", data.names.length],
          ["Phones", data.phones.length],
          ["Matched", data.matched],
          ["Unmatched names", data.unmatchedNames.length],
          ["Unmatched phones", data.unmatchedPhones.length],
        ].map(([label, count]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle>{count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reconcile identity</CardTitle>
          <CardDescription>
            Select both raw records and explicitly confirm the identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatchForm data={data} />
        </CardContent>
      </Card>
    </div>
  )
}
function MatchForm({ data }: { data: Recon }) {
  const client = useQueryClient()
  const [selectedNameId, setSelectedNameId] = useState("")
  const [selectedPhoneId, setSelectedPhoneId] = useState("")
  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api("/api/reconciliation/matches", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await invalidateAll(client)
      toast.success("Verified student created")
    },
    onError: (e) => toast.error(e.message),
  })
  const form = useForm({
    defaultValues: {
      candidateNameDocumentId: "",
      phoneNumberDocumentId: "",
      gender: "BOY" as Gender,
    },
    onSubmit: ({ value }) =>
      mutation.mutate({
        ...value,
        sessionId: data.session?._id ?? crypto.randomUUID(),
        confirmed: true,
      }),
  })
  const name = data.unmatchedNames.find((n) => n._id === selectedNameId),
    phone = data.unmatchedPhones.find((p) => p._id === selectedPhoneId)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="candidateNameDocumentId">
          {(field) => (
            <Field>
              <FieldLabel>Candidate name</FieldLabel>
              <RawPicker
                label={name?.name ?? "Select candidate name"}
                items={data.unmatchedNames.map((n) => ({
                  id: n._id,
                  label: n.name,
                }))}
                onSelect={(id) => {
                  field.handleChange(id)
                  setSelectedNameId(id)
                }}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="phoneNumberDocumentId">
          {(field) => (
            <Field>
              <FieldLabel>Phone number</FieldLabel>
              <RawPicker
                label={phone?.phoneNumber ?? "Select phone number"}
                items={data.unmatchedPhones.map((p) => ({
                  id: p._id,
                  label: p.phoneNumber,
                }))}
                onSelect={(id) => {
                  field.handleChange(id)
                  setSelectedPhoneId(id)
                }}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="gender">
          {(field) => (
            <FieldSet>
              <FieldLegend>Verified gender</FieldLegend>
              <ToggleGroup
                value={[field.state.value]}
                onValueChange={(v) =>
                  field.handleChange((v[0] ?? "BOY") as Gender)
                }
                variant="outline"
              >
                <ToggleGroupItem value="BOY">Male</ToggleGroupItem>
                <ToggleGroupItem value="GIRL">Female</ToggleGroupItem>
              </ToggleGroup>
            </FieldSet>
          )}
        </form.Field>
        {name && phone && (
          <Alert>
            <CheckIcon />
            <AlertTitle>Confirmation preview</AlertTitle>
            <AlertDescription>
              {name.name} · {phone.phoneNumber} ·{" "}
              {form.state.values.gender === "BOY" ? "Male" : "Female"}.
              References to both raw IDs are retained.
            </AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={!name || !phone || mutation.isPending}>
          {mutation.isPending ? "Confirming…" : "Confirm verified match"}
        </Button>
      </FieldGroup>
    </form>
  )
}
function RawPicker({
  label,
  items,
  onSelect,
}: {
  label: string
  items: { id: string; label: string }[]
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const filteredItems = items.filter((item) =>
    `${item.label} ${item.id}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full justify-start"
        onClick={() => setOpen(true)}
      >
        <SearchIcon data-icon="inline-start" />
        {label}
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Select raw record"
        description="Search and select one unmatched source record."
        showCloseButton
      >
        <div className="flex flex-col gap-2 p-2">
          <Input
            autoFocus
            aria-label="Search raw list"
            placeholder="Search raw list…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  className="min-h-11 justify-start"
                  onClick={() => {
                    onSelect(item.id)
                    setSearch("")
                    setOpen(false)
                  }}
                >
                  {item.label}
                </Button>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No unmatched record found.
              </p>
            )}
          </div>
        </div>
      </CommandDialog>
    </>
  )
}

function StudentPartnerPicker({
  excludeId,
  placeholder,
  selectedIds,
  onSelect,
}: {
  excludeId: string
  placeholder: string
  selectedIds: string[]
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const students = useQuery({
    queryKey: ["students", "partner-picker"],
    queryFn: () => api<Student[]>("/api/students"),
  })
  const filteredStudents = students.data?.filter(
    (student) =>
      student._id !== excludeId &&
      `${student.name} ${student.phone}`
        .toLowerCase()
        .includes(search.toLowerCase())
  )
  const selectedStudents = selectedIds
    .map((id) => students.data?.find((student) => student._id === id))
    .filter((student): student is Student => Boolean(student))
  const selectedNames = selectedStudents.map((student) => student.name)
  const label = selectedNames.length
    ? selectedNames.join(", ")
    : selectedIds.length
      ? `${selectedIds.length} selected`
      : placeholder
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full justify-start"
        onClick={() => setOpen(true)}
      >
        <SearchIcon data-icon="inline-start" />
        <span className="truncate" title={selectedNames.join(", ")}>
          {label}
        </span>
      </Button>
      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedStudents.map((student) => (
            <Badge key={student._id} variant="secondary">
              {student.name}
            </Badge>
          ))}
        </div>
      )}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Select verified student"
        description="Search and select an existing verified student."
        showCloseButton
      >
        <div className="flex flex-col gap-2 p-2">
          <Input
            autoFocus
            aria-label="Search verified students"
            placeholder="Search verified students…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {filteredStudents?.length ? (
              filteredStudents.map((student) => (
                <Button
                  key={student._id}
                  type="button"
                  variant="ghost"
                  className="min-h-11 justify-start"
                  onClick={() => {
                    onSelect(student._id)
                    setSearch("")
                    setOpen(false)
                  }}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{student.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {student.phone}
                    </span>
                  </span>
                </Button>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No verified student found.
              </p>
            )}
          </div>
        </div>
      </CommandDialog>
    </>
  )
}
function LoadingCards() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}
function ErrorAlert({ error }: { error: Error }) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Could not load data</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
}
