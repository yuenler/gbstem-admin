import { jest } from '@jest/globals'

// Mock environment variables
jest.mock('$env/dynamic/private', () => ({
  env: {
    USE_LOCAL_SEARCH: 'false',
    VITE_USE_LOCAL_SEARCH: 'false',
  },
}))

jest.mock('$env/static/private', () => ({
  ALGOLIA_APP_ID: 'real-app-id',
  ALGOLIA_PRIVATE_KEY: 'real-private-key',
}))

// Mock firebase adminDb
const mockGet = jest.fn<any>().mockResolvedValue({
  docs: [
    {
      id: 'doc1',
      data: () => ({
        name: 'Alice Smith',
        email: 'alice@example.com',
      }),
    },
    {
      id: 'doc2',
      data: () => ({
        name: 'Bob Jones',
        email: 'bob@example.com',
      }),
    },
  ],
})

const mockCollection = {
  get: mockGet,
}

jest.mock('$lib/server/firebase', () => ({
  adminDb: {
    collection: jest.fn().mockReturnValue(mockCollection),
  },
}))

// Mock algoliasearch
const mockSearchSingleIndex = jest.fn<any>()
jest.mock('algoliasearch', () => {
  return {
    algoliasearch: jest.fn().mockReturnValue({
      searchSingleIndex: mockSearchSingleIndex,
    }),
  }
})

describe('search module', () => {
  let searchIndex: any
  let originalEnv: string

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV || 'test'
    // Force NODE_ENV to not be 'test' so isTest evaluates to false in the imported module
    process.env.NODE_ENV = 'production'
    jest.resetModules()
    // Require the search module dynamically after resetting modules and setting env
    const searchModule = require('../src/lib/server/search')
    searchIndex = searchModule.searchIndex
  })

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('tries to use Algolia when configured', async () => {
    mockSearchSingleIndex.mockResolvedValueOnce({
      hits: [{ objectID: 'algolia-1', name: 'Algolia Alice' }],
    })

    const results = await searchIndex('test-collection', 'Alice')
    expect(mockSearchSingleIndex).toHaveBeenCalledWith({
      indexName: 'test-collection',
      searchParams: { query: 'Alice' },
    })
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Algolia Alice')
  })

  it('falls back to local search if Algolia fails', async () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    mockSearchSingleIndex.mockRejectedValueOnce(new Error('Algolia is down'))

    const results = await searchIndex('test-collection', 'Alice')
    expect(mockSearchSingleIndex).toHaveBeenCalled()
    expect(consoleWarnSpy).toHaveBeenCalled()

    // It fell back to local Firestore search and filtered
    expect(mockGet).toHaveBeenCalled()
    expect(results).toHaveLength(1)
    expect(results[0].objectID).toBe('doc1')
    expect(results[0].name).toBe('Alice Smith')

    consoleWarnSpy.mockRestore()
  })
})
