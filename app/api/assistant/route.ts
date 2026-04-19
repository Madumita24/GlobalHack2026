import { NextRequest, NextResponse } from 'next/server'
import { getAssistantDecision } from '@/lib/ai/assistant'
import { getEmailErrorMessage } from '@/lib/email/errors'
import { sendLeadEmail } from '@/lib/email/ses'
import type { AssistantConversationMessage, AssistantRequest } from '@/types/assistant'

export async function POST(req: NextRequest) {
  let body: Partial<AssistantRequest>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = String(body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const decision = await getAssistantDecision({
    message,
    currentPath: String(body.currentPath ?? '/dashboard'),
    recentExecutedActionIds: Array.isArray(body.recentExecutedActionIds)
      ? body.recentExecutedActionIds.filter((id): id is string => typeof id === 'string')
      : [],
    conversationHistory: sanitizeConversationHistory(body.conversationHistory),
  })
  const completedDecision = await completeAssistantCommunication(decision)

  return NextResponse.json(completedDecision, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

function sanitizeConversationHistory(value: unknown): AssistantConversationMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const candidate = item as Partial<AssistantConversationMessage>
      if (candidate.role !== 'user' && candidate.role !== 'assistant') return null
      const content = typeof candidate.content === 'string' ? candidate.content.trim() : ''
      if (!content) return null
      return {
        role: candidate.role,
        content: content.slice(0, 800),
      }
    })
    .filter((item): item is AssistantConversationMessage => item !== null)
    .slice(-8)
}

async function completeAssistantCommunication(decision: Awaited<ReturnType<typeof getAssistantDecision>>) {
  if (!decision.communication || decision.clarificationQuestion) return decision

  const communication = decision.communication

  if (communication.channel === 'sms') {
    if (!communication.recipientPhone) {
      return {
        ...decision,
        voiceResponse: `I could not send that text because ${communication.recipientName} does not have a phone number.`,
        communication: {
          ...communication,
          deliveryStatus: 'failed' as const,
          error: 'Missing recipient phone number.',
        },
      }
    }

    return {
      ...decision,
      voiceResponse: `I prepared a text for ${communication.recipientName}. Review it, then tap send in your messages app.`,
      communication: {
        ...communication,
        deliveryStatus: 'prepared' as const,
        launchHref: buildSmsHref(communication.recipientPhone, communication.body),
        error: null,
      },
    }
  }

  if (!communication.recipientEmail) {
    return {
      ...decision,
      voiceResponse: `I could not send that email because ${communication.recipientName} does not have an email address.`,
      communication: {
        ...communication,
        deliveryStatus: 'failed' as const,
        error: 'Missing recipient email address.',
      },
    }
  }

  try {
    const result = await sendLeadEmail({
      to: communication.recipientEmail,
      recipientName: communication.recipientName,
      subject: communication.subject ?? `Following up, ${communication.recipientName}`,
      body: communication.body,
    })

    return {
      ...decision,
      voiceResponse: `Done. I sent the email to ${communication.recipientName}.`,
      communication: {
        ...communication,
        deliveryStatus: 'sent' as const,
        messageId: result.messageId ?? null,
      },
    }
  } catch (error) {
    const message = getEmailErrorMessage(error)
    return {
      ...decision,
      voiceResponse: `I could not send that email to ${communication.recipientName}. ${message}`,
      communication: {
        ...communication,
        deliveryStatus: 'failed' as const,
        error: message,
      },
    }
  }
}

function buildSmsHref(phone: string, body: string) {
  return `sms:${normalizePhone(phone)}?body=${encodeURIComponent(body)}`
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/\D/g, '')}`
  return trimmed.replace(/\D/g, '')
}
