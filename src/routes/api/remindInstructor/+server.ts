import { teachingReminderEmailTemplate } from '$lib/data/emailTemplates/teachingReminderEmailTemplate'
import { verifyAdmin, handleApiError } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { addDataToHtmlTemplate } from '$lib/utils'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export interface RemindInstructorRequestBody {
  email: string
  otherInstructorEmails: string
  name: string
  class: string
  classTime: string
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdmin(locals)
    const body = (await request.json()) as RemindInstructorRequestBody

    const email = body.email
    const otherEmails = body.otherInstructorEmails

    const template = {
      name: 'teachingReminder',
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

    const htmlBody = addDataToHtmlTemplate(
      teachingReminderEmailTemplate,
      template,
    )

    try {
      await sendEmail({
        to: email,
        cc: otherEmails,
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
