import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import postmark from 'postmark'
import type { FirebaseError } from 'firebase-admin'
import {
  POSTMARK_API_TOKEN,
} from '$env/static/private'
import { addDataToHtmlTemplate } from '$lib/utils'
import { teachingReminderEmailTemplate } from '$lib/data/emailTemplates/teachingReminderEmailTemplate'

export const POST: RequestHandler = async ({ request, locals }) => {
  let topError
  try {
    const body = await request.json()
    try {
      const email = body.email;
      if (locals.user === null) {
        throw error(400, 'User not signed in.')
      } else {
        const template = {
          name: 'scheduleInterview',
          data: {
            subject: 'gbSTEM Class Teaching Reminder',
            app: {
              firstName: body.name,
              name: 'Portal',
              class: body.class,
              classTime: body.classTime,
            },
          },
        }

        const htmlBody = addDataToHtmlTemplate(teachingReminderEmailTemplate, template);

        const emailData: Data.EmailData = {
          From: 'donotreply@gbstem.org',
          To: email,
          Subject: String(template.data.subject),
          HTMLBody: htmlBody,
          ReplyTo: 'contact@gbstem.org',
          MessageStream: 'outbound'
        }
        try {
          const client = new postmark.ServerClient(POSTMARK_API_TOKEN);
          await client.sendEmail(emailData);

          return new Response()
        } catch (err) {
          throw error(400, 'Failed to send email.')
        }
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
