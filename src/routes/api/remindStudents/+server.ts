import { otherInstructorEmailsSchema } from '$lib/components/forms/schemas'
import { classReminderEmailTemplate } from '$lib/data/emailTemplates/classReminderEmailTemplate'
import { handleApiError, verifyAdmin } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { addDataToHtmlTemplate } from '$lib/utils'
import { json } from '@sveltejs/kit'
import { z } from 'zod'
import type { RequestHandler } from './$types'

const remindStudentsSchema = z.object({
  email: z.string().email('Invalid email address'),
  otherInstructorEmails: otherInstructorEmailsSchema,
  name: z.string().min(1, 'Name is required'),
  class: z.string().min(1, 'Class is required'),
  classTime: z.string().min(1, 'Class time is required'),
  instructorName: z.string().min(1, 'Instructor name is required'),
})

export type RemindStudentsRequestBody = z.infer<typeof remindStudentsSchema>

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdmin(locals)
    const body = remindStudentsSchema.parse(await request.json())

    const email = body.email
    const otherEmails = body.otherInstructorEmails

    const template = {
      name: 'classReminder',
      data: {
        subject: 'gbSTEM Class Reminder',
        app: {
          firstName: body.name,
          name: 'Portal',
          class: body.class,
          classTime: body.classTime,
          instructor: body.instructorName,
        },
      },
    }

    const htmlBody = addDataToHtmlTemplate(classReminderEmailTemplate, template)

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
