import { scheduleInterviewEmailTemplate } from '$lib/data/emailTemplates/scheduleInterviewEmailTemplate'
import { verifyAdmin, handleApiError } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { addDataToHtmlTemplate } from '$lib/utils'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export interface ScheduleInterviewRequestBody {
  email: string
  name: string
  deadline: string
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdmin(locals)
    const body = (await request.json()) as ScheduleInterviewRequestBody

    const intervieweeEmail = body.email

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
  } catch (err) {
    throw handleApiError(err)
  }
}
