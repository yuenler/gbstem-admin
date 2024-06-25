import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import { ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY } from '$env/static/private'
import algoliasearch from 'algoliasearch'
// import { db } from '$lib/client/firebase'

export const load = (async ({ url, depends }) => {
  depends('app:registrations')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const updated = url.searchParams.get('updated')
    const filter = url.searchParams.get('filter')
    try {
      let dbQuery;

      const collectionName = 'registrationsSpring24'
      if (filter === 'submitted') {
        dbQuery = updated
          ? adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
            .startAfter(new Date(updated))
          : adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
      } else if (filter === 'enrolled') {
        dbQuery = updated
          ? adminDb
            .collection(collectionName)
            .where('enrolled', '==', true)
          : adminDb
            .collection(collectionName)
            .where('enrolled', '==', true)
      } else {
        dbQuery = updated
          ? adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
            .orderBy('timestamps.updated', 'desc')
            .startAfter(new Date(updated))
          : adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
            .orderBy('timestamps.updated', 'desc')
      }


      // const snapshot = await dbQuery.limit(25).get()
      const snapshot = await dbQuery.get()

      // const snapshot = await dbQuery.get()


      return {
        registrations: snapshot.docs.map((doc) => {
          const data = doc.data() as Data.Registration<'server'>
          return {
            id: doc.id,
            values: {
              ...data,
              meta: {
                ...data.meta,
              },
              timestamps: {
                updated: data.timestamps.updated.toDate(),
                created: data.timestamps.created.toDate(),
              },
            },
          }
        }),
      }
    } catch (err) {
      console.log(err)
      throw error(400, 'Something went wrong. Please try again later.')
    }
  } else {
    try {
      const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY)
      const index = client.initIndex('registrationsSpring24')
      const { hits } = await index.search<
        Omit<Data.Registration<'server'>, 'meta' | 'timestamps'> & {
          meta: {
            hhid: string
            uid: string
            submitted: boolean
            decision: string | null
          }
          timestamps: {
            updated: Date
            created: Date
          }
        }
      >(query)
      const decisions = (
        await Promise.all(
          hits.map((hit) => {
            const decision = hit.meta.decision
            return decision ? adminDb.doc(decision).get() : null
          }),
        )
      ).map((doc) =>
        doc ? (doc.data() as { type: Data.Decision }).type : null,
      )
      return {
        query,
        registrations: hits.map((hit, i) => {
          return {
            id: hit.objectID,
            values: {
              personal: hit.personal,
              academic: hit.academic,
              program: hit.program,
              agreements: hit.agreements,
              meta: {
                ...hit.meta,
                decision: decisions.at(i),
              },
              timestamps: hit.timestamps,
            },
          }
        }),
      }
    } catch (err) {
      throw error(400, 'The search failed. Please try again later.')
    }
  }
}) satisfies PageServerLoad
