import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import postmark from 'postmark'
import type { FirebaseError } from 'firebase-admin'
import {
  POSTMARK_API_TOKEN,
} from '$env/static/private'
import { addDataToHtmlTemplate } from '$lib/utils'
import { rejectionEmailTemplate } from '$lib/data/emailTemplates/rejectionEmailTemplate'
import { waitlistEmailTemplate } from '$lib/data/emailTemplates/waitlistEmailTemplate'
import { acceptEmailTemplate } from '$lib/data/emailTemplates/acceptEmailTemplate'

export const POST: RequestHandler = async ({ request, locals }) => {
  let topError
  try {
    const body = await request.json()
    try {
      const intervieweeEmail = body.email;
      const decision =  body.decision;
      console.log(decision);
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
            },
          },
        }

        let htmlBody 
        switch(decision) {
            case "rejected":
              htmlBody = addDataToHtmlTemplate(rejectionEmailTemplate, template);
              break;
            case "waitlisted":
              htmlBody = addDataToHtmlTemplate(waitlistEmailTemplate, template);
              break;
            case "accepted":
              htmlBody = addDataToHtmlTemplate(acceptEmailTemplate, template);
              break;
            default:
              htmlBody = addDataToHtmlTemplate(waitlistEmailTemplate, template);
        }

        const emailData: Data.EmailData = {
          From: 'donotreply@gbstem.org',
          To: intervieweeEmail,
          Subject: String(template.data.subject),
          HTMLBody: htmlBody,
          ReplyTo: 'contact@gbstem.org',
          MessageStream: 'outbound'
        }
        try {
          const client = new postmark.ServerClient(POSTMARK_API_TOKEN);
          client.sendEmail(emailData);

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
