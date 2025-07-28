import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import MailService, { MailDataRequired } from '@sendgrid/mail'
import { SENDGRID_API_TOKEN } from '$env/static/private'
import { addDataToHtmlTemplate, formatTime24to12 } from '$lib/utils'
import { onlineClassEnrolledEmailTemplate } from '$lib/data/emailTemplates/onlineClassEnrolledEmailTemplate'
import { inPersonClassEnrolledEmailTemplate } from '$lib/data/emailTemplates/inPersonClassEnrolledEmailTemplate'

export const POST: RequestHandler = async ({ request, locals }) => {
  let topError
  try {
    const body = await request.json()

    if (locals.user === null) {
      throw error(400, 'User not signed in.')
    }

    // Validate required fields, you can add more validations as needed
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
      throw error(400, 'Missing required fields in request body.')
    }

    const classes = body.classDays.map(
      (day: string, index: number) => `${day} at ${formatTime24to12(body.classTimes[index])}`
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
        }
      },
    }

    const emailTemplate = body.online
      ? onlineClassEnrolledEmailTemplate
      : inPersonClassEnrolledEmailTemplate

    const htmlBody = addDataToHtmlTemplate(emailTemplate, template)

    const emailData: MailDataRequired = {
      to: body.email,
      cc: body.instructorEmail,
      from: 'donotreply@gbstem.org',
      subject: String(template.data.subject),
      html: htmlBody,
      replyTo: 'contact@gbstem.org',
      text: 'Class Enrollment Confirmation',
    }

    MailService.setApiKey(SENDGRID_API_TOKEN)

    try {
      await MailService.send(emailData)
      console.log('Email sent')
      return json({ message: 'Email sent successfully.' })
    } catch (mailError) {
      console.error('Error sending email:', mailError)
      return json({ error: 'Failed to send email. Please try again later.' }, { status: 500 })
    }
  } catch (err) {
    if (typeof err === 'string') {
      topError = error(400, err)
    } else if ('message' in err) {
      topError = error(400, err.message)
    } else {
      topError = error(400, 'Invalid request body or unknown error.')
    }
    throw topError
  }
}
