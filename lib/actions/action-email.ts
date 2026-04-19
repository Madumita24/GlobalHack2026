import { defaultLeadMessage, listingMessage } from '@/lib/contact-links'
import type { RecommendedAction, Transaction } from '@/types/action'
import type { Lead } from '@/types/lead'
import type { Property } from '@/types/property'

export type ActionEmailPlan = {
  to: string
  recipientName: string
  subject: string
  body: string
  channelLabel: string
  note: string
}

export function buildActionEmailPlan(
  action: RecommendedAction,
  lead?: Lead | null,
  property?: Property | null,
  transaction?: Transaction | null,
): ActionEmailPlan | null {
  if (!lead?.email) return null

  if (action.type === 'send_listing') {
    return {
      to: lead.email,
      recipientName: lead.name,
      subject: property ? `Listing match: ${property.address}` : action.title,
      body: property ? listingMessage(lead, property) : action.draftMessage ?? defaultLeadMessage(lead),
      channelLabel: 'Email listing',
      note: 'Sends the matched property by email.',
    }
  }

  if (action.type === 'review_transaction') {
    const address = transaction?.address.split(',')[0] ?? 'your transaction'
    const deadline = transaction?.nextDeadlineLabel
      ? `${transaction.nextDeadlineLabel.toLowerCase()}`
      : 'the next deadline'

    return {
      to: lead.email,
      recipientName: lead.name,
      subject: `Quick update on ${address}`,
      body:
        action.draftMessage ??
        `Hi ${firstName(lead.name)}, I am reviewing ${address} today and keeping an eye on ${deadline}. I will keep things moving and let you know right away if I need anything from you.`,
      channelLabel: 'Email update',
      note: 'Sends a client-friendly transaction update by email.',
    }
  }

  if (action.type === 'schedule_followup') {
    return {
      to: lead.email,
      recipientName: lead.name,
      subject: `Confirming a time to connect`,
      body:
        action.draftMessage ??
        `Hi ${firstName(lead.name)}, I wanted to confirm a good time to follow up on your home search. Does today still work for a quick conversation?`,
      channelLabel: 'Email follow-up',
      note: 'Sends the follow-up request by email.',
    }
  }

  if (action.type === 'call') {
    return {
      to: lead.email,
      recipientName: lead.name,
      subject: `Quick follow-up from James`,
      body:
        action.draftMessage ??
        `Hi ${firstName(lead.name)}, I was going to give you a quick call, but wanted to send this first. Are you available today to talk through your home search?`,
      channelLabel: 'Call converted to email',
      note: 'Calls are not automated in this prototype, so Copilot sends an email fallback.',
    }
  }

  if (action.type === 'text') {
    return {
      to: lead.email,
      recipientName: lead.name,
      subject: `Quick note from James`,
      body:
        action.draftMessage ??
        `Hi ${firstName(lead.name)}, quick note on your home search. Are you free today to connect?`,
      channelLabel: 'Text converted to email',
      note: 'SMS stays manual for the hackathon, so Copilot sends an email fallback.',
    }
  }

  return {
    to: lead.email,
    recipientName: lead.name,
    subject: action.title,
    body: action.draftMessage ?? defaultLeadMessage(lead),
    channelLabel: 'Email',
    note: 'Sends the drafted email and logs the action.',
  }
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there'
}
