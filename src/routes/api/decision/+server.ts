import { acceptEmailTemplate } from '$lib/data/emailTemplates/acceptEmailTemplate'
import { rejectionEmailTemplate } from '$lib/data/emailTemplates/rejectionEmailTemplate'
import { subEmailTemplate } from '$lib/data/emailTemplates/subEmailTemplate'
import { waitlistEmailTemplate } from '$lib/data/emailTemplates/waitlistEmailTemplate'
import { sendEmail } from '$lib/server/email'
import { addDataToHtmlTemplate } from '$lib/utils'
import { error, json } from '@sveltejs/kit'
import type { FirebaseError } from 'firebase-admin'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals }) => {
  let topError
  try {
    const body = await request.json()
    try {
      const intervieweeEmail = body.email
      const decision = body.decision
      if (locals.user === null) {
        throw error(400, 'User not signed in.')
      } else {
        const template = {
          name: 'decision',
          data: {
            subject: 'gbSTEM Instructor Decision',
            app: {
              firstName: body.name,
              name: 'Portal',
              link: 'https://portal.gbstem.org',
              orientation: 'Thursday, March 5th at 7:00 PM EST',
              orientationLink: 'https://mit.zoom.us/j/95024505441',
            },
          },
        }

        let htmlBody
        switch (decision) {
          case 'rejected':
            htmlBody = addDataToHtmlTemplate(rejectionEmailTemplate, template)
            break
          case 'waitlisted':
            htmlBody = addDataToHtmlTemplate(waitlistEmailTemplate, template)
            break
          case 'substitute':
            htmlBody = addDataToHtmlTemplate(subEmailTemplate, template)
            break
          case 'accepted':
            htmlBody = addDataToHtmlTemplate(acceptEmailTemplate, template)
            break
          default:
            htmlBody = addDataToHtmlTemplate(waitlistEmailTemplate, template)
        }

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
