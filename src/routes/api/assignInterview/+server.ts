import { interviewScheduledEmailTemplate } from '$lib/data/emailTemplates/interviewScheduledEmailTemplate'
import { verifyAdmin, handleApiError } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { addDataToHtmlTemplate } from '$lib/utils'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export interface AssignInterviewRequestBody {
  email: string
  date: string
  link: string
  interviewer: string
  firstName: string
  intervieweeEmail: string
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdmin(locals)
    const body = (await request.json()) as AssignInterviewRequestBody

    const interviewerEmail = body.email
    const interviewDate = body.date
    const interviewLink = body.link
    const interviewerName = body.interviewer
    const intervieweeFirstName = body.firstName
    const intervieweeEmail = body.intervieweeEmail

    const template = {
      name: 'interviewScheduled',
      data: {
        subject: `${intervieweeFirstName}, your interview with ${interviewerName} has been scheduled`,
        app: {
          name: 'Portal',
          link: 'https://portal.gbstem.org',
        },
        interview: {
          interviewee: intervieweeFirstName,
          name: interviewerName,
          date: interviewDate,
          link: interviewLink,
        },
      },
    }

    const htmlBody = addDataToHtmlTemplate(
      interviewScheduledEmailTemplate,
      template,
    )

    try {
      await sendEmail({
        to: intervieweeEmail,
        cc: interviewerEmail,
        subject: String(template.data.subject),
        html: htmlBody,
        replyTo: interviewerEmail,
      })
    } catch (mailError) {
      return json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 },
      )
    }

    return json({ message: 'Email sent successfully.' })
  } catch (err) {
    throw handleApiError(err)
  }
}
