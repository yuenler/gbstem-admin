jest.mock(
  'svelte/store',
  () => ({
    writable: (val: any) => ({
      subscribe: (fn: any) => {
        fn(val)
        return () => {}
      },
      set: () => {},
      update: () => {},
    }),
    readable: (val: any) => ({
      subscribe: (fn: any) => {
        fn(val)
        return () => {}
      },
    }),
    get: (store: any) => {
      let val: any
      store.subscribe((v: any) => {
        val = v
      })()
      return val
    },
  }),
  { virtual: true },
)

// Mock SvelteKit
jest.mock(
  '@sveltejs/kit',
  () => ({
    error: (status: number, message: any) => ({
      status,
      message,
      __isSvelteKitError: true,
    }),
    redirect: (status: number, location: string) => ({
      status,
      location,
      __isSvelteKitRedirect: true,
    }),
    json: (body: any, init?: any) => ({ body, init, __isSvelteKitJson: true }),
    fail: (status: number, data: any) => ({
      status,
      data,
      __isSvelteKitFail: true,
    }),
  }),
  { virtual: true },
)

// Mock lodash-es
jest.mock(
  'lodash-es',
  () => ({
    capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
    lowerCase: (str: string) => str.replace(/[-_]/g, ' ').toLowerCase(),
    at: (array: any[], index: number) => array[index],
  }),
  { virtual: true },
)

// Mock algoliasearch
const mockSearchSingleIndex = jest.fn().mockResolvedValue({ hits: [] })
jest.mock('algoliasearch', () => {
  return {
    algoliasearch: jest.fn().mockReturnValue({
      searchSingleIndex: mockSearchSingleIndex,
    }),
  }
})

// Mock firebase-admin
const mockAdminAuth = {
  verifyIdToken: jest.fn(),
  createSessionCookie: jest.fn(),
  verifySessionCookie: jest.fn(),
  getUser: jest.fn(),
  createUser: jest.fn(),
  setCustomUserClaims: jest.fn(),
  deleteUser: jest.fn(),
  generateEmailVerificationLink: jest.fn().mockResolvedValue('http://link'),
  generateVerifyAndChangeEmailLink: jest.fn().mockResolvedValue('http://link'),
  generatePasswordResetLink: jest.fn().mockResolvedValue('http://link'),
}

const mockDoc = (id = 'id123') => ({
  id,
  exists: true,
  data: () => ({
    html: 'Hello {{action.link}}',
    checkedIn: true,
    checkedInAt: { toDate: () => new Date() },
    food: {},
  }),
  get: jest.fn().mockResolvedValue({
    exists: true,
    data: () => ({
      html: 'Hello {{action.link}}',
      checkedIn: true,
      checkedInAt: { toDate: () => new Date() },
      food: {},
    }),
  }),
  update: jest.fn().mockResolvedValue(undefined),
})

const mockCollection = {
  get: jest.fn().mockResolvedValue({
    docs: [
      {
        id: 'doc1',
        data: () => ({
          expires: { toDate: () => new Date() },
          timestamps: {
            updated: { toDate: () => new Date() },
            created: { toDate: () => new Date() },
          },
          meta: {
            decision: { get: () => Promise.resolve({ data: () => ({}) }) },
          },
          attendanceList: { '1': { present: true } },
          meetingTimes: [],
          classDay1: 'Monday',
          classDay2: 'Wednesday',
          classTime1: '14:00',
          classTime2: '16:00',
          instructorFirstName: 'First',
          instructorLastName: 'Last',
          instructorEmail: 'inst@test.com',
          course: 'Math I',
          students: [],
          meetingLink: 'http://link',
          classStatuses: [],
        }),
      },
    ],
  }),
  doc: jest.fn().mockImplementation((id) => mockDoc(id)),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  add: jest.fn().mockResolvedValue({ id: 'new-mail-id' }),
}

const mockAdminDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
  doc: jest.fn().mockImplementation((id) => mockDoc(id)),
}

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
}))

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => mockAdminAuth),
}))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => mockAdminDb),
  FieldValue: {
    arrayUnion: jest.fn((...val) => val),
  },
}))

