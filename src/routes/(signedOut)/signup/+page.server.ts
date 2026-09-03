import { sendEmail } from '$lib/server/email'
import { adminAuth, adminDb, verifyToken } from '$lib/server/firebase'
import { renderEmail } from '$lib/emails/render'
import { error, fail, redirect } from '@sveltejs/kit'
import type { FirebaseError } from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { Actions, PageServerLoad } from './$types'

export const load = (async ({ url }) => {
  const token = url.searchParams.get('token')
  if (token) {
    let state
    try {
      await verifyToken(token)
      return {
        token,
      }
    } catch (err) {
      state = err as 'consumed' | 'expired' | 'fake' | 'unknown'
    }
    switch (state) {
      case 'consumed': {
        throw error(403, {
          message:
            'Token already consumed. If this token was meant specifically for your account, immediately contact an admin with this message.',
        })
      }
      case 'expired': {
        throw error(403, {
          message:
            'Token has expired. If you need a new token, contact an admin.',
        })
      }
      case 'fake': {
        throw redirect(301, '/signin')
      }
      case 'unknown': {
        throw error(400, {
          message: 'Something went wrong. Please try again.',
        })
      }
    }
  }
  throw redirect(301, '/signin')
}) satisfies PageServerLoad

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData()
    const values = {
      email: formData.get('email') as string,
      firstName: (formData.get('first-name') as string).trim(),
      lastName: (formData.get('last-name') as string).trim(),
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirm-password') as string,
    }
    const token = formData.get('token') as string
    try {
      const { role } = await verifyToken(token)
      let uid: string
      try {
        ;({ uid } = await adminAuth.createUser({
          email: values.email,
          password: values.password,
          displayName: `${values.firstName} ${values.lastName}`,
        }))
      } catch (err) {
        return fail(400, {
          error: (err as FirebaseError).message,
        })
      }
      // Everything past account creation shares one rollback: a half-created
      // account is worse than no account. Mirrors portal's signup, which also
      // writes the `users` document so both sites produce identical records.
      try {
        await adminAuth.setCustomUserClaims(uid, { role })
        await adminDb.collection('users').doc(uid).set({
          role,
          firstName: values.firstName,
          lastName: values.lastName,
        })
        await adminDb
          .collection('tokens')
          .doc(token)
          .update({
            consumers: FieldValue.arrayUnion(uid),
          })
      } catch (err) {
        console.error('Signup error, rolling back account:', err)
        await adminAuth
          .deleteUser(uid)
          .catch((delErr) =>
            console.error('Error rolling back auth user:', delErr),
          )
        return fail(400, {
          error: 'Account setup failed. Please try again.',
        })
      }
      // Deliberately non-fatal: a mail hiccup must not destroy an otherwise
      // good account. The user can request a new verification email later,
      // but the `emailWarning` flag lets the client tell them the first one
      // never went out, since a silent failure leaves them trusting an email
      // that was never sent.
      try {
        const link = await adminAuth.generateEmailVerificationLink(values.email)
        const template = {
          name: 'action',
          data: {
            subject: 'Verify Email for gbSTEM Account',
            action: {
              link,
              name: 'Verify Email',
              description:
                'Please verify your email for your gbSTEM account by clicking the button below.',
            },
            app: {
              name: 'Admin',
              link: 'https://admin.gbstem.org',
            },
          },
        }

        const htmlBody = renderEmail('actionEmailTemplate', template.data)

        await sendEmail({
          to: values.email,
          subject: template.data.subject,
          html: htmlBody,
        })
      } catch (err) {
        console.error('Signup verification email error:', err)
        return { success: true, emailWarning: true }
      }
      return { success: true }
    } catch (err) {
      const state = err as 'consumed' | 'expired' | 'fake' | 'unknown'
      switch (state) {
        case 'consumed': {
          return fail(400, {
            error:
              'Token already consumed. If this token was meant specifically for your account, immediately contact an admin with this message.',
          })
        }
        case 'expired': {
          return fail(400, {
            error:
              'Token has expired. If you need a new token, contact an admin.',
          })
        }
        case 'fake':
        case 'unknown': {
          return fail(400, {
            error: 'Something went wrong. Please try again.',
          })
        }
      }
    }
  },
} satisfies Actions
