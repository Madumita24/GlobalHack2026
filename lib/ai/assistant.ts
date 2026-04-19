import { mockEvents, mockLeads, mockProperties, mockTasks, mockTransactions } from '@/lib/mock-data'
import { generateRecommendedActions } from '@/lib/scoring'
import type { AssistantDecision, AssistantIntent, AssistantRequest } from '@/types/assistant'

const VALID_INTENTS: AssistantIntent[] = [
  'navigate_dashboard',
  'navigate_leads',
  'navigate_listings',
  'navigate_transactions',
  'navigate_actions',
  'open_lead_detail',
  'open_property_detail',
  'open_transaction_detail',
  'highlight_top_lead',
  'highlight_urgent_task',
  'explain_action',
  'general_question',
  'clarification_request',
]

const VALID_ROUTES = ['/dashboard', '/dashboard/briefing', '/people', '/transactions']

const assistantResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intent',
    'targetRoute',
    'targetId',
    'highlight',
    'voiceResponse',
    'confidence',
    'clarificationQuestion',
  ],
  properties: {
    intent: { type: 'string', enum: VALID_INTENTS },
    targetRoute: {
      anyOf: [
        { type: 'string', enum: VALID_ROUTES },
        { type: 'null' },
      ],
    },
    targetId: { type: ['string', 'null'] },
    highlight: { type: 'boolean' },
    voiceResponse: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    clarificationQuestion: { type: ['string', 'null'] },
  },
} as const

const actions = generateRecommendedActions(
  mockLeads,
  mockProperties,
  mockEvents,
  mockTransactions,
)

const topAction = actions[0] ?? null
const topLeadAction = actions.find((action) => action.leadId) ?? null
const topLead = topLeadAction?.leadId
  ? mockLeads.find((lead) => lead.id === topLeadAction.leadId) ?? highestScoreLead()
  : highestScoreLead()
const topListingAction = actions.find((action) => action.type === 'send_listing' && action.propertyId) ?? null
const hottestProperty = topListingAction?.propertyId
  ? mockProperties.find((property) => property.id === topListingAction.propertyId) ?? null
  : null
const urgentTransaction =
  [...mockTransactions].sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)[0] ?? null
const urgentTask = mockTasks.find((task) => !task.completed) ?? null

export async function getAssistantDecision(request: AssistantRequest): Promise<AssistantDecision> {
  const normalizedMessage = request.message.trim()
  if (!normalizedMessage) return fallbackDecision(request)

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return fallbackDecision(request)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
          {
            role: 'user',
            content: JSON.stringify({
              request: normalizedMessage,
              currentPath: request.currentPath,
              recentExecutedActionIds: request.recentExecutedActionIds ?? [],
              context: getAssistantContext(),
            }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'lofty_assistant_decision',
            strict: true,
            schema: assistantResponseSchema,
          },
        },
      }),
    })

    if (!response.ok) {
      console.error('[Assistant] OpenAI error:', await response.text().catch(() => response.statusText))
      return fallbackDecision(request)
    }

    const data = await response.json()
    const output = extractResponseText(data)
    if (!output) return fallbackDecision(request)

    return normalizeDecision(JSON.parse(output))
  } catch (error) {
    console.error('[Assistant] decision error:', error)
    return fallbackDecision(request)
  }
}

export function getAssistantContext() {
  return {
    routes: VALID_ROUTES,
    topAction: topAction
      ? {
          id: topAction.id,
          type: topAction.type,
          title: topAction.title,
          route: '/dashboard',
          highlightId: `action:${topAction.id}`,
          summary: topAction.summary,
        }
      : null,
    topLead: topLead
      ? {
          id: topLead.id,
          name: topLead.name,
          score: topLead.score,
          route: '/people',
          highlightId: `lead:${topLead.id}`,
          recentBehavior: topLead.recentBehavior,
        }
      : null,
    hottestListingMatch: hottestProperty
      ? {
          id: hottestProperty.id,
          address: hottestProperty.address,
          city: hottestProperty.city,
          route: '/people',
          highlightId: `property:${hottestProperty.id}`,
          actionTitle: topListingAction?.title,
        }
      : null,
    urgentTransaction: urgentTransaction
      ? {
          id: urgentTransaction.id,
          address: urgentTransaction.address,
          route: '/transactions',
          highlightId: `transaction:${urgentTransaction.id}`,
          deadline: urgentTransaction.nextDeadlineLabel,
          daysUntilDeadline: urgentTransaction.daysUntilDeadline,
        }
      : null,
    urgentTask: urgentTask
      ? {
          id: urgentTask.id,
          title: urgentTask.title,
          route: '/dashboard',
          highlightId: `task:${urgentTask.id}`,
        }
      : null,
    leads: mockLeads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      score: lead.score,
      route: '/people',
      highlightId: `lead:${lead.id}`,
    })),
    properties: mockProperties.map((property) => ({
      id: property.id,
      address: property.address,
      city: property.city,
      route: '/people',
      highlightId: `property:${property.id}`,
    })),
    transactions: mockTransactions.map((transaction) => ({
      id: transaction.id,
      address: transaction.address,
      route: '/transactions',
      highlightId: `transaction:${transaction.id}`,
    })),
  }
}

