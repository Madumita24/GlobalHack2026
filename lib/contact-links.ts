import type { Lead } from '@/types/lead'
import type { Property } from '@/types/property'

export function buildTelHref(phone: string) {
  return `tel:${normalizePhone(phone)}`
}

export function buildSmsHref(lead: Lead, message?: string) {
  const body = encodeURIComponent(message ?? defaultLeadMessage(lead))
  return `sms:${normalizePhone(lead.phone)}?body=${body}`
}

export function buildMailtoHref(lead: Lead, subject?: string, body?: string) {
  const params = [
    ['subject', subject ?? `Following up from Lofty`],
    ['body', body ?? defaultLeadMessage(lead)],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')

  return `mailto:${lead.email}?${params.toString()}`
}

export function defaultLeadMessage(lead: Lead) {
  return `Hi ${firstName(lead.name)}, I wanted to follow up on your home search. Are you available for a quick conversation today?`
}

export function listingMessage(lead: Lead, property: Property) {
  return `Hi ${firstName(lead.name)}, I found a property that looks like a strong match for you: ${property.address}, ${property.city}. It has ${property.beds} bedrooms, ${property.baths} baths, and is listed at $${property.price.toLocaleString()}. Want me to send over more details?`
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/\D/g, '')}`
  return trimmed.replace(/\D/g, '')
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there'
}