// Mock verifyToken from $lib/server/firebase
jest.mock('$lib/server/firebase', () => ({
  adminAuth: mockAdminAuth,
  adminDb: mockAdminDb,
  verifyToken: jest.fn().mockResolvedValue({ role: 'admin' }),
}))

// Mocks for firebase/app, auth, firestore, storage
jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }))
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
}))
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((...val) => val),
  Timestamp: class {
    constructor(
      public seconds: number,
      public nanoseconds: number,
    ) {}
    toDate() {
      return new Date(this.seconds * 1000)
    }
  },
}))
jest.mock('firebase/storage', () => ({ getStorage: jest.fn() }))

// Import routes
import { handle } from '../src/hooks.server'
import { load as emailVerifiedLayoutLoad } from '../src/routes/(signedIn)/(emailVerified)/+layout.server'
import { load as applicationsLoad } from '../src/routes/(signedIn)/(emailVerified)/applications/+page.server'
import { load as classesLoad } from '../src/routes/(signedIn)/(emailVerified)/classes/+page.server'
import { load as instructorFeedbackLoad } from '../src/routes/(signedIn)/(emailVerified)/instructor-feedback/+page.server'
import { load as registrationsLoad } from '../src/routes/(signedIn)/(emailVerified)/registrations/+page.server'
import { load as studentsLoad } from '../src/routes/(signedIn)/(emailVerified)/students/+page.server'
import { load as tokensLoad } from '../src/routes/(signedIn)/(emailVerified)/tokens/+page.server'
import { load as studentFeedbackLoad } from '../src/routes/(signedIn)/(emailVerified)/student-feedback/+page.server'
import { load as subRequestsLoad } from '../src/routes/(signedIn)/(emailVerified)/sub-requests/+page.server'
import { load as announcementsLoad } from '../src/routes/(signedIn)/(emailVerified)/announcements/+page.server'
import { load as userSlugLoad } from '../src/routes/(signedIn)/(emailVerified)/user/[slug]/+page.server'
import { load as signedInLayoutLoad } from '../src/routes/(signedIn)/+layout.server'
import { load as signedOutLayoutLoad } from '../src/routes/(signedOut)/+layout.server'
import {
  actions as signupActions,
  load as signupLoad,
} from '../src/routes/(signedOut)/signup/+page.server'
import { load as pageLoad } from '../src/routes/+page'
import {
  DELETE as authDELETE,
  POST as authPOST,
} from '../src/routes/api/auth/+server'

import { POST as actionPOST } from '../src/routes/api/action/+server'
import { POST as assignInterviewPOST } from '../src/routes/api/assignInterview/+server'
import { POST as decisionPOST } from '../src/routes/api/decision/+server'
import { POST as enrollPOST } from '../src/routes/api/enroll/+server'
import { POST as remindInstructorPOST } from '../src/routes/api/remindInstructor/+server'
import { POST as remindStudentsPOST } from '../src/routes/api/remindStudents/+server'
import { POST as scheduleInterviewPOST } from '../src/routes/api/scheduleInterview/+server'

describe('routes load tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('+page.ts load throws redirect', () => {
    expect(() => pageLoad()).toThrow(
      expect.objectContaining({ __isSvelteKitRedirect: true }),
    )
  })

  it('signedIn layout load redirects if no user', () => {
    expect(() => signedInLayoutLoad({ locals: { user: null } } as any)).toThrow(
      expect.objectContaining({ __isSvelteKitRedirect: true }),
    )
  })

  it('signedIn layout load returns user if present', () => {
    const res = signedInLayoutLoad({
      locals: { user: { role: 'admin' } },
    } as any)
    expect(res).toEqual({ user: { role: 'admin' } })
  })

  it('emailVerified layout load redirects if user email not verified', async () => {
    const parent = jest.fn().mockResolvedValue({})
    await expect(
      emailVerifiedLayoutLoad({
        parent,
        locals: { user: { emailVerified: false } },
      } as any),
    ).rejects.toEqual(expect.objectContaining({ __isSvelteKitRedirect: true }))
  })

  it('emailVerified layout load resolves if email verified', async () => {
    const parent = jest.fn().mockResolvedValue({})
    await expect(
      emailVerifiedLayoutLoad({
        parent,
        locals: { user: { emailVerified: true } },
      } as any),
    ).resolves.toBeUndefined()
  })

  it('signedOut layout load redirects if user logged in', () => {
    expect(() =>
      signedOutLayoutLoad({ locals: { user: { role: 'admin' } } } as any),
    ).toThrow(expect.objectContaining({ __isSvelteKitRedirect: true }))
  })

  it('signedOut layout load does not redirect if no user', () => {
    expect(
      signedOutLayoutLoad({ locals: { user: null } } as any),
    ).toBeUndefined()
  })
})

