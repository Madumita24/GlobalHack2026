export type AssistantIntent =
  | 'navigate_dashboard'
  | 'navigate_leads'
  | 'navigate_listings'
  | 'navigate_transactions'
  | 'navigate_calendar'
  | 'navigate_actions'
  | 'open_lead_detail'
  | 'open_property_detail'
  | 'open_transaction_detail'
  | 'highlight_top_lead'
  | 'highlight_urgent_task'
  | 'explain_action'
  | 'general_question'
  | 'clarification_request'

export type AssistantStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'navigating'
  | 'speaking'
  | 'error'

export type AssistantRequest = {
  message: string
  currentPath: string
  recentExecutedActionIds?: string[]
}

export type AssistantDecision = {
  intent: AssistantIntent
  targetRoute: string | null
  targetId: string | null
  highlight: boolean
  voiceResponse: string
  confidence: number
  clarificationQuestion: string | null
}

export type AssistantChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}
