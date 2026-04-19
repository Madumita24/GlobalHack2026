import {
  mockAppointments,
  mockEvents,
  mockLeads,
  mockProperties,
  mockTasks,
  mockTransactions,
} from '@/lib/mock-data'
import { generateRecommendedActions } from '@/lib/scoring'
import type { AppData } from '@/types/app-data'

export function getMockAppData(): AppData {
  return {
    leads: mockLeads,
    properties: mockProperties,
    events: mockEvents,
    transactions: mockTransactions,
    tasks: mockTasks,
    appointments: mockAppointments,
    actions: generateRecommendedActions(mockLeads, mockProperties, mockEvents, mockTransactions),
    source: 'mock',
  }
}
