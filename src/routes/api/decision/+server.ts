import { handleApiError, verifyAdminOrReviewer } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { renderEmail } from '$lib/emails/render'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

import { z } from 'zod'

const decisionSchema = z.object({
  email: z.string().email('Invalid email address'),
  decision: z.enum(['rejected', 'waitlisted', 'substitute', 'accepted']),
  name: z.string().min(1, 'Name is required'),
})

export type DecisionRequestBody = z.infer<typeof decisionSchema>

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    verifyAdminOrReviewer(locals)
    const body = decisionSchema.parse(await request.json())

    const intervieweeEmail = body.email
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
