import { getAppData } from '@/lib/data/app-data'
import type { AppData } from '@/types/app-data'
import type {
  AssistantCommunication,
  AssistantDecision,
  AssistantIntent,
  AssistantRequest,
} from '@/types/assistant'

const VALID_INTENTS: AssistantIntent[] = [
  'navigate_dashboard',
  'navigate_leads',
  'navigate_listings',
  'navigate_transactions',
  'navigate_calendar',
  'navigate_actions',
  'open_lead_detail',
  'open_property_detail',
  'open_transaction_detail',
  'highlight_top_lead',
  'highlight_urgent_task',
  'explain_action',
  'send_email',
  'send_text_message',
  'general_question',
  'clarification_request',
]

const VALID_ROUTES = ['/dashboard', '/dashboard/briefing', '/people', '/transactions', '/calendar', '/tasks']

const assistantResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intent',
    'targetRoute',
    'targetId',
    'targetDate',
    'highlight',
    'voiceResponse',
    'confidence',
    'clarificationQuestion',
    'communication',
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
    targetDate: {
      anyOf: [
        { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        { type: 'null' },
      ],
    },
    highlight: { type: 'boolean' },
    voiceResponse: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    clarificationQuestion: { type: ['string', 'null'] },
    communication: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: [
            'channel',
            'leadId',
            'recipientName',
            'recipientEmail',
            'recipientPhone',
            'subject',
            'body',
            'deliveryStatus',
            'messageId',
            'launchHref',
            'error',
          ],
          properties: {
            channel: { type: 'string', enum: ['email', 'sms'] },
            leadId: { type: 'string' },
            recipientName: { type: 'string' },
            recipientEmail: { type: ['string', 'null'] },
            recipientPhone: { type: ['string', 'null'] },
            subject: { type: ['string', 'null'] },
            body: { type: 'string' },
            deliveryStatus: { type: 'string', enum: ['pending', 'prepared', 'sent', 'failed'] },
            messageId: { type: ['string', 'null'] },
            launchHref: { type: ['string', 'null'] },
            error: { type: ['string', 'null'] },
          },
        },
      ],
    },
  },
} as const

export async function getAssistantDecision(request: AssistantRequest): Promise<AssistantDecision> {
  const appData = await getAppData()
  const assistantContext = getAssistantContext(appData)
  const normalizedMessage = request.message.trim()
  if (!normalizedMessage) return fallbackDecision(request, assistantContext)

  const directDecision = getDirectNavigationDecision(request, assistantContext)
  if (directDecision) return directDecision

  const contextualDecision = getContextualLeadDecision(request, assistantContext)
  if (contextualDecision) return contextualDecision

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return fallbackDecision(request, assistantContext)

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
              conversationHistory: request.conversationHistory ?? [],
              conversationMemory: getConversationMemory(request, assistantContext),
              context: assistantContext,
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
      return fallbackDecision(request, assistantContext)
    }

    const data = await response.json()
    const output = extractResponseText(data)
    if (!output) return fallbackDecision(request, assistantContext)

    return withRequestDefaults(normalizeDecision(JSON.parse(output)), request.message)
  } catch (error) {
    console.error('[Assistant] decision error:', error)
    return fallbackDecision(request, assistantContext)
  }
}

export function getAssistantContext(data: AppData) {
  const actions = data.actions
  const topAction = actions[0] ?? null
  const topLeadAction = actions.find((action) => action.leadId) ?? null
  const topLead = topLeadAction?.leadId
    ? data.leads.find((lead) => lead.id === topLeadAction.leadId) ?? highestScoreLead(data)
    : highestScoreLead(data)
  const topListingAction = actions.find((action) => action.type === 'send_listing' && action.propertyId) ?? null
  const hottestProperty = topListingAction?.propertyId
    ? data.properties.find((property) => property.id === topListingAction.propertyId) ?? null
    : null
  const urgentTransaction =
    [...data.transactions].sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)[0] ?? null
  const urgentTask = data.tasks.find((task) => !task.completed) ?? null

  return {
    routes: VALID_ROUTES,
    calendar: {
      route: '/calendar',
      highlightId: 'section:calendar',
      conflictsHighlightId: 'section:calendar-conflicts',
      capability: 'Shows AI-added tasks, day/week/month views, conflicts, and free-time suggestions.',
    },
    topAction: topAction
      ? {
          id: topAction.id,
          type: topAction.type,
          title: topAction.title,
          route: '/dashboard',
          highlightId: 'section:tasks',
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
    leads: data.leads.map((lead) => buildLeadAssistantContext(lead, data)),
    properties: data.properties.map((property) => ({
      id: property.id,
      address: property.address,
      city: property.city,
      route: '/people',
      highlightId: `property:${property.id}`,
    })),
    transactions: data.transactions.map((transaction) => ({
      id: transaction.id,
      address: transaction.address,
      route: '/transactions',
      highlightId: `transaction:${transaction.id}`,
    })),
  }
}

