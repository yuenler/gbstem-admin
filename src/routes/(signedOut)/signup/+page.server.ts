import { adminAuth, adminDb, verifyToken } from '$lib/server/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import type { Actions, PageServerLoad } from './$types'
import { error, fail, redirect } from '@sveltejs/kit'
import type { FirebaseError } from 'firebase-admin'

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
      try {
        const { uid } = await adminAuth.createUser({
          email: values.email,
          password: values.password,
          displayName: `${values.firstName} ${values.lastName}`,
        })
        try {
          await adminAuth.setCustomUserClaims(uid, { role })
          try {
            await adminDb
              .collection('tokens')
              .doc(token)
              .update({
                consumers: FieldValue.arrayUnion(uid),
              })
            try {
              const link = await adminAuth.generateEmailVerificationLink(
                values.email,
              )
              await adminDb.collection('mail').add({
                to: [values.email],
                template: {
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
                },
              })
              return { success: true }
            } catch (err) {
              console.log(err)
            }
          } catch (err) {
            await adminAuth.deleteUser(uid)
            return fail(400, {
              error: 'Updating consumers error. Please try again.',
            })
          }
        } catch (err) {
          await adminAuth.deleteUser(uid)
          return fail(400, {
            error: 'Claim error. Please try again.',
          })
        }
      } catch (err) {
        return fail(400, {
          error: (err as FirebaseError).message,
        })
      }
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
