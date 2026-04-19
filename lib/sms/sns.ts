import 'server-only'

import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'

export type SendLeadSmsInput = {
  to: string
  body: string
}

export class SmsConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SmsConfigurationError'
  }
}

const region = process.env.AWS_REGION ?? 'us-east-1'
const sns = new SNSClient({ region })

export async function sendLeadSms(input: SendLeadSmsInput) {
  const phoneNumber = normalizeSmsPhoneNumber(input.to)

  if (!phoneNumber) {
    throw new SmsConfigurationError('A valid E.164 phone number is required for SMS sending.')
  }

  const result = await sns.send(
    new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: input.body,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: process.env.SNS_SMS_TYPE?.trim() || 'Transactional',
        },
        ...(process.env.SNS_SMS_SENDER_ID?.trim()
          ? {
              'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: process.env.SNS_SMS_SENDER_ID.trim().slice(0, 11),
              },
            }
          : {}),
      },
    }),
  )

  return {
    messageId: result.MessageId,
    phoneNumber,
  }
}

function normalizeSmsPhoneNumber(phone: string) {
  const trimmed = phone.trim()

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
  }

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
}