function buildSystemPrompt() {
  return [
    'You are the intent router for the Lofty AI Copilot demo.',
    'Return valid JSON only. No markdown, no prose outside the JSON.',
    'Use only the provided routes, ids, and records. Do not fabricate records.',
    'If the request is ambiguous, use intent clarification_request, no targetRoute, no targetId, highlight false, and include a short clarificationQuestion.',
    'Prefer the most useful page for the user request: top leads go to /people, urgent transactions go to /transactions, top actions and tasks go to /dashboard, the full action plan goes to /dashboard/briefing.',
    'voiceResponse should be warm, concise, and confident, suitable for spoken playback.',
  ].join(' ')
}

function fallbackDecision(request: AssistantRequest): AssistantDecision {
  const text = request.message.toLowerCase()

  if (matches(text, ['lead', 'leads', 'people', 'crm'])) {
    if (matches(text, ['top', 'best', 'highest', 'priority'])) {
      return {
        intent: 'highlight_top_lead',
        targetRoute: '/people',
        targetId: topLead ? `lead:${topLead.id}` : null,
        highlight: !!topLead,
        voiceResponse: topLead
          ? `Here is your top lead. I highlighted ${topLead.name} for you.`
          : 'I opened your leads page.',
        confidence: 0.9,
        clarificationQuestion: null,
      }
    }
    return {
      intent: 'navigate_leads',
      targetRoute: '/people',
      targetId: null,
      highlight: false,
      voiceResponse: 'Here is your leads page.',
      confidence: 0.86,
      clarificationQuestion: null,
    }
  }

  if (matches(text, ['transaction', 'deal', 'closing', 'deadline', 'attention'])) {
    return {
      intent: 'open_transaction_detail',
      targetRoute: '/transactions',
      targetId: urgentTransaction ? `transaction:${urgentTransaction.id}` : null,
      highlight: !!urgentTransaction,
      voiceResponse: urgentTransaction
        ? 'This is the transaction that needs attention today.'
        : 'I opened your transactions page.',
      confidence: 0.9,
      clarificationQuestion: null,
    }
  }

  if (matches(text, ['listing', 'property', 'match'])) {
    return {
      intent: 'open_property_detail',
      targetRoute: '/people',
      targetId: hottestProperty ? `property:${hottestProperty.id}` : null,
      highlight: !!hottestProperty,
      voiceResponse: hottestProperty
        ? `Here is your hottest listing match: ${hottestProperty.address}.`
        : 'I opened the leads page where listing matches are surfaced.',
      confidence: 0.84,
      clarificationQuestion: null,
    }
  }

  if (matches(text, ['task', 'tasks', 'urgent'])) {
    return {
      intent: 'highlight_urgent_task',
      targetRoute: '/dashboard',
      targetId: urgentTask ? `task:${urgentTask.id}` : 'section:tasks',
      highlight: true,
      voiceResponse: 'I opened your urgent tasks and highlighted the next one to handle.',
      confidence: 0.82,
      clarificationQuestion: null,
    }
  }

  if (matches(text, ['first', 'next', 'do first', 'what should i do', 'plan', 'action'])) {
    return {
      intent: 'navigate_actions',
      targetRoute: '/dashboard',
      targetId: topAction ? `action:${topAction.id}` : 'section:top-actions',
      highlight: true,
      voiceResponse: topAction
        ? `Start with ${topAction.title}. I highlighted it for you.`
        : 'I opened your action plan.',
      confidence: 0.88,
      clarificationQuestion: null,
    }
  }

  if (matches(text, ['dashboard', 'overview', 'home'])) {
    return {
      intent: 'navigate_dashboard',
      targetRoute: '/dashboard',
      targetId: 'section:briefing',
      highlight: true,
      voiceResponse: 'Here is your AI overview.',
      confidence: 0.82,
      clarificationQuestion: null,
    }
  }

  return {
    intent: 'clarification_request',
    targetRoute: null,
    targetId: null,
    highlight: false,
    voiceResponse: 'I can help with leads, actions, listings, tasks, or transactions. Which one should I open?',
    confidence: 0.45,
    clarificationQuestion: 'Do you want leads, actions, listings, tasks, or transactions?',
  }
}

function normalizeDecision(value: unknown): AssistantDecision {
  const candidate = value as Partial<AssistantDecision>
  const targetRoute = candidate.targetRoute && VALID_ROUTES.includes(candidate.targetRoute)
    ? candidate.targetRoute
    : null
  const intent = candidate.intent && VALID_INTENTS.includes(candidate.intent)
    ? candidate.intent
    : 'general_question'

  return {
    intent,
    targetRoute,
    targetId: typeof candidate.targetId === 'string' ? candidate.targetId : null,
    highlight: Boolean(candidate.highlight),
    voiceResponse:
      typeof candidate.voiceResponse === 'string' && candidate.voiceResponse.trim()
        ? candidate.voiceResponse.trim()
        : 'I found the best place for that.',
    confidence:
      typeof candidate.confidence === 'number'
        ? Math.max(0, Math.min(1, candidate.confidence))
        : 0.6,
    clarificationQuestion:
      typeof candidate.clarificationQuestion === 'string'
        ? candidate.clarificationQuestion
        : null,
  }
}

function highestScoreLead() {
  return [...mockLeads].sort((a, b) => b.score - a.score)[0] ?? null
}

function matches(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function extractResponseText(data: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (typeof data.output_text === 'string') return data.output_text
  return data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text): text is string => typeof text === 'string')
}
