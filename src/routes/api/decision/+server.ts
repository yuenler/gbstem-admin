import { handleApiError, verifyAdminOrReviewer } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { renderEmail } from '$lib/emails/render'
import { resolveApplicantEmail } from '$lib/server/applicantIdentity'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

import { z } from 'zod'

// `applicantUid` is the application document's id. `email` is the legacy form
// the applicant typed on their application, which goes stale the moment they
// change their account address; it stays only for browser sessions loaded
// before the uid migration and is logged as `[legacy-email-fallback]` whenever
// it is used - see notes/EMAIL_TO_UID_AUDIT.md section 7, Phase 4.
const decisionSchema = z
  .object({
    applicantUid: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    decision: z.enum(['rejected', 'waitlisted', 'substitute', 'accepted']),
    name: z.string().min(1, 'Name is required'),
  })
  .refine((data) => Boolean(data.applicantUid || data.email), {
    message: 'Either applicantUid or email is required',
    path: ['applicantUid'],
  })

export type DecisionRequestBody = z.infer<typeof decisionSchema>

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdminOrReviewer(locals)
    const body = decisionSchema.parse(await request.json())

    const intervieweeEmail = await resolveApplicantEmail(
      body.applicantUid,
      body.email,
      '/api/decision',
    )
    if (!intervieweeEmail) {
      return json(
        { error: 'Applicant email could not be resolved' },
        { status: 400 },
      )
    }
    const decision = body.decision

    const template = {
      name: 'decision',
      data: {
        subject: 'gbSTEM Instructor Decision',
        app: {
          firstName: body.name,
          name: 'Portal',
          link: 'https://portal.gbstem.org',
          orientation: 'Thursday, March 5th at 7:00 PM EST',
          orientationLink: 'https://mit.zoom.us/j/95024505441',
        },
      },
    }

    let htmlBody
    switch (decision) {
      case 'rejected':
        htmlBody = renderEmail('rejectionEmailTemplate', template.data)
        break
      case 'waitlisted':
        htmlBody = renderEmail('waitlistEmailTemplate', template.data)
        break
      case 'substitute':
        htmlBody = renderEmail('subEmailTemplate', template.data)
        break
      case 'accepted':
        htmlBody = renderEmail('acceptEmailTemplate', template.data)
        break
      default:
        htmlBody = renderEmail('waitlistEmailTemplate', template.data)
    }

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
    throw handleApiError('/api/decision', err)
  }
}
