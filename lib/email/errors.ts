import { SesEmailConfigurationError } from '@/lib/email/ses'

export function getEmailErrorMessage(error: unknown) {
  if (error instanceof SesEmailConfigurationError) return error.message
  if (error instanceof Error) {
    if (isSesIdentityVerificationError(error.message)) {
      return getSesRejectionMessage(error.message)
    }

    if (error.name === 'AccessDeniedException') {
      return 'AWS denied SES send access for the configured IAM user.'
    }

    if (error.name === 'MessageRejected') {
      return getSesRejectionMessage(error.message)
    }

    return error.message || 'Email could not be sent through SES.'
  }

  return 'Email could not be sent through SES.'
}

function getSesRejectionMessage(message: string) {
  if (isSesIdentityVerificationError(message)) {
    return [
      'SES blocked this email because the sender or recipient is not verified in us-east-1.',
      'If your SES account is still in sandbox mode, verify the recipient email too, or request SES production access.',
    ].join(' ')
  }

  return message || 'SES rejected the message. Check sender and recipient verification.'
}

function isSesIdentityVerificationError(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('not verified') ||
    (normalized.includes('identity') && normalized.includes('failed the check')) ||
    normalized.includes('identities failed the check')
  )
}
