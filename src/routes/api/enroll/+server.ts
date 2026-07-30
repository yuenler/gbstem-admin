import { inPersonClassEnrolledEmailTemplate } from '$lib/data/emailTemplates/inPersonClassEnrolledEmailTemplate'
import { onlineClassEnrolledEmailTemplate } from '$lib/data/emailTemplates/onlineClassEnrolledEmailTemplate'
import { handleApiError, verifyAdmin } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { addDataToHtmlTemplate, formatTime24to12 } from '$lib/utils'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

import { z } from 'zod'

const enrollSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  instructor: z.string().min(1, 'Instructor name is required'),
  instructorEmail: z.string().email('Invalid instructor email address'),
  classTimes: z.array(z.string()).min(1, 'At least one class time is required'),
  classDays: z.array(z.string()).min(1, 'At least one class day is required'),
  course: z.string().min(1, 'Course is required'),
  studentName: z.string().min(1, 'Student name is required'),
  meetingLink: z.string().optional().default(''),
  online: z.boolean(),
})

export type EnrollRequestBody = z.infer<typeof enrollSchema>

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdmin(locals)
    const body = enrollSchema.parse(await request.json())

    const classes = body.classDays.map(
      (day: string, index: number) =>
        `${day} at ${formatTime24to12(body.classTimes[index])}`,
    )
    const class1Time = classes[0]
    const class2Time = classes[1]

    const template = {
      name: 'interviewScheduled',
      data: {
        subject: `${body.course} class details for ${body.studentName}`,
        app: {
          name: 'Portal',
          link: 'https://portal.gbstem.org',
          instructor: body.instructor,
          firstName: body.firstName,
          class1Time,
          class2Time,
          meetingLink: body.meetingLink,
          course: body.course,
          instructorEmail: body.instructorEmail,
          online: body.online,
          studentName: body.studentName,
        },
      },
    }

    const emailTemplate = body.online
      ? onlineClassEnrolledEmailTemplate
      : inPersonClassEnrolledEmailTemplate

    const htmlBody = addDataToHtmlTemplate(emailTemplate, template)

    try {
      await sendEmail({
        to: body.email,
        cc: body.instructorEmail,
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
    throw handleApiError('/api/enroll', err)
  }
}
