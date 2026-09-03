import { handleApiError, verifyAdmin } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { renderEmail } from '$lib/emails/render'
import { resolveCurrentInterviewerEmail } from '$lib/server/interviewerIdentity'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

import { z } from 'zod'

const assignInterviewSchema = z.object({
  email: z.string().email('Invalid interviewer email address'),
  // Optional: absent for a slot written before `interviewerUid` existed, in
  // which case `email` (the stored, possibly stale, interviewerEmail) is
  // used as-is. See interviewerIdentity.ts.
  interviewerUid: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  link: z.string().min(1, 'Meeting link is required'),
  interviewer: z.string().min(1, 'Interviewer name is required'),
  firstName: z.string().min(1, 'Interviewee first name is required'),
  intervieweeEmail: z.string().email('Invalid interviewee email address'),
})

export type AssignInterviewRequestBody = z.infer<typeof assignInterviewSchema>

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdmin(locals)
    const body = assignInterviewSchema.parse(await request.json())

    const interviewerEmail = await resolveCurrentInterviewerEmail(
      body.interviewerUid,
      body.email,
    )
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

    const htmlBody = renderEmail(
      'interviewScheduledEmailTemplate',
      template.data,
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
    throw handleApiError('/api/assignInterview', err)
  }
}
