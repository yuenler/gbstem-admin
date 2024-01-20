import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { adminDb } from '$lib/server/firebase'
import { ALGOLIA_APP_ID, ALGOLIA_PRIVATE_KEY } from '$env/static/private'
import algoliasearch from 'algoliasearch'
// import { db } from '$lib/client/firebase'

export const load = (async ({ url, depends }) => {
  depends('app:applications')
  const query = url.searchParams.get('query')
  if (query === null || query === '') {
    const updated = url.searchParams.get('updated')
    const filter = url.searchParams.get('filter')
    try {
      let dbQuery;
      // if (filter === 'decided') {
      //   dbQuery = updated
      //     ? adminDb
      //       .collection('applications')
      //       .where('meta.submitted', '==', true)
      //       .orderBy('timestamps.updated')
      //       .orderBy('meta.decision')
      //       .where('meta.decision', '!=', null)
      //       .startAfter(new Date(updated))
      //     : adminDb
      //       .collection('applications')
      //       .where('meta.submitted', '==', true)
      //       .orderBy('meta.decision')
      //       .where('meta.decision', '!=', false)
      //       .orderBy('timestamps.updated')
      // }
      // else

      const collectionName = 'applicationsSpring24'
      if (filter === 'undecided') {
        dbQuery = updated
          ? adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
            .orderBy('timestamps.updated', 'desc')
            .orderBy('meta.decision')
            .where('meta.decision', '==', null)
            .startAfter(new Date(updated))
          : adminDb
            .collection(collectionName)
            .where('meta.submitted', '==', true)
            .orderBy('meta.decision')
            .where('meta.decision', '==', null)
            .orderBy('timestamps.updated', 'desc')
      }
      else {
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


      const snapshot = await dbQuery.limit(25).get()


      // const snapshot = await dbQuery.get()


      const decisions = (
        await Promise.all(
          snapshot.docs.map((doc) => {
            const decision = (doc.data() as Data.Application<'server'>).meta
              .decision
            return decision ? decision.get() : null
          }),
        )
      ).map((doc) =>
        doc ? (doc.data() as { type: Data.Decision, likelyDecision: string, notes: string }) : null,
      )



      return {
        applications: snapshot.docs.map((doc, i) => {
          const data = doc.data() as Data.Application<'server'>
          return {
            id: doc.id,
            values: {
              ...data,
              meta: {
                ...data.meta,
                decision: decisions.at(i),
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
      const index = client.initIndex('portal_applications')
      const { hits } = await index.search<
        Omit<Data.Application<'server'>, 'meta' | 'timestamps'> & {
          meta: {
            id: string
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
        applications: hits.map((hit, i) => {
          return {
            id: hit.objectID,
            values: {
              personal: hit.personal,
              academic: hit.academic,
              program: hit.program,
              essay: hit.essay,
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
