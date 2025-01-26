import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import postmark from 'postmark'
import type { FirebaseError } from 'firebase-admin'
import {
  SENDGRID_API_TOKEN,
} from '$env/static/private'
import { addDataToHtmlTemplate } from '$lib/utils'
import { scheduleInterviewEmailTemplate } from '$lib/data/emailTemplates/scheduleInterviewEmailTemplate'
import MailService, { type MailDataRequired } from '@sendgrid/mail'

export const POST: RequestHandler = async ({ request, locals }) => {
  let topError
  try {
    const body = await request.json()
    try {
      const intervieweeEmail = body.email;
      if (locals.user === null) {
        throw error(400, 'User not signed in.')
      } else {
        const template = {
          name: 'scheduleInterview',
          data: {
            subject: 'Please schedule your gbSTEM instructor interview',
            app: {
              firstName: body.name,
              name: 'Portal',
              link: 'https://portal.gbstem.org',
              deadline: body.deadline,
            },
          },
        }

        const htmlBody = addDataToHtmlTemplate(scheduleInterviewEmailTemplate, template);

        const emailData: MailDataRequired = {
          from: 'donotreply@gbstem.org',
          to: intervieweeEmail,
          subject: String(template.data.subject),
          html: htmlBody,
          replyTo: 'contact@gbstem.org',
          text: 'Schedule Interview'
        }
        MailService.setApiKey(SENDGRID_API_TOKEN)
        MailService
        .send(emailData)
        .then(() => {
          console.log('Email sent')
        })
        .catch((error) => {
          console.error(error.toString())
        })
      }
    } catch (err) {
      if (typeof err === 'string') {
        topError = error(400, err)
      } else {
        const typedErr = err as
          | FirebaseError
          | {
            errorInfo: FirebaseError
            codePrefix: string
          }
        if ('errorInfo' in typedErr) {
          topError = error(
            400,
            typedErr.errorInfo.message ||
            'Please wait a few minutes before trying again.',
          )
        } else if ('message' in typedErr) {
          topError = error(400, typedErr.message)
        } else {
          topError = error(400, 'Something went wrong. Please try again.')
        }
      }
    }
  } catch (err) {
    topError = error(400, 'Invalid request body.')
  }
  throw topError

}