describe('applications route', () => {
  it('loads applications without search query', async () => {
    const url = new URL('http://localhost/?filter=undecided')
    const res = await applicationsLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('applications')
  })

  it('loads applications with search query', async () => {
    const url = new URL('http://localhost/?query=test')
    const res = await applicationsLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('applications')
  })
})

describe('classes route', () => {
  it('loads classes without search query', async () => {
    const url = new URL('http://localhost/?filter=Python+I')
    const res = await classesLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('classes')
  })

  it('loads classes with search query', async () => {
    const url = new URL('http://localhost/?query=test')
    const res = await classesLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('classes')
  })
})

describe('instructor-feedback route', () => {
  it('loads instructor feedback', async () => {
    const url = new URL('http://localhost/?filter=Scratch')
    const res = await instructorFeedbackLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('feedback')
  })

  it('loads instructor feedback with search query', async () => {
    const url = new URL('http://localhost/?query=test')
    const res = await instructorFeedbackLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('feedback')
  })
})

describe('registrations route', () => {
  it('loads registrations without search query', async () => {
    const url = new URL('http://localhost/?filter=enrolled')
    const res = await registrationsLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('registrations')
  })

  it('loads registrations with search query', async () => {
    const url = new URL('http://localhost/?query=test')
    const res = await registrationsLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('registrations')
  })
})

describe('students route', () => {
  it('loads students without search query', async () => {
    const url = new URL('http://localhost/?filter=submitted')
    const res = await studentsLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('registrations')
  })

  it('loads students with search query', async () => {
    const url = new URL('http://localhost/?query=test')
    const res = await studentsLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('registrations')
  })
})

describe('student-feedback route', () => {
  it('loads student feedback without search query', async () => {
    const url = new URL('http://localhost/?filter=Scratch')
    const res = await studentFeedbackLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('feedback')
  })

  it('loads student feedback with search query', async () => {
    const url = new URL('http://localhost/?query=test')
    const res = await studentFeedbackLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('feedback')
  })
})

describe('sub-requests route', () => {
  it('loads sub requests without search query', async () => {
    const url = new URL('http://localhost/?filter=Scratch')
    const res = await subRequestsLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('subRequests')
  })

  it('loads sub requests with search query', async () => {
    const url = new URL('http://localhost/?query=test')
    const res = await subRequestsLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('subRequests')
  })
})

describe('announcements route', () => {
  it('loads announcements', async () => {
    const url = new URL('http://localhost/')
    const res = await announcementsLoad({ url, depends: jest.fn() } as any)
    expect(res).toHaveProperty('announcements')
  })
})

describe('tokens route', () => {
  it('loads tokens for admin user', async () => {
    const res = await tokensLoad({
      depends: jest.fn(),
      locals: { user: { role: 'admin' } },
      url: new URL('http://localhost/'),
    } as any)
    expect(res).toHaveProperty('tokens')
  })

  it('throws error for non-admin user', async () => {
    await expect(
      tokensLoad({
        depends: jest.fn(),
        locals: { user: { role: 'instructor' } },
        url: new URL('http://localhost/'),
      } as any),
    ).rejects.toEqual(expect.objectContaining({ __isSvelteKitError: true }))
  })
})

describe('user slug page load', () => {
  it('loads user data if hhid exists', async () => {
    const res = await userSlugLoad({ params: { slug: 'slug123' } } as any)
    expect(res).toHaveProperty('applicant')
  })
})

