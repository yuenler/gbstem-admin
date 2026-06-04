import { inPersonClassEnrolledEmailTemplate } from '$lib/data/emailTemplates/inPersonClassEnrolledEmailTemplate'
import { onlineClassEnrolledEmailTemplate } from '$lib/data/emailTemplates/onlineClassEnrolledEmailTemplate'
import { verifyAdmin, handleApiError } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { addDataToHtmlTemplate, formatTime24to12 } from '$lib/utils'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export interface EnrollRequestBody {
  email: string
  firstName: string
  instructor: string
  instructorEmail: string
  classTimes: string[]
  classDays: string[]
  course: string
  studentName: string
  meetingLink: string
  online: boolean
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdmin(locals)
    const body = (await request.json()) as EnrollRequestBody

    // Validate required fields
    if (
      !body.email ||
      !body.firstName ||
      !body.instructor ||
      !body.instructorEmail ||
      !body.classTimes ||
      !body.classDays ||
      !body.course ||
      !body.studentName
    ) {
      throw new Error('Missing required fields in request body.')
    }

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
    throw handleApiError(err)
  }
}
