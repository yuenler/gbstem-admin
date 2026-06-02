import { SENDGRID_API_TOKEN } from '$env/static/private'
import MailService, { type MailDataRequired } from '@sendgrid/mail'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  cc?: string
  replyTo?: string
}

/**
 * Sends an email using SendGrid. If SENDGRID_API_TOKEN is not set,
 * it simulates the email send and logs a warning.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, cc, replyTo } = options

  if (!SENDGRID_API_TOKEN) {
    console.warn("SENDGRID_API_TOKEN isn't set. Email sends are simulated.")
    console.log(`Email sent to: ${to} | Subject: ${subject}`)
    return
  }

  MailService.setApiKey(SENDGRID_API_TOKEN)

  const emailData: MailDataRequired = {
    from: 'donotreply@gbstem.org',
    to,
    subject,
    html,
    replyTo: replyTo || 'contact@gbstem.org',
  }

  if (cc) {
    emailData.cc = cc
  }

  try {
    await MailService.send(emailData)
    console.log(`Email sent to: ${to} | Subject: ${subject}`)
  } catch (error) {
    console.error(`Error sending email to ${to} | Subject: ${subject},`, error)
    throw error
  }
}