describe('signup load and actions', () => {
  it('signup load redirects to signin if no token', async () => {
    const url = new URL('http://localhost/')
    await expect(signupLoad({ url } as any)).rejects.toEqual(
      expect.objectContaining({ __isSvelteKitRedirect: true }),
    )
  })

  it('signup load returns token if token is valid', async () => {
    const url = new URL('http://localhost/?token=token123')
    const res = await signupLoad({ url } as any)
    expect(res).toEqual({ token: 'token123' })
  })

  it('signup default action creates user successfully', async () => {
    const mockFormData = new Map<string, any>([
      ['email', 'test@test.com'],
      ['first-name', 'John'],
      ['last-name', 'Doe'],
      ['password', 'pass123'],
      ['confirm-password', 'pass123'],
      ['token', 'token123'],
    ])
    const mockRequest = {
      formData: jest.fn().mockResolvedValue({
        get: (key: string) => mockFormData.get(key),
      }),
    }
    mockAdminAuth.createUser.mockResolvedValue({ uid: 'newUid123' })

    const res = await signupActions.default({
      request: mockRequest as any,
    } as any)
    expect(res).toEqual({ success: true })
  })
})

describe('API routes POST endpoints', () => {
  let mockRequest: any

  beforeEach(() => {
    mockRequest = {
      json: jest.fn(),
    }
  })

  it('actionPOST verifyEmail successfully', async () => {
    mockRequest.json.mockResolvedValue({
      type: 'verifyEmail',
      email: 'test@test.com',
    })
    const res = await actionPOST({
      request: mockRequest as any,
      locals: { user: { email: 'test@test.com' } },
    } as any)
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })

  it('actionPOST changeEmail successfully', async () => {
    mockRequest.json.mockResolvedValue({
      type: 'changeEmail',
      newEmail: 'new@test.com',
    })
    const res = await actionPOST({
      request: mockRequest as any,
      locals: { user: { email: 'old@test.com' } },
    } as any)
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })

  it('actionPOST resetPassword successfully', async () => {
    mockRequest.json.mockResolvedValue({
      type: 'resetPassword',
      email: 'test@test.com',
    })
    const res = await actionPOST({
      request: mockRequest as any,
      locals: { user: null },
    } as any)
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })

  it('assignInterviewPOST successfully', async () => {
    mockRequest.json.mockResolvedValue({
      email: 'interviewer@test.com',
      date: '2026-06-01',
      link: 'http://zoom',
      interviewer: 'Interviewer',
      firstName: 'Interviewee',
      intervieweeEmail: 'interviewee@test.com',
    })
    const res = await assignInterviewPOST({
      request: mockRequest as any,
      locals: { user: { email: 'admin@test.com' } },
    } as any)
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })

  it('decisionPOST successfully', async () => {
    mockRequest.json.mockResolvedValue({
      applicationId: 'app123',
      likelyDecision: 'likely',
      decision: 'accepted',
      name: 'Applicant',
      email: 'app@test.com',
      notes: 'notes',
    })
    const res = await decisionPOST({
      request: mockRequest as any,
      locals: { user: { email: 'admin@test.com' } },
    } as any)
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })

  it('enrollPOST successfully', async () => {
    mockRequest.json.mockResolvedValue({
      email: 'student@test.com',
      firstName: 'StudentFirst',
      instructor: 'InstructorName',
      instructorEmail: 'inst@test.com',
      classTimes: ['14:00', '16:00'],
      classDays: ['Monday', 'Wednesday'],
      course: 'Math',
      studentName: 'StudentFull',
      online: true,
    })
    const res = await enrollPOST({
      request: mockRequest as any,
      locals: { user: { email: 'admin@test.com' } },
    } as any)
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })

  it('remindInstructorPOST successfully', async () => {
    mockRequest.json.mockResolvedValue({
      name: 'Instructor',
      email: 'inst@test.com',
      class: 'Math',
      classTime: 'Monday at 2:00 PM',
      otherInstructorEmails: '',
    })
    const res = await remindInstructorPOST({
      request: mockRequest as any,
      locals: { user: { email: 'admin@test.com' } },
    } as any)
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })

  it('remindStudentsPOST successfully', async () => {
    mockRequest.json.mockResolvedValue({
      name: 'Student',
      email: 'student@test.com',
      instructorName: 'Instructor',
      instructorEmail: 'inst@test.com',
      otherInstructorEmails: '',
      class: 'Math',
      classTime: 'Monday at 2:00 PM',
    })
    const res = await remindStudentsPOST({
      request: mockRequest as any,
      locals: { user: { email: 'admin@test.com' } },
    } as any)
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })

  it('scheduleInterviewPOST successfully', async () => {
    mockRequest.json.mockResolvedValue({
      email: 'app@test.com',
      link: 'http://schedule',
      name: 'Applicant',
    })
    const res = await scheduleInterviewPOST({
      request: mockRequest as any,
      locals: { user: { email: 'admin@test.com' } },
    } as any)
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })
})

