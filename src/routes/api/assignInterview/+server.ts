import { handleApiError, verifyAdmin } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { renderEmail } from '$lib/emails/render'
import { resolveCurrentInterviewerEmail } from '$lib/server/interviewerIdentity'
import { adminAuth } from '$lib/server/firebase'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

import { z } from 'zod'

// Both email fields are legacy: the current client sends uids only, and these
// exist solely so a browser session loaded before the uid migration keeps
// working until it ages out. Every use is logged as `[legacy-email-fallback]`;
// once that counter has read zero for several days, make both uids required and
// delete the emails - see notes/EMAIL_TO_UID_AUDIT.md section 7, Phase 4.
const assignInterviewSchema = z
  .object({
    email: z.string().email('Invalid interviewer email address').optional(),
    interviewerUid: z.string().optional(),
    date: z.string().min(1, 'Date is required'),
    link: z.string().min(1, 'Meeting link is required'),
    interviewer: z.string().min(1, 'Interviewer name is required'),
    firstName: z.string().min(1, 'Interviewee first name is required'),
    intervieweeUid: z.string().optional(),
    intervieweeEmail: z
      .string()
      .email('Invalid interviewee email address')
      .optional(),
  })
  .refine((data) => Boolean(data.interviewerUid || data.email), {
    message: 'Either interviewerUid or email is required',
    path: ['interviewerUid'],
  })
  .refine((data) => Boolean(data.intervieweeUid || data.intervieweeEmail), {
    message: 'Either intervieweeUid or intervieweeEmail is required',
    path: ['intervieweeUid'],
  })

export type AssignInterviewRequestBody = z.infer<typeof assignInterviewSchema>

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdmin(locals)
    const body = assignInterviewSchema.parse(await request.json())

    const interviewerEmail = await resolveCurrentInterviewerEmail(
      body.interviewerUid,
      body.email,
      '/api/assignInterview',
    )
    if (!interviewerEmail) {
      return json(
        { error: 'Interviewer email could not be resolved' },
        { status: 400 },
      )
    }
    const interviewDate = body.date
    const interviewLink = body.link
    const interviewerName = body.interviewer
    const intervieweeFirstName = body.firstName

    let intervieweeEmail = body.intervieweeEmail
    if (body.intervieweeUid) {
      try {
        const user = await adminAuth.getUser(body.intervieweeUid)
        if (user.email) {
          intervieweeEmail = user.email
        }
      } catch (err) {
        console.error(
          'Failed to resolve interviewee email by uid, falling back to passed email:',
          err,
        )
      }
    } else if (body.intervieweeEmail) {
      console.warn(
        '[legacy-email-fallback] /api/assignInterview: no intervieweeUid in ' +
          'payload, using the client-supplied interviewee email',
      )
    }

    if (!intervieweeEmail) {
      return json(
        { error: 'Interviewee email could not be resolved' },
        { status: 400 },
      )
    }

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
