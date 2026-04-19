import { SmsConfigurationError } from '@/lib/sms/sns'

export function getSmsErrorMessage(error: unknown) {
  if (error instanceof SmsConfigurationError) return error.message

  if (error instanceof Error) {
    if (error.name === 'AuthorizationError' || error.name === 'AccessDeniedException') {
      return 'AWS denied SNS SMS access for the configured IAM user.'
    }

    if (error.message.toLowerCase().includes('sandbox')) {
      return 'SNS blocked this SMS because your account is in SMS sandbox mode. Verify the destination phone number or move SMS out of sandbox.'
    }

    if (error.message.toLowerCase().includes('phone')) {
      return `SNS could not send to that phone number. ${error.message}`
    }

    return error.message || 'SMS could not be sent through SNS.'
  }

  return 'SMS could not be sent through SNS.'
}
