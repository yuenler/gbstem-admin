import { handleApiError, verifyAuthenticated } from '$lib/server/apiHelpers'
import { sendEmail } from '$lib/server/email'
import { adminAuth, adminDb } from '$lib/server/firebase'
import { addDataToHtmlTemplate } from '$lib/utils'
import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

import { z } from 'zod'

const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('verifyEmail'),
  }),
  z.object({
    type: z.literal('changeEmail'),
    newEmail: z.string().email('Invalid email address'),
  }),
  z.object({
    type: z.literal('resetPassword'),
    email: z.string().email('Invalid email address'),
  }),
])

export type ActionRequestBody = z.infer<typeof actionSchema>

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body = actionSchema.parse(await request.json())
    let to = ''
    let data

    switch (body.type) {
      case 'verifyEmail': {
        const user = verifyAuthenticated(locals)
        const email = user.email
        const link = await adminAuth.generateEmailVerificationLink(email)
        to = email
        data = {
          subject: 'Verify Email for gbSTEM Account',
          action: {
            link,
            name: 'Verify Email',
            description:
              'Please verify your email for your gbSTEM account by clicking the button below.',
          },
        }
        break
      }
      case 'changeEmail': {
        const user = verifyAuthenticated(locals)
        if (!body.newEmail) {
          throw error(400, 'Invalid request body.')
        }
        const link = await adminAuth.generateVerifyAndChangeEmailLink(
          user.email,
          body.newEmail,
        )
        to = body.newEmail
        data = {
          subject: 'Change Email for gbSTEM Account',
          action: {
            link,
            name: 'Change Email',
            description: `Please confirm that you want to change your email from ${user.email} to ${body.newEmail} by clicking the button below.`,
          },
        }
        break
      }
      case 'resetPassword': {
        if (!body.email) {
          throw error(400, 'Email is required for password reset.')
        }
        const link = await adminAuth.generatePasswordResetLink(body.email)
        to = body.email
        data = {
          subject: 'Reset Password for gbSTEM Account',
          action: {
            link,
            name: 'Reset Password',
            description:
              'Please reset your password for your gbSTEM account by clicking the button below.',
          },
        }
        break
      }
      default: {
        throw error(400, 'Invalid action type.')
      }
    }

    const template = {
      name: 'action',
      data: {
        ...data,
        app: {
          name: 'Portal',
          link: 'https://portal.gbstem.org',
        },
      },
    }

    // get html template from firebase
    const document = await adminDb
      .collection('templates')
      .doc(template.name)
      .get()
    const html = (document.data()?.html as string) ?? ''

    // replace html template with data
    const htmlBody = addDataToHtmlTemplate(html, template)

    try {
      await sendEmail({
        to: to,
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
    throw handleApiError('/api/action', err)
  }
}
