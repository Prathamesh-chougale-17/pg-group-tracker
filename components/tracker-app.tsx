"use client"
import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast as toastManager } from "@/components/ui/toast"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
  DatabaseIcon,
  LayoutDashboardIcon,
  MonitorIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"
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
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ThemeToggle } from "@/components/theme-toggle"
import type { CurrentGroup, Gender } from "@/lib/domain/types"

type Student = {
  _id: string
  name: string
  phone: string
  gender: Gender
  visited: boolean
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
  nextStudent: Student | null
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

export function TrackerApp() {
  const [tab, setTab] = useState("collect"),
    [selected, setSelected] = useState<Student | null>(null)
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
              Sunbeam PGCP · field collection
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 md:py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 grid h-auto w-full grid-cols-4 md:w-fit">
            <TabsTrigger value="collect">
              <SearchIcon />
              Collect
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <LayoutDashboardIcon />
              Overview
            </TabsTrigger>
            <TabsTrigger value="students">
              <UsersIcon />
              Students
            </TabsTrigger>
            <TabsTrigger value="reconcile">
              <DatabaseIcon />
              Reconcile
            </TabsTrigger>
          </TabsList>
          <TabsContent value="collect">
            <CollectionMode selected={selected} onSelect={setSelected} />
          </TabsContent>
          <TabsContent value="dashboard">
            <DashboardView />
          </TabsContent>
          <TabsContent value="students">
            <StudentsView
              onCollect={(student) => {
                setSelected(student)
                setTab("collect")
              }}
            />
          </TabsContent>
          <TabsContent value="reconcile">
            <ReconciliationView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function DashboardView() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/api/dashboard"),
  })
  if (query.isLoading) return <LoadingCards />
  if (query.error) return <ErrorAlert error={query.error} />
  const { stats, occupancy } = query.data!,
    progress = stats.total ? (stats.visited / stats.total) * 100 : 0
  const cards = [
    ["Total students", stats.total],
    ["Visited", stats.visited],
    ["Not visited", stats.notVisited],
    ["Assigned", stats.assigned],
    ["Unassigned", stats.unassigned],
    ["Not sure", stats.notSure],
    ["Desktop users", stats.desktopUsers],
    ["Project groups", stats.projectGroups],
    ["Exceptions", stats.exceptions],
  ]
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardDescription>Collection progress</CardDescription>
          <CardTitle>
            {stats.visited}{" "}
            <span className="text-muted-foreground">/ {stats.total}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">
            {progress.toFixed(1)}% of verified students visited
          </p>
        </CardContent>
      </Card>
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
        <OccupancyGrid occupancy={occupancy} />
      </section>
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
    }),
    progress = dashboard.data?.stats.total
      ? (dashboard.data.stats.visited / dashboard.data.stats.total) * 100
      : 0
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-end justify-between">
            <div>
              <CardDescription>Collection progress</CardDescription>
              <CardTitle>
                {dashboard.data
                  ? `${dashboard.data.stats.visited} / ${dashboard.data.stats.total}`
                  : "Loading…"}
              </CardTitle>
            </div>
            <Badge variant="secondary">{progress.toFixed(0)}%</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} />
        </CardContent>
      </Card>
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
                          {student.gender === "BOY" ? "Boy" : "Girl"} ·{" "}
                          {student.phone}
                        </p>
                      </div>
                      {student.visited && (
                        <Badge variant="secondary">Visited</Badge>
                      )}
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
    onSubmit: async ({ value, meta }) =>
      mutation.mutate({
        ...value,
        currentGroup:
          value.groupAnswer === "NO"
            ? null
            : value.groupAnswer === "NOT_SURE"
              ? "NOT_SURE"
              : value.currentGroup,
        markVisited: meta === "visit",
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
      onDone((await api<Dashboard>("/api/dashboard")).nextStudent)
    },
    onError: (error) => toast.error(error.message),
  })
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit("visit")
      }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{student.name}</CardTitle>
              <CardDescription>
                {student.gender === "BOY" ? "Boy" : "Girl"} · {student.phone}
              </CardDescription>
            </div>
            <Badge variant={student.visited ? "secondary" : "outline"}>
              {student.visited ? "Visited" : "Not visited"}
            </Badge>
          </div>
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
                                  {group.boys}/{group.capacity.boys} Boys ·{" "}
                                  {group.girls}/{group.capacity.girls} Girls
                                </span>
                                <span className="mt-2 block text-xs">
                                  {group.remaining.boys} Boys ·{" "}
                                  {group.remaining.girls} Girls remaining
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
                    label={
                      field.state.value.length
                        ? `${field.state.value.length} partner selected`
                        : "Select a project partner"
                    }
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
                            label={
                              field.state.value
                                ? "Partner selected"
                                : "Select desktop partner"
                            }
                            onSelect={(id) => field.handleChange(id)}
                          />
                          <Alert>
                            <MonitorIcon />
                            <AlertTitle>Desktop users → D6</AlertTitle>
                            <AlertDescription>
                              The requirement is recorded independently from the
                              reported current group.
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
            {mutation.isPending ? "Saving…" : "Save & mark visited"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => form.handleSubmit("save")}
          >
            Save without marking visited
          </Button>
          <Button type="button" variant="ghost" onClick={onBack}>
            Choose another student
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function OccupancyGrid({ occupancy }: { occupancy: Occupancy[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {occupancy.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{group.id}</CardTitle>
              <Badge
                variant={group.remaining.total <= 0 ? "destructive" : "outline"}
              >
                {group.total}/{group.capacity.total}
              </Badge>
            </div>
            <CardDescription>
              {group.boys}/{group.capacity.boys} Boys · {group.girls}/
              {group.capacity.girls} Girls
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Progress
              value={Math.max(0, (group.total / group.capacity.total) * 100)}
            />
            <p className="text-sm">
              Remaining: {group.remaining.boys} boys · {group.remaining.girls}{" "}
              girls · {group.remaining.total} total
            </p>
            {group.id === "D6" && (
              <Badge variant="secondary">
                <MonitorIcon />
                Desktop group
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StudentsView({ onCollect }: { onCollect: (s: Student) => void }) {
  const [filter, setFilter] = useState("all")
  const query = useQuery({
    queryKey: ["students", filter],
    queryFn: () =>
      api<Student[]>(
        `/api/students${filter === "unvisited" ? "?visited=false" : filter === "unassigned" ? "?group=UNASSIGNED" : filter === "exceptions" ? "?exception=true" : ""}`
      ),
  })
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          value={[filter]}
          onValueChange={(v) => setFilter(v[0] ?? "all")}
          variant="outline"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="unvisited">Unvisited</ToggleGroupItem>
          <ToggleGroupItem value="unassigned">Unassigned</ToggleGroupItem>
          <ToggleGroupItem value="exceptions">Exceptions</ToggleGroupItem>
        </ToggleGroup>
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {query.data.map((student) => (
            <Card key={student._id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{student.name}</CardTitle>
                    <CardDescription>
                      {student.gender === "BOY" ? "Boy" : "Girl"} ·{" "}
                      {student.phone}
                    </CardDescription>
                  </div>
                  {student.isException && (
                    <Badge variant="secondary">Exception</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Badge variant={student.visited ? "secondary" : "outline"}>
                  {student.visited ? "Visited" : "Not visited"}
                </Badge>
                <Badge variant="outline">
                  {student.currentGroup ?? "Unassigned"}
                </Badge>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => onCollect(student)}>
                  Open collection
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
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
                    <ToggleGroupItem value="BOY">Boy</ToggleGroupItem>
                    <ToggleGroupItem value="GIRL">Girl</ToggleGroupItem>
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
                <ToggleGroupItem value="BOY">Boy</ToggleGroupItem>
                <ToggleGroupItem value="GIRL">Girl</ToggleGroupItem>
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
              {form.state.values.gender === "BOY" ? "Boy" : "Girl"}. References
              to both raw IDs are retained.
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
  label,
  onSelect,
}: {
  excludeId: string
  label: string
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