describe('hooks.server.ts handle', () => {
  let event: any
  let resolve: any

  beforeEach(() => {
    event = {
      cookies: {
        get: jest.fn(),
      },
      locals: {},
    }
    resolve = jest.fn().mockResolvedValue('resolved-response')
  })

  it('resolves handle successfully for admin', async () => {
    event.cookies.get.mockReturnValue('sessionCookie123')
    mockAdminAuth.verifySessionCookie.mockResolvedValue({ uid: 'uid123' })
    mockAdminAuth.getUser.mockResolvedValue({
      uid: 'uid123',
      email: 'admin@test.com',
      emailVerified: true,
      customClaims: { role: 'admin' },
    })

    const res = await handle({ event, resolve } as any)
    expect(res).toBe('resolved-response')
    expect(event.locals.user).toEqual({
      uid: 'uid123',
      email: 'admin@test.com',
      emailVerified: true,
      role: 'admin',
    })
  })

  it('redirects user if role is instructor', async () => {
    event.cookies.get.mockReturnValue('sessionCookie123')
    mockAdminAuth.verifySessionCookie.mockResolvedValue({ uid: 'uid123' })
    mockAdminAuth.getUser.mockResolvedValue({
      uid: 'uid123',
      email: 'inst@test.com',
      emailVerified: true,
      customClaims: { role: 'instructor' },
    })

    await expect(handle({ event, resolve } as any)).rejects.toEqual(
      expect.objectContaining({
        __isSvelteKitRedirect: true,
        location: 'https://portal.gbstem.org',
      }),
    )
  })

  it('sets user to null on verification error', async () => {
    event.cookies.get.mockReturnValue('sessionCookie123')
    mockAdminAuth.verifySessionCookie.mockRejectedValue(
      new Error('verification failed'),
    )

    const res = await handle({ event, resolve } as any)
    expect(res).toBe('resolved-response')
    expect(event.locals.user).toBeNull()
  })
})

describe('api/auth', () => {
  let mockCookies: any
  let mockRequest: any

  beforeEach(() => {
    mockCookies = {
      set: jest.fn(),
      delete: jest.fn(),
    }
    mockRequest = {
      json: jest.fn(),
    }
  })

  it('POST authenticates user and sets session cookie', async () => {
    mockRequest.json.mockResolvedValue({ idToken: 'idToken123' })
    mockAdminAuth.verifyIdToken.mockResolvedValue({
      auth_time: new Date().getTime() / 1000 - 10,
    })
    mockAdminAuth.createSessionCookie.mockResolvedValue('sessionCookieVal')

    const res = await authPOST({
      request: mockRequest,
      cookies: mockCookies,
    } as any)
    expect(mockCookies.set).toHaveBeenCalledWith(
      '__session',
      'sessionCookieVal',
      expect.any(Object),
    )
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })

  it('POST throws error if sign in is not recent', async () => {
    mockRequest.json.mockResolvedValue({ idToken: 'idToken123' })
    mockAdminAuth.verifyIdToken.mockResolvedValue({
      auth_time: new Date().getTime() / 1000 - 1000,
    })

    await expect(
      authPOST({ request: mockRequest, cookies: mockCookies } as any),
    ).rejects.toEqual(expect.objectContaining({ __isSvelteKitError: true }))
  })

  it('DELETE logs out user and deletes cookie', async () => {
    const res = await authDELETE({ cookies: mockCookies } as any)
    expect(mockCookies.delete).toHaveBeenCalledWith(
      '__session',
      expect.any(Object),
    )
    expect(res).toEqual(expect.objectContaining({ __isSvelteKitJson: true }))
  })
})
