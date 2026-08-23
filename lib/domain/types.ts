export const GROUP_IDS = ["D1", "D2", "D3", "D4", "D5", "D6"] as const
export type GroupId = (typeof GROUP_IDS)[number]
export type CurrentGroup = GroupId | "NOT_SURE" | null
export type Gender = "BOY" | "GIRL"

export interface Student {
  _id: string
  name: string
  normalizedName: string
  phone: string
  normalizedPhone: string
  gender: Gender
  currentGroup: CurrentGroup
  projectGroup: string | null
  desktopRequired: boolean | null
  desktopPartner: string | null
  notes: string
  isException: boolean
  source?: {
    candidateNameDocumentId: string
    phoneNumberDocumentId: string
    verifiedAt: Date
  }
  createdAt: Date
  updatedAt: Date
}

export const GROUP_CAPACITIES: Record<
  GroupId,
  { boys: number; girls: number }
> = {
  D1: { boys: 32, girls: 8 },
  D2: { boys: 32, girls: 8 },
  D3: { boys: 30, girls: 8 },
  D4: { boys: 33, girls: 7 },
  D5: { boys: 33, girls: 7 },
  D6: { boys: 33, girls: 7 },
}
