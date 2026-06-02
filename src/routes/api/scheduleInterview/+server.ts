import { scheduleInterviewEmailTemplate } from '$lib/data/emailTemplates/scheduleInterviewEmailTemplate'
import { sendEmail } from '$lib/server/email'
import { addDataToHtmlTemplate } from '$lib/utils'
import { error, json } from '@sveltejs/kit'
import type { FirebaseError } from 'firebase-admin'
import type { RequestHandler } from './$types'

export interface ScheduleInterviewRequestBody {
  email: string
  name: string
  deadline: string
}

export const POST: RequestHandler = async ({ request, locals }) => {
  let topError
  try {
    const body = (await request.json()) as ScheduleInterviewRequestBody
    try {
      const intervieweeEmail = body.email
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

        const htmlBody = addDataToHtmlTemplate(
          scheduleInterviewEmailTemplate,
          template,
        )

        try {
          await sendEmail({
            to: intervieweeEmail,
            subject: String(template.data.subject),
            html: htmlBody,
          })
        } catch (mailError) {
          return json(
            { error: 'Failed to send email. Please try again later.' },
            { status: 500 },
          )
        }

        return json({ message: 'Email sent successfully.' })
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
