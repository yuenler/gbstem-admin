import { db } from '$lib/client/firebase'
import { addHours } from 'date-fns'
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore'

const tokensCollection = 'tokens'

/**
 * Service providing Data Access Layer for signup Tokens.
 */
export const tokenService = {
  /**
   * Creates a new signup token and returns its document id.
   */
  async createToken(
    role: string,
    consumable: boolean,
    expiresHours: number,
  ): Promise<string> {
    const snapshot = await addDoc(collection(db, tokensCollection), {
      role,
      consumable,
      expires: addHours(new Date(), expiresHours),
      consumers: [],
    } as Data.Token<'pojo'>)
    return snapshot.id
  },

  /**
   * Deletes a single token.
   */
  async deleteToken(tokenId: string): Promise<void> {
    await deleteDoc(doc(db, tokensCollection, tokenId))
  },

  /**
   * Deletes multiple tokens in parallel.
   */
  async deleteTokens(tokenIds: string[]): Promise<void> {
    await Promise.all(
      tokenIds.map((tokenId) => deleteDoc(doc(db, tokensCollection, tokenId))),
    )
  },
}
