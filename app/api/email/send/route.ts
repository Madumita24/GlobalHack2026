import { NextResponse } from 'next/server'
import { SesEmailConfigurationError, sendLeadEmail } from '@/lib/email/ses'
import { getEmailErrorMessage } from '@/lib/email/errors'

type EmailSendRequest = {
  to?: unknown
  recipientName?: unknown
  subject?: unknown
  body?: unknown
  actionId?: unknown
}

export async function POST(request: Request) {
  let payload: EmailSendRequest

  try {
    payload = (await request.json()) as EmailSendRequest
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid email payload.' }, { status: 400 })
  }

  const to = asCleanString(payload.to)
  const subject = decodePossiblyEncodedText(asCleanString(payload.subject))
  const body = decodePossiblyEncodedText(asCleanString(payload.body))
  const recipientName = asCleanString(payload.recipientName)
  const actionId = asCleanString(payload.actionId)

  if (!to || !isLikelyEmail(to)) {
    return NextResponse.json({ ok: false, error: 'A valid recipient email is required.' }, { status: 400 })
  }

  if (!subject) {
    return NextResponse.json({ ok: false, error: 'Email subject is required.' }, { status: 400 })
  }

  if (!body) {
    return NextResponse.json({ ok: false, error: 'Email body is required.' }, { status: 400 })
  }

  try {
    const result = await sendLeadEmail({
      to,
      recipientName,
      subject,
      body,
      actionId,
    })

    return NextResponse.json({ ok: true, messageId: result.messageId })
  } catch (error) {
    const message = getEmailErrorMessage(error)
    const status = error instanceof SesEmailConfigurationError ? 500 : 502
    console.error('[SES] Email send failed:', message)
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

function asCleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : undefined
}

function decodePossiblyEncodedText(value?: string) {
  if (!value) return undefined
  if (!/%[0-9A-Fa-f]{2}|\+/.test(value)) return value

  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value.replace(/\+/g, ' ')
  }
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