function buildLeadAssistantContext(lead: AppData['leads'][number], data: AppData) {
  const recentEvents = data.events
    .filter((event) => event.leadId === lead.id)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      type: event.type,
      description: event.description,
      occurredAt: event.occurredAt,
      metadata: event.metadata ?? null,
    }))
  const tasks = data.tasks
    .filter((task) => task.leadId === lead.id)
    .map((task) => ({
      id: task.id,
      type: task.type,
      title: task.title,
      dueTime: task.dueTime ?? null,
      scheduledFor: task.scheduledFor ?? null,
      completed: task.completed,
    }))
  const appointments = data.appointments
    .filter((appointment) => appointment.leadId === lead.id)
    .map((appointment) => ({
      id: appointment.id,
      type: appointment.type,
      address: appointment.address,
      date: appointment.date,
      time: appointment.time,
    }))
  const actions = data.actions
    .filter((action) => action.leadId === lead.id)
    .slice(0, 5)
    .map((action) => ({
      id: action.id,
      type: action.type,
      title: action.title,
      summary: action.summary,
      priorityScore: action.priorityScore,
      urgency: action.urgency,
      scheduledFor: action.scheduledFor ?? null,
      draftMessage: action.draftMessage ?? null,
      status: action.status,
    }))

  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    stage: lead.stage,
    score: lead.score,
    budget: lead.budget,
    preferredAreas: lead.preferredAreas,
    preferences: lead.preferences,
    lastContactDaysAgo: lead.lastContactDaysAgo,
    recentBehavior: lead.recentBehavior,
    intentSignals: lead.intentSignals,
    assignedAgent: lead.assignedAgent,
    source: lead.source,
    engagementLevel: lead.engagementLevel ?? null,
    route: '/people',
    highlightId: `lead:${lead.id}`,
    recentEvents,
    tasks,
    appointments,
    actions,
  }
}

function buildSystemPrompt() {
  return [
    'You are the intent router for the Lofty AI Copilot demo.',
    'Return valid JSON only. No markdown, no prose outside the JSON.',
    'Use only the provided routes, ids, and records. Do not fabricate records.',
    'Persona: sound like a sharp real estate operations assistant. Be warm, direct, and brief, but include the concrete fact the agent needs.',
    'Use conversationHistory and conversationMemory only for lead-specific follow-up questions, pronouns, and short requests such as "her appointments?", "tell me too", "what about her budget?", or "send it to them".',
    'Do not let a previous lead context override generic global commands like "show me my top lead", "hottest listing match", "what should I do first", or "transaction that needs attention".',
    'Lead briefing requests such as "tell me about Madumita", "details about her", or "lead details" must answer with a full lead briefing, not only calendar appointments.',
    'Appointment-only requests such as "her appointments", "check her calendar", or "when is she scheduled" should answer with calendar details.',
    'When a user asks for details about a lead, answer with concrete facts from the provided lead context: score, stage, budget, preferred areas, recent behavior, latest events/replies, scheduled tasks, appointments, and next action. Do not only say that you are showing the page.',
    'When a user asks about a lead appointment, schedule, meeting, or availability, summarize the matching lead appointments and scheduled tasks/actions from context. If there are none, say there is nothing scheduled for that lead.',
    'For calendar navigation to a known lead appointment or scheduled task, set targetRoute to /calendar and set targetDate to the date of that appointment/task in YYYY-MM-DD format.',
    'For lead detail answers, still navigate to /people and highlight the lead when useful.',
    'If the request is ambiguous, use intent clarification_request, no targetRoute, no targetId, highlight false, and include a short clarificationQuestion.',
    'For requests to email or mail a lead, use intent send_email and include communication with channel email, the matching lead id, recipient details, a concise subject, and the exact body to send.',
    'For requests to text, SMS, or message a lead, use intent send_text_message and include communication with channel sms, the matching lead id, recipient details, no subject, and the exact text body. SMS is prepared in the device composer for the agent to review and send.',
    'If a communication request does not clearly name a provided lead, ask a clarification question.',
    'If a communication request does not provide message wording, create a short professional real estate follow-up using the lead context.',
    'Prefer the most useful page for the user request: top leads go to /people, calendar/schedule/free-time/conflict questions go to /calendar, urgent transactions go to /transactions, task list and CRM task requests go to /tasks, top actions and what-should-I-do-first requests go to /dashboard, the full action plan goes to /dashboard/briefing.',
    'voiceResponse should be warm, concise, and confident, suitable for spoken playback.',
  ].join(' ')
}

