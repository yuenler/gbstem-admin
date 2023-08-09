import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { adminAuth, adminDb } from '$lib/server/firebase'
import type { FirebaseError } from 'firebase-admin'

export const POST: RequestHandler = async ({ request, locals }) => {
  let topError
  try {
    const body = await request.json()
    let to
    let data
    try {
      switch (body.type) {
        case 'verifyEmail': {
          if (locals.user === null) {
            throw 'User not signed in.'
          }
          const link = await adminAuth.generateEmailVerificationLink(
            locals.user.email,
          )
          to = locals.user.email
          data = {
            subject: 'Verify Email for HackHarvard Account',
            action: {
              link,
              name: 'Verify Email',
              description:
                'Please verify your email for your HackHarvard account by clicking the button below.',
            },
          }
          break
        }
        case 'changeEmail': {
          if (locals.user === null) {
            throw 'User not signed in.'
          }
          if (body.newEmail) {
            const link = await adminAuth.generateVerifyAndChangeEmailLink(
              locals.user.email,
              body.newEmail,
            )
            to = body.newEmail
            data = {
              subject: 'Change Email for HackHarvard Account',
              action: {
                link,
                name: 'Change Email',
                description: `Please confirm that you want to change your email from ${locals.user.email} to ${body.newEmail} by clicking the button below.`,
              },
            }
          } else {
            topError = error(400, 'Invalid request body.')
          }
          break
        }
        case 'resetPassword': {
          const link = await adminAuth.generatePasswordResetLink(body.email)
          to = body.email
          data = {
            subject: 'Reset Password for HackHarvard Account',
            action: {
              link,
              name: 'Reset Password',
              description:
                'Please reset your password for your HackHarvard account by clicking the button below.',
            },
          }
          break
        }
        default: {
          topError = error(400, 'Invalid action type.')
        }
      }
      const template = {
        name: 'action',
        data: {
          ...data,
          app: {
            name: 'Portal',
            link: 'https://portal.hackharvard.io',
          },
        },
      }
      try {
        await adminDb.collection('mail').add({
          to: [to],
          template,
        })
        return new Response()
      } catch (err) {
        topError = error(400, 'Failed to send email.')
      }
    } catch (err) {
      if (typeof err === 'string') {
        topError = error(400, err)
      } else {
        const typedErr = err as
          | FirebaseError
          | {
              errorInfo: FirebaseError
              codePrefix: string
            }
        if ('errorInfo' in typedErr) {
          topError = error(
            400,
            typedErr.errorInfo.message ||
              'Please wait a few minutes before trying again.',
          )
        } else if ('message' in typedErr) {
          topError = error(400, typedErr.message)
        } else {
          topError = error(400, 'Something went wrong. Please try again.')
        }
      }
    }
  } catch (err) {
    topError = error(400, 'Invalid request body.')
  }
  throw topError
}
