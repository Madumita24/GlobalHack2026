import type { RecommendedAction } from '@/types/action'
import type { Lead } from '@/types/lead'
import type { Property } from '@/types/property'

export function getBriefingScript(
  agentName: string,
  actions: RecommendedAction[],
): string {
  const firstName = agentName.split(' ')[0]

  const critical = actions.filter((a) => a.urgency === 'critical').length
  const hotLeads = actions.filter(
    (a) => (a.type === 'call' || a.type === 'text' || a.type === 'email') && a.urgency !== 'low',
  ).length
  const listings = actions.filter((a) => a.type === 'send_listing').length
  const top = actions[0]

  const parts: string[] = []
  if (critical > 0)
    parts.push(`${critical} critical deadline${critical > 1 ? 's' : ''} that need immediate attention`)
  if (hotLeads > 0)
    parts.push(`${hotLeads} high-priority lead${hotLeads > 1 ? 's' : ''} ready to engage right now`)
  if (listings > 0)
    parts.push(`${listings} property match${listings > 1 ? 'es' : ''} worth sending today`)

  const summary =
    parts.length === 0
      ? 'Your pipeline is clean today — great time to nurture your long-term leads.'
      : parts.length === 1
        ? `You have ${parts[0]}.`
        : `You have ${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}.`

  const priorityLine = top
    ? ` Your highest-impact first move is ${top.title}. ${top.summary}`
    : ''

  return `Good morning, ${firstName}. Here's what matters today. ${summary}${priorityLine} Let's make it a great day.`
}

export function getActionScript(
  action: RecommendedAction,
  lead?: Lead | null,
  property?: Property | null,
): string {
  const lines: string[] = [
    `Here's why ${action.title} is your top priority right now.`,
  ]

  action.reasons.slice(0, 3).forEach((r) => lines.push(r + '.'))

  if (property) {
    lines.push(
      `The property at ${property.address} in ${property.city} is a strong match —` +
        ` ${property.beds} beds, ${property.baths} baths, listed at $${(property.price / 1000).toFixed(0)}K.`,
    )
  }

  if (action.consequenceIfIgnored) {
    lines.push(`Keep in mind: if you skip this, ${action.consequenceIfIgnored.toLowerCase()}`)
  }

  if (action.draftMessage) {
    lines.push(`I've already drafted a message for you. Just review and hit send.`)
  }

  return lines.join(' ')
}

export function getConfirmationScript(action: RecommendedAction): string {
  const scripts: Record<RecommendedAction['type'], string> = {
    call:               'Call task marked complete. Great work.',
    text:               'Text sent and logged. Moving right along.',
    email:              'Email drafted and marked complete.',
    send_listing:       'Listing sent. Activity logged in your pipeline.',
    review_transaction: 'Transaction reviewed and checked off.',
    schedule_followup:  "Follow-up scheduled. I'll keep track of it.",
  }
  return scripts[action.type] ?? 'Done. Nice work.'
}