function getDirectNavigationDecision(
  request: AssistantRequest,
  context: ReturnType<typeof getAssistantContext>,
): AssistantDecision | null {
  const text = request.message.toLowerCase()
  const namedLead = findMentionedLead(request.message, context.leads)

  if (matches(text, ['top lead', 'best lead', 'highest lead', 'priority lead']) || (matches(text, ['lead', 'leads']) && matches(text, ['top', 'best', 'highest', 'priority']))) {
    return {
      intent: 'highlight_top_lead',
      targetRoute: '/people',
      targetId: context.topLead?.highlightId ?? null,
      targetDate: null,
      highlight: !!context.topLead,
      voiceResponse: context.topLead
        ? `Your top lead is ${context.topLead.name}. I highlighted them for you.`
        : 'I opened your leads page.',
      confidence: 0.95,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (matches(text, ['hottest listing', 'listing match', 'property match', 'hot listing'])) {
    return {
      intent: 'open_property_detail',
      targetRoute: '/people',
      targetId: context.hottestListingMatch?.highlightId ?? null,
      targetDate: null,
      highlight: !!context.hottestListingMatch,
      voiceResponse: context.hottestListingMatch
        ? `Your hottest listing match is ${context.hottestListingMatch.address}. I opened it for you.`
        : 'I opened the leads page where listing matches are surfaced.',
      confidence: 0.94,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (matches(text, ['transaction that needs attention', 'deal that needs attention', 'urgent transaction', 'transaction attention'])) {
    return {
      intent: 'open_transaction_detail',
      targetRoute: '/transactions',
      targetId: context.urgentTransaction?.highlightId ?? null,
      targetDate: null,
      highlight: !!context.urgentTransaction,
      voiceResponse: context.urgentTransaction
        ? `This is the transaction that needs attention: ${context.urgentTransaction.address}, ${context.urgentTransaction.deadline}.`
        : 'I opened your transactions page.',
      confidence: 0.95,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (matches(text, ['what should i do first', 'do first', 'next best', 'top action', 'first action'])) {
    return {
      intent: 'navigate_actions',
      targetRoute: '/dashboard',
      targetId: 'section:tasks',
      targetDate: null,
      highlight: true,
      voiceResponse: context.topAction
        ? `Start with ${context.topAction.title}. I highlighted it for you.`
        : 'I opened your action plan.',
      confidence: 0.94,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (matches(text, ['urgent task', 'urgent tasks', 'show tasks', 'today tasks', 'my tasks'])) {
    return {
      intent: 'highlight_urgent_task',
      targetRoute: '/tasks',
      targetId: context.urgentTask?.highlightId ?? 'section:tasks',
      targetDate: null,
      highlight: true,
      voiceResponse: context.urgentTask
        ? `Your next urgent task is ${context.urgentTask.title}. I highlighted it for you.`
        : 'I opened your task list.',
      confidence: 0.93,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (!namedLead && matches(text, ['open leads', 'show leads', 'leads page', 'people page', 'open people'])) {
    return {
      intent: 'navigate_leads',
      targetRoute: '/people',
      targetId: null,
      targetDate: null,
      highlight: false,
      voiceResponse: 'Here is your leads page.',
      confidence: 0.92,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (!namedLead && matches(text, ['open calendar', 'show calendar', 'calendar page', 'my calendar'])) {
    return {
      intent: 'navigate_calendar',
      targetRoute: '/calendar',
      targetId: 'section:calendar',
      targetDate: null,
      highlight: true,
      voiceResponse: 'Here is your CRM calendar.',
      confidence: 0.92,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (!namedLead && matches(text, ['open tasks', 'show tasks', 'tasks page', 'my tasks', 'crm tasks'])) {
    return {
      intent: 'navigate_actions',
      targetRoute: '/tasks',
      targetId: null,
      targetDate: null,
      highlight: false,
      voiceResponse: 'Here is your CRM task list.',
      confidence: 0.92,
      clarificationQuestion: null,
      communication: null,
    }
  }

  return null
}

function getContextualLeadDecision(
  request: AssistantRequest,
  context: ReturnType<typeof getAssistantContext>,
): AssistantDecision | null {
  const text = request.message.toLowerCase()
  const namedLead = findMentionedLead(request.message, context.leads)
  const lead = namedLead ?? (isLeadFollowUpRequest(text) ? resolveConversationLead(request, context) : null)
  if (!lead) return null

  const recentTopic = getRecentConversationTopic(request)
  const wantsFollowUpAnswer = matches(text, [
    'did you check',
    'did you get',
    'what did you find',
    'any update',
    'which one',
    'which was',
    'what was',
    'yes',
    'yeah',
    'yep',
  ])
    || fuzzyIncludes(text, ['did you check', 'did you get'])
  const wantsReschedule = matches(text, ['reschedule', 'rescheduled', 'previous', 'old appointment', 'moved'])
  const wantsExplicitSchedule = wantsReschedule
    || matches(text, ['appointment', 'appointments', 'appointed', 'meeting', 'meetings', 'showing', 'showings', 'calendar'])
    || fuzzyIncludes(text, ['appointment', 'appointments'])
  const wantsScheduleFollowUp = !hasLeadBriefingLanguage(text) && wantsFollowUpAnswer && recentTopic === 'schedule'
  const wantsSchedule = wantsExplicitSchedule || wantsScheduleFollowUp
  const wantsDetails = hasLeadBriefingLanguage(text)
    || (namedLead && matches(text, ['lead', 'client', 'customer']))
    || (wantsFollowUpAnswer && recentTopic === 'details')
  const wantsLeadBriefing = wantsDetails && !wantsReschedule

  if (wantsLeadBriefing) {
    return {
      intent: 'open_lead_detail',
      targetRoute: '/people',
      targetId: lead.highlightId,
      targetDate: null,
      highlight: true,
      voiceResponse: buildLeadDetailResponse(lead),
      confidence: 0.94,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (wantsSchedule) {
    const response = wantsReschedule || recentTopic === 'reschedule'
      ? buildLeadRescheduleResponse(lead)
      : buildLeadScheduleResponse(lead)
    const targetDate = getLeadCalendarDate(lead)

    return {
      intent: 'navigate_calendar',
      targetRoute: '/calendar',
      targetId: 'section:calendar',
      targetDate,
      highlight: true,
      voiceResponse: response,
      confidence: 0.92,
      clarificationQuestion: null,
      communication: null,
    }
  }

  return null
}

function hasLeadBriefingLanguage(text: string) {
  return matches(text, [
    'about',
    'detail',
    'details',
    'tell',
    'info',
    'information',
    'profile',
    'summary',
    'summarize',
    'know about',
    'what about',
    'budget',
    'preference',
    'preferences',
  ])
}

function isLeadFollowUpRequest(text: string) {
  return matches(text, [
    'her',
    'him',
    'their',
    'them',
    'she',
    'he',
    'that lead',
    'this lead',
    'that client',
    'this client',
    'that customer',
    'this customer',
    'appointment',
    'appointments',
    'calendar',
    'schedule',
    'reschedule',
    'details',
    'detail',
    'about',
    'budget',
    'preference',
    'preferences',
    'did you check',
    'did you get',
    'what did you find',
    'any update',
  ]) || fuzzyIncludes(text, ['appointment', 'appointments', 'did you check', 'did you get'])
}

function getRecentConversationTopic(request: AssistantRequest) {
  const recentText = (request.conversationHistory ?? [])
    .slice(-4)
    .map((message) => message.content.toLowerCase())
    .join(' ')

  if (matches(recentText, ['reschedule', 'rescheduled', 'previous appointment', 'old appointment'])) {
    return 'reschedule'
  }
  if (
    matches(recentText, ['appointment', 'appointments', 'calendar', 'schedule', 'showing', 'meeting']) ||
    fuzzyIncludes(recentText, ['appointment', 'appointments'])
  ) {
    return 'schedule'
  }
  if (matches(recentText, ['detail', 'details', 'budget', 'preference', 'profile', 'tell'])) {
    return 'details'
  }
  return null
}

function getConversationMemory(
  request: AssistantRequest,
  context: ReturnType<typeof getAssistantContext>,
) {
  const activeLead = resolveConversationLead(request, context)

  return {
    activeLead: activeLead
      ? {
          id: activeLead.id,
          name: activeLead.name,
          highlightId: activeLead.highlightId,
          route: activeLead.route,
        }
      : null,
  }
}

function resolveConversationLead(
  request: AssistantRequest,
  context: ReturnType<typeof getAssistantContext>,
) {
  const currentMention = findMentionedLead(request.message, context.leads)
  if (currentMention) return currentMention

  const recentMessages = [...(request.conversationHistory ?? [])].reverse()
  for (const message of recentMessages) {
    const lead = findMentionedLead(message.content, context.leads)
    if (lead) return lead
  }

  return null
}

function buildLeadDetailResponse(lead: ReturnType<typeof getAssistantContext>['leads'][number]) {
  const areaSummary = lead.preferredAreas.length ? lead.preferredAreas.join(', ') : 'no preferred area captured yet'
  const propertyTypes = lead.preferences.propertyTypes.length
    ? lead.preferences.propertyTypes.join(', ')
    : 'property type open'
  const latestReply = lead.recentEvents.find((event) => event.type === 'email_replied')
  const latestActivity = lead.recentBehavior[0] ?? lead.recentEvents[0]?.description ?? 'No recent activity captured.'
  const latestAppointment = getPrimaryScheduledItem(lead)
  const nextAction = lead.actions.find((action) => action.status !== 'done') ?? null
  const replySummary = latestReply
    ? summarizeLeadReply(latestReply)
    : 'I do not see a recent email reply from her yet.'
  const appointmentSummary = latestAppointment
    ? `The latest appointment signal is ${latestAppointment.label} on ${formatDateTime(latestAppointment.dateTime)}.`
    : 'I do not see a scheduled appointment time for her yet.'
  const actionText = nextAction
    ? `Next best move: ${nextAction.title}${nextAction.scheduledFor ? ` on ${formatDateTime(nextAction.scheduledFor)}` : ''}.`
    : 'No pending next action is queued right now.'

  return [
    `Here is the latest on ${lead.name}: she is a ${lead.stage} lead with a score of ${lead.score}.`,
    `Her budget is ${formatCurrency(lead.budget)}, and she is looking around ${areaSummary} for ${lead.preferences.minBeds}-${lead.preferences.maxBeds} beds, ${lead.preferences.minBaths}+ baths, and ${propertyTypes}.`,
    `Her latest activity: ${latestActivity}.`,
    replySummary,
    appointmentSummary,
    actionText,
  ].filter(Boolean).join(' ')
}

function summarizeLeadReply(event: ReturnType<typeof getAssistantContext>['leads'][number]['recentEvents'][number]) {
  const replyType = metadataString(event.metadata, 'replyType')
  const requestedTime = metadataString(event.metadata, 'requestedTime')
  const preferenceSummary = metadataString(event.metadata, 'preferenceSummary')

  if (replyType === 'reschedule_request' && requestedTime) {
    return `She replied to your email asking to reschedule for ${formatDateTime(requestedTime)}.`
  }
  if (replyType === 'appointment_request' && requestedTime) {
    return `She replied to your email and asked for an appointment on ${formatDateTime(requestedTime)}.`
  }
  if (requestedTime) {
    return `She replied to your email with a time: ${formatDateTime(requestedTime)}.`
  }
  if (preferenceSummary) {
    return `She replied with updated preferences: ${preferenceSummary}.`
  }
  return `She replied to your email: ${event.description}.`
}

function buildLeadScheduleResponse(lead: ReturnType<typeof getAssistantContext>['leads'][number]) {
  const scheduledItems = getLeadScheduleItems(lead)

  if (!scheduledItems.length) {
    return `I do not see any scheduled appointments or calendar tasks for ${lead.name} yet.`
  }

  const latest = scheduledItems[0]
  const otherItems = scheduledItems.slice(1, 3).map((item) => item.label)
  const otherText = otherItems.length ? ` I also see ${otherItems.join('; ')}.` : ''

  return `${lead.name}'s latest calendar item is ${latest.label} on ${formatDateTime(latest.dateTime)}.${otherText}`
}

function buildLeadRescheduleResponse(lead: ReturnType<typeof getAssistantContext>['leads'][number]) {
  const rescheduleEvent = lead.recentEvents.find((event) => {
    const replyType = metadataString(event.metadata, 'replyType')
    return replyType === 'reschedule_request' || matches(event.description.toLowerCase(), ['reschedule', 'cannot schedule', 'can we move', 'instead'])
  })
  const requestedTime = rescheduleEvent ? metadataString(rescheduleEvent.metadata, 'requestedTime') : null
  const matchingTask = lead.tasks.find((task) => !task.completed && task.scheduledFor)
  const newTime = requestedTime ?? matchingTask?.scheduledFor ?? null

  if (!rescheduleEvent && !matchingTask) {
    return `I checked ${lead.name}'s record. I do not see a reschedule request or a scheduled appointment change saved yet.`
  }

  const oldAppointment = lead.appointments[0]
  const oldAppointmentText = oldAppointment
    ? `The earlier calendar appointment I can see is ${oldAppointment.address} on ${formatDateOnly(oldAppointment.date)} at ${oldAppointment.time}.`
    : 'I do not see the original appointment time stored in the calendar record.'
  const newAppointmentText = newTime
    ? `The rescheduled time captured from the reply is ${formatDateTime(newTime)}.`
    : 'The reply shows a reschedule request, but I do not see a new time stored.'

  return `${newAppointmentText} ${oldAppointmentText}`
}

function getLeadCalendarDate(lead: ReturnType<typeof getAssistantContext>['leads'][number]) {
  const latestScheduledItem = getPrimaryScheduledItem(lead)
  if (latestScheduledItem) return dateStringFromDateTime(latestScheduledItem.dateTime)

  return lead.appointments[0]?.date ?? null
}

function getPrimaryScheduledItem(lead: ReturnType<typeof getAssistantContext>['leads'][number]) {
  return getLeadScheduleItems(lead)[0] ?? null
}

function getLeadScheduleItems(lead: ReturnType<typeof getAssistantContext>['leads'][number]) {
  const scheduledItems = [
    ...lead.recentEvents
      .filter((event) => isSchedulingReply(event))
      .map((event) => {
        const requestedTime = metadataString(event.metadata, 'requestedTime')
        if (!requestedTime) return null
        const replyType = metadataString(event.metadata, 'replyType')
        const label = replyType === 'reschedule_request'
          ? 'her rescheduled appointment request'
          : 'her appointment request from email'
        return { label, dateTime: requestedTime }
      }),
    ...lead.tasks
      .filter((task) => !task.completed && task.scheduledFor)
      .map((task) => ({
        label: task.title,
        dateTime: task.scheduledFor as string,
      })),
    ...lead.appointments.map((appointment) => ({
      label: `${titleCase(appointment.type.replace(/_/g, ' '))} at ${appointment.address}`,
      dateTime: combineAppointmentDateTime(appointment.date, appointment.time),
    })),
  ].filter((item): item is { label: string; dateTime: string } => Boolean(item?.dateTime))

  return scheduledItems.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
}

function isSchedulingReply(event: ReturnType<typeof getAssistantContext>['leads'][number]['recentEvents'][number]) {
  const replyType = metadataString(event.metadata, 'replyType')
  return event.type === 'email_replied' && (
    replyType === 'reschedule_request' ||
    replyType === 'appointment_request' ||
    Boolean(metadataString(event.metadata, 'requestedTime')) ||
    matches(event.description.toLowerCase(), ['appointment', 'schedule', 'reschedule'])
  )
}

function metadataString(
  metadata: Record<string, string | number | boolean> | null,
  key: string,
) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function dateStringFromDateTime(value: string | null) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'not set'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateOnly(value: string) {
  const date = new Date(`${value}T12:00:00`)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function combineAppointmentDateTime(date: string, time: string) {
  const parsedTime = parseTimeLabel(time)
  if (parsedTime === null) return `${date}T12:00:00`
  const hours = Math.floor(parsedTime / 60)
  const minutes = parsedTime % 60
  return `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
}

function parseTimeLabel(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (!match) return null

  const rawHour = Number(match[1])
  const minute = Number(match[2] ?? 0)
  const suffix = match[3].toUpperCase()
  if (!Number.isFinite(rawHour) || !Number.isFinite(minute)) return null

  const hour = suffix === 'PM' && rawHour !== 12
    ? rawHour + 12
    : suffix === 'AM' && rawHour === 12
      ? 0
      : rawHour
  return hour * 60 + minute
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function fallbackDecision(
  request: AssistantRequest,
  context: ReturnType<typeof getAssistantContext>,
): AssistantDecision {
  const text = request.message.toLowerCase()
  const communicationDecision = fallbackCommunicationDecision(request.message, context, request)
  if (communicationDecision) return communicationDecision

  if (matches(text, ['lead', 'leads', 'people', 'crm'])) {
    if (matches(text, ['top', 'best', 'highest', 'priority'])) {
      return {
        intent: 'highlight_top_lead',
        targetRoute: '/people',
        targetId: context.topLead?.highlightId ?? null,
        highlight: !!context.topLead,
        voiceResponse: context.topLead
          ? `Here is your top lead. I highlighted ${context.topLead.name} for you.`
          : 'I opened your leads page.',
        confidence: 0.9,
        clarificationQuestion: null,
        communication: null,
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
      communication: null,
    }
  }

  if (matches(text, ['transaction', 'deal', 'closing', 'deadline', 'attention'])) {
    return {
      intent: 'open_transaction_detail',
      targetRoute: '/transactions',
      targetId: context.urgentTransaction?.highlightId ?? null,
      highlight: !!context.urgentTransaction,
      voiceResponse: context.urgentTransaction
        ? 'This is the transaction that needs attention today.'
        : 'I opened your transactions page.',
      confidence: 0.9,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (matches(text, ['calendar', 'schedule', 'availability', 'free time', 'conflict', 'conflicts', 'week', 'month'])) {
    return {
      intent: 'navigate_calendar',
      targetRoute: '/calendar',
      targetId: matches(text, ['conflict', 'conflicts', 'free time', 'availability'])
        ? 'section:calendar-conflicts'
        : 'section:calendar',
      highlight: true,
      voiceResponse: matches(text, ['conflict', 'conflicts'])
        ? 'I opened the calendar and highlighted the AI conflict checks.'
        : 'I opened your CRM calendar with AI-added tasks.',
      confidence: 0.88,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (matches(text, ['listing', 'property', 'match'])) {
    return {
      intent: 'open_property_detail',
      targetRoute: '/people',
      targetId: context.hottestListingMatch?.highlightId ?? null,
      highlight: !!context.hottestListingMatch,
      voiceResponse: context.hottestListingMatch
        ? `Here is your hottest listing match: ${context.hottestListingMatch.address}.`
        : 'I opened the leads page where listing matches are surfaced.',
      confidence: 0.84,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (matches(text, ['task', 'tasks', 'urgent'])) {
    return {
      intent: 'highlight_urgent_task',
      targetRoute: '/tasks',
      targetId: context.urgentTask?.highlightId ?? 'section:tasks',
      highlight: true,
      voiceResponse: 'I opened your urgent tasks and highlighted the next one to handle.',
      confidence: 0.82,
      clarificationQuestion: null,
      communication: null,
    }
  }

  if (matches(text, ['first', 'next', 'do first', 'what should i do', 'plan', 'action'])) {
    return {
      intent: 'navigate_actions',
      targetRoute: '/dashboard',
      targetId: 'section:tasks',
      highlight: true,
      voiceResponse: context.topAction
        ? `Start with ${context.topAction.title}. I highlighted it for you.`
        : 'I opened your action plan.',
      confidence: 0.88,
      clarificationQuestion: null,
      communication: null,
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
      communication: null,
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
    communication: null,
  }
}

function fallbackCommunicationDecision(
  message: string,
  context: ReturnType<typeof getAssistantContext>,
  request?: AssistantRequest,
): AssistantDecision | null {
  const text = message.toLowerCase()
  const wantsEmail = matches(text, ['email', 'mail'])
  const wantsText = matches(text, ['text', 'sms', 'message'])
  if (!wantsEmail && !wantsText) return null

  const lead = findMentionedLead(message, context.leads) ?? (request ? resolveConversationLead(request, context) : null)
  if (!lead) {
    return {
      intent: 'clarification_request',
      targetRoute: null,
      targetId: null,
      highlight: false,
      voiceResponse: 'Who should I send that to?',
      confidence: 0.55,
      clarificationQuestion: 'Which lead should I contact?',
      communication: null,
    }
  }

  const body = extractRequestedMessage(message) ?? defaultContactMessage(lead.name)

  if (wantsEmail) {
    return {
      intent: 'send_email',
      targetRoute: '/people',
      targetId: lead.highlightId,
      highlight: true,
      voiceResponse: `I can send that email to ${lead.name}.`,
      confidence: 0.78,
      clarificationQuestion: null,
      communication: {
        channel: 'email',
        leadId: lead.id,
        recipientName: lead.name,
        recipientEmail: lead.email,
        recipientPhone: lead.phone,
        subject: `Following up, ${lead.name}`,
        body,
        deliveryStatus: 'pending',
        messageId: null,
        launchHref: null,
        error: null,
      },
    }
  }

  return {
    intent: 'send_text_message',
    targetRoute: '/people',
    targetId: lead.highlightId,
    highlight: true,
    voiceResponse: `I can send that text to ${lead.name}.`,
    confidence: 0.78,
    clarificationQuestion: null,
    communication: {
      channel: 'sms',
      leadId: lead.id,
      recipientName: lead.name,
      recipientEmail: lead.email,
      recipientPhone: lead.phone,
      subject: null,
      body,
      deliveryStatus: 'pending',
      messageId: null,
      launchHref: null,
      error: null,
    },
  }
}

function findMentionedLead(
  message: string,
  leads: ReturnType<typeof getAssistantContext>['leads'],
) {
  const normalized = normalizeForSearch(message)
  const candidates = searchCandidates(normalized)
  return leads.find((lead) => {
    const name = normalizeForSearch(lead.name)
    const parts = name.split(' ').filter(Boolean)
    return normalized.includes(name) ||
      candidates.some((candidate) => isCloseMatch(candidate, name, 2)) ||
      parts.some((part) => part.length > 2 && (
        normalized.includes(part) ||
        candidates.some((candidate) => isCloseMatch(candidate, part, part.length > 5 ? 2 : 1))
      ))
  })
}

function extractRequestedMessage(message: string) {
  const patterns = [
    /\b(?:that|saying|says|say|with message)\s+["“]?(.+?)["”]?$/i,
    /:\s*["“]?(.+?)["”]?$/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)?.[1]?.trim()
    if (match) return cleanQuotedText(match)
  }

  return null
}

function defaultContactMessage(name: string) {
  return `Hi ${firstName(name)}, I wanted to follow up on your home search. Are you available for a quick conversation today?`
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there'
}

function normalizeForSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function fuzzyIncludes(text: string, terms: string[]) {
  const normalized = normalizeForSearch(text)
  const candidates = searchCandidates(normalized)

  return terms.some((term) => {
    const normalizedTerm = normalizeForSearch(term)
    const compactTerm = normalizedTerm.replace(/\s/g, '')
    return normalized.includes(normalizedTerm) ||
      normalized.replace(/\s/g, '').includes(compactTerm) ||
      candidates.some((candidate) => isCloseMatch(candidate, compactTerm, compactTerm.length > 8 ? 2 : 1))
  })
}

function searchCandidates(normalized: string) {
  const tokens = normalized.split(' ').filter(Boolean)
  const adjacent = tokens.slice(0, -1).map((token, index) => `${token}${tokens[index + 1]}`)
  return [...tokens, ...adjacent]
}

function isCloseMatch(value: string, target: string, maxDistance: number) {
  if (!value || !target) return false
  if (value === target || value.includes(target) || target.includes(value)) return true
  if (Math.abs(value.length - target.length) > maxDistance) return false
  return levenshteinDistance(value, target) <= maxDistance
}

function levenshteinDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      )
    }
    previous.splice(0, previous.length, ...current)
  }

  return previous[b.length]
}

function cleanQuotedText(value: string) {
  return value.replace(/^['"“”]+|['"“”]+$/g, '').trim()
}

function normalizeDecision(value: unknown): AssistantDecision {
  const candidate = value as Partial<AssistantDecision>
  const targetRoute = candidate.targetRoute && VALID_ROUTES.includes(candidate.targetRoute)
    ? candidate.targetRoute
    : null
  const intent = candidate.intent && VALID_INTENTS.includes(candidate.intent)
    ? candidate.intent
    : 'general_question'

  return withRequestDefaults({
    intent,
    targetRoute,
    targetId: typeof candidate.targetId === 'string' ? candidate.targetId : null,
    targetDate: normalizeDateString(candidate.targetDate),
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
    communication: normalizeCommunication(candidate.communication),
  }, '')
}

function normalizeDateString(value: unknown) {
  if (typeof value !== 'string') return null
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function normalizeCommunication(value: unknown): AssistantCommunication | null {
  const candidate = value as Partial<AssistantCommunication> | null
  if (!candidate || typeof candidate !== 'object') return null
  if (candidate.channel !== 'email' && candidate.channel !== 'sms') return null
  if (typeof candidate.leadId !== 'string' || !candidate.leadId.trim()) return null
  if (typeof candidate.recipientName !== 'string' || !candidate.recipientName.trim()) return null
  if (typeof candidate.body !== 'string' || !candidate.body.trim()) return null

  return {
    channel: candidate.channel,
    leadId: candidate.leadId.trim(),
    recipientName: candidate.recipientName.trim(),
    recipientEmail: typeof candidate.recipientEmail === 'string' ? candidate.recipientEmail.trim() : null,
    recipientPhone: typeof candidate.recipientPhone === 'string' ? candidate.recipientPhone.trim() : null,
    subject: typeof candidate.subject === 'string' ? candidate.subject.trim() : null,
    body: candidate.body.trim(),
    deliveryStatus: candidate.deliveryStatus ?? 'pending',
    messageId: typeof candidate.messageId === 'string' ? candidate.messageId : null,
    launchHref: typeof candidate.launchHref === 'string' ? candidate.launchHref : null,
    error: typeof candidate.error === 'string' ? candidate.error : null,
  }
}

function withRequestDefaults(decision: AssistantDecision, message: string): AssistantDecision {
  const text = message.toLowerCase()

  if (decision.intent === 'navigate_calendar') {
    const requestedConflictView = matches(text, ['conflict', 'conflicts', 'free time', 'availability'])
    return {
      ...decision,
      targetRoute: '/calendar',
      targetId: requestedConflictView
        ? 'section:calendar-conflicts'
        : decision.targetId ?? 'section:calendar',
      highlight: true,
    }
  }

  return decision
}

function highestScoreLead(data: AppData) {
  return [...data.leads].sort((a, b) => b.score - a.score)[0] ?? null
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
