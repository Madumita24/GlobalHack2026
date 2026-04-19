import type { Appointment } from '@/lib/mock-data'
import type { RecommendedAction, Task, Transaction } from '@/types/action'
import type { LeadEvent } from '@/types/event'
import type { Lead } from '@/types/lead'
import type { Property } from '@/types/property'

export type AppData = {
  leads: Lead[]
  properties: Property[]
  events: LeadEvent[]
  transactions: Transaction[]
  tasks: Task[]
  appointments: Appointment[]
  actions: RecommendedAction[]
  source: 'dynamodb' | 'mock' | 'mixed'
}
