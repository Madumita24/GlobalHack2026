import 'server-only'

import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'

export type SendLeadEmailInput = {
  to: string
  recipientName?: string
  subject: string
  body: string
  actionId?: string
}

export class SesEmailConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SesEmailConfigurationError'
  }
}

const region = process.env.AWS_REGION ?? 'us-east-1'
const ses = new SESv2Client({ region })

export async function sendLeadEmail(input: SendLeadEmailInput) {
  const fromEmail = process.env.SES_FROM_EMAIL?.trim()

  if (!fromEmail) {
    throw new SesEmailConfigurationError('Missing SES_FROM_EMAIL in .env.local')
  }

  const replyTo = process.env.SES_REPLY_TO_EMAIL?.trim()
  const configurationSetName = process.env.SES_CONFIGURATION_SET?.trim()

  const result = await ses.send(
    new SendEmailCommand({
      FromEmailAddress: fromEmail,
      Destination: {
        ToAddresses: [input.to],
      },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
      ConfigurationSetName: configurationSetName || undefined,
      Content: {
        Simple: {
          Subject: {
            Charset: 'UTF-8',
            Data: input.subject,
          },
          Body: {
            Text: {
              Charset: 'UTF-8',
              Data: input.body,
            },
            Html: {
              Charset: 'UTF-8',
              Data: renderEmailHtml(input.body),
            },
          },
        },
      },
      EmailTags: input.actionId
        ? [
            {
              Name: 'loftyActionId',
              Value: sanitizeSesTagValue(input.actionId),
            },
          ]
        : undefined,
    }),
  )

  return {
    messageId: result.MessageId,
  }
}

function renderEmailHtml(body: string) {
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;">
      <p style="margin:0;white-space:pre-line;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(body)}</p>
    </div>
  </body>
</html>`.trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeSesTagValue(value: string) {
  return value.replace(/[^\w:.-]/g, '_').slice(0, 256)
}
