# Interview Scheduling: Availability Grid Proposal

## The problem

Setting up instructor interviews is tedious on both sides.

Interviewers (admin and reviewer roles) create interview slots **one at a time**
on the admin site — one form, one start time, one meeting link, one save, over
and over. An interviewer offering weekday afternoons and a couple of weekend
mornings across a few weeks is filling out that form dozens of times.

Candidate instructors who pass screening then see those slots on the portal as
a flat two-column list of radio buttons. There is no sense of what day it is,
no week structure, and no way to see "Tuesday afternoon" as a shape.

This document proposes replacing both ends with a when2meet-style grid:
interviewers **paint** the times they are free, candidates **pick** from a
calendar. It describes the interviewer experience first, then the candidate
experience, then the technical design, then the options we considered and set
aside.

The guiding constraint throughout: gbSTEM is maintained by a volunteer team with
high turnover. We have deliberately chosen the design that adds the least
permanent machinery, even where a more sophisticated approach was available.

---

## 1. What interviewers would see

A new **Set Your Availability** view on the admin site, alongside the existing
one-slot-at-a-time form (which stays — see §3).

**Painting availability.** A week-shaped grid: days across the top, times down
the left side, in rows the length of one interview. Click and drag to paint the
times you are free, exactly like when2meet. Painting Monday through Friday from
3:30 to 6:00, then Monday through Friday 8:00 to 9:00, then Saturday and Sunday
10:00 to 12:00 is three drags — not thirty-plus form submissions.

Above the grid:

- **Repeat these times over** — a start and end week, defaulting to the
  semester's interview window and unable to extend past it. Nobody can
  accidentally create slots in December.
- **Your meeting link** — entered once and applied to every slot generated,
  rather than retyped per slot.
- **Times shown in your local time (EDT)** — stated explicitly, because
  gbSTEM's volunteers are not all in one timezone.

Before anything is saved, a plain-language preview: _"This will create 43
interview slots per week over 5 weeks — 215 slots total."_ Interviewers see the
scale of what they are about to do and can adjust before committing.

**Reviewing and changing availability.** Below the editor, the same grid shows
what currently exists:

- **Open** cells are slots nobody has taken. Un-painting one deletes it.
- **Booked** cells show the candidate's name and are locked. They cannot be
  removed by un-painting; withdrawing a time someone has already accepted
  requires an explicit, deliberate action, because that candidate is holding a
  confirmation email for a real appointment.

That distinction is the point. Bulk editing is only safe if bulk editing cannot
quietly cancel somebody's interview.

---

## 2. What candidates would see

The portal's **Schedule Your Interview** page becomes a calendar instead of a
list of radio buttons.

Candidates see a week at a time — days across, times down — with only the times
someone is actually available shown as selectable. They can move between weeks
within the interview window, and nothing outside that window is reachable.

Clicking a time selects it; confirming books it. The confirmation names the
interviewer and shows the meeting link, as it does today. A banner states
**"Times shown in your local time (EDT)"**, so a candidate on the west coast is
never guessing whose clock a time refers to.

If two interviewers are free at the same time, the candidate sees one entry and
the system assigns the interviewer — candidates are choosing a _time_, not
shopping for a person, and showing several names per cell would clutter the grid
without helping anyone. (See §7 — this is a decision worth confirming.)

**"None of these work for me"** remains available. Candidates can still propose
a time that isn't offered, which lands in the same interview-requests list
interviewers already review. We expect this to become rare rather than
disappear; it is currently a workaround for a thin slot list, and it should
survive as a genuine escape hatch.

---

## 3. What does not change

Deliberately, quite a lot:

- **The one-at-a-time slot form stays.** It is the right tool for a one-off, and
  for fulfilling a specific candidate's requested time. The grid is added
  alongside it, not in place of it.
- **The booking confirmation flow, and the emails, are unchanged.**
- **How a candidate reaches the interview stage is unchanged** — screening still
  drives it.
- **Nothing about how slots are stored changes.** This is the core of the design
  and the reason the proposal is small. See §4.

---

## 4. Design

### 4.1 The central decision: grid for input, slots for storage

A when2meet-style _interface_ does not require when2meet-style _storage_.

The obvious reading of "let interviewers specify rules" is to persist those
rules — _Mon–Fri 15:30–18:00_ as a stored object — and resolve them into
bookable times when a candidate loads the page. That approach requires a
transactional layer to coalesce every interviewer's rules into a conflict-free
list, a server-side write path, cache invalidation when anyone edits their
availability, and careful handling of what happens when someone withdraws a rule
covering an interview that is already booked.

We propose instead that **the rules live only in the browser, during the editing
session, and are expanded into individual slot records at save time.** The
database keeps exactly what it keeps today: one document per bookable slot, in
`semesters/{semesterId}/instructorInterviewTimes`.

This is the difference between a large project and a moderate one. It means:

- No coalescing table. Slots are already discrete documents; the union across
  all interviewers _is_ the collection.
- No scheduled job and no cache invalidation. Expansion happens once,
  synchronously, when the interviewer clicks save.
- No new server-side code path, and no change to `firestore.rules`.
- No change to the `Data.InterviewSlot` shape, and no data migration.
- No new booking race. A candidate still claims exactly one document.
- **The "availability withdrawn after it was booked" problem does not exist.**
  A booked slot carries its own status; bulk operations simply refuse to touch
  it. The rules-as-storage model _manufactures_ that edge case. This one has
  never had it.

It also inverts a difficulty. Supporting several separate availability blocks —
weekday afternoons _and_ weekday evenings _and_ weekend mornings — is awkward in
a form with day-range and time-range fields, which is where you would need
multiple stored rule objects. On a grid it is just more painted cells. The union
of arbitrary blocks is what a grid natively represents, so the feature we were
most worried about is free.

### 4.2 Expansion

A pure function in `src/lib/helpers/`:

```
expandGridToSlots(selection, weekRange, durationMinutes, interviewer, meetingLink)
  → Data.InterviewSlot[]
```

No I/O, no framework coupling, unit-tested under `__tests__/` like the rest of
`src/lib`. Times in the past are skipped. The result is written with a single
`writeBatch`, chunked to Firestore's 500-operation limit — the example pattern
over five weeks is 215 slots, but a full-window paint can exceed 500.

### 4.3 Slot identity, and the sharpest hazard in this design

Slot document ids are already `${epochMillis}${interviewerUid}` — deterministic
on the pair (instant, interviewer). That is good: regenerating an overlapping
range cannot create duplicates.

It is also dangerous. Both current write paths use `setDoc` with no merge and no
existence check, so regenerating over an existing range **overwrites** it. By
hand this is nearly unreachable. With bulk generation, "I need to add Thursdays
too" → repaint → regenerate is the _normal_ workflow, and it would silently
reset booked slots to open — clearing the candidate's name after their
confirmation email has already gone out.

**Slot creation must therefore be create-if-absent, not overwrite.** This is
non-negotiable for the grid, and it is the same transactional machinery needed
to fix an existing booking race (§5).

### 4.4 Deletion

Un-painting deletes only slots that are still open. Booked slots are refused by
the same guard, surfaced in the UI as locked cells. A bulk-delete that could
cancel real interviews is the most destructive thing this feature could ship, so
the guard is a prerequisite rather than a follow-up.

### 4.5 Time and timezone

Storage is already correct and needs no migration: slots are stored as absolute
instants, not wall-clock strings. The gap is that **nothing in either interface
currently states which timezone a displayed time is in.**

We propose **viewer-local, explicitly labeled**, on both sides. An interviewer
in Pacific paints 4:00 PM and creates a 4:00 PM Pacific appointment; an Eastern
candidate sees it as 7:00 PM Eastern. Both are correct, and both are now legible
because the label says so.

### 4.6 Interview duration

**Interviews are 15 minutes.** Until now that number was recorded nowhere in the
system — not in the data model, not in the schema, not in any of the interview
email templates — and existed only as shared understanding among interviewers.

The grid needs it, because it defines the row height and therefore how a painted
block becomes a count of slots. We propose a single shared constant, surfaced in
three places: the interviewer's view, the candidate's view, and the confirmation
email sent when an interview is booked.

To candidates we propose phrasing it as **"usually 15 minutes"** rather than as a
commitment. A candidate who reads a firm 15 and then has a 25-minute
conversation has been misled, and interviewers should not feel clock-bound by
our wording.

It is also what makes "is this interviewer double-booked?" a question a computer
can answer. Nothing today prevents an interviewer having a booked 4:00 slot and
an open 4:15 slot — two candidates, one interviewer, overlapping calls. That is
currently prevented only by interviewers spacing their own slots by hand, which
is exactly the discipline bulk generation removes.

Both confirmation emails (a candidate booking a slot, and an interviewer
assigning one) are sent to the candidate with the interviewer copied, so a
single sentence reaches both audiences.

### 4.7 Volume

The example pattern is 43 slots per interviewer per week at a 30-minute length.
Bounded by an explicit interview window, a full-window paint is roughly 280 per
interviewer; across ten interviewers the ceiling is a few thousand documents.
Firestore is untroubled by this, but the portal currently reads the _entire_ slot
collection and filters in the browser, which at that size becomes a meaningful
download on a phone. Making that a bounded query (with the composite index it
requires) is part of this work, and the explicit window is what makes it
expressible.

---

## 5. Prerequisite work

Four smaller fixes should land before the grid. Each stands on its own merits
and improves the current system whether or not the grid is ever built; three are
behavior-preserving and one is a bug fix, so they are safe to land during a live
interview cycle in a way the grid is not.

1. **An explicit interview window** in the semester dates, replacing the current
   practice of borrowing the instructor-orientation date as a de facto interview
   deadline. Also fixes window boundaries shifting by up to three hours
   depending on the viewer's timezone.
2. **Timezone labels and a duration constant** in both interfaces (§4.5, §4.6).
3. **Booking integrity** — the portal currently checks a slot is free and then
   claims it in two separate steps, so two candidates clicking the same slot
   seconds apart can both pass the check. Fixing this also establishes the
   create-if-absent machinery the grid requires (§4.3).
4. **A status guard on editing and deleting slots** — an interviewer can
   currently delete a slot a candidate has already booked, leaving that person
   holding a confirmation email for an interview that no longer exists, with
   nobody notified.

Items 3 and 4 are pre-existing defects that the grid would amplify from rare to
routine. They are worth fixing regardless.

---

## 6. Alternatives considered

### 6.1 Third-party scheduling (Cal.com, Koalendar)

The conventional answer, and genuinely strong on features: a mature availability
UI, automatic meeting links, real conflict detection against interviewers'
personal calendars, and double-booking prevention we would otherwise build
ourselves. Each interviewer creates a free account and sets their own schedule.

We set it aside for three reasons.

**Setup cost recurs forever.** gbSTEM's interviewers are high school and college
volunteers who typically stay four to six semesters. Each new interviewer would
need to create an account, configure availability, and grant calendar access
individually — gbSTEM uses personal email addresses rather than a Google
Workspace or Microsoft 365 domain, so there is no central administration to
delegate through. This is not a one-time migration cost; it is an onboarding tax
paid at every turnover, forever.

**Accounts outlive the volunteers.** A booking page lives in an account gbSTEM
does not own. When an interviewer graduates, that page is still live and there
is no admin console to reclaim or disable it. Code we maintain can at least be
read and changed by whoever comes next; an orphaned third-party account holding
a live booking link cannot be recovered at all. Cal.com's organization plan
solves this, but requires paying and owning a domain.

**It would not actually keep our code small.** Embedding it in the portal still
requires mapping each candidate to the right interviewer's booking page and
getting completed bookings back into our database so the candidate is marked as
scheduled and the slot appears to staff. That means webhook handling, signature
verification, and retry logic — real server-side code with an external
dependency, maintained by the same volunteer team, and it fails _silently_: a
dropped webhook means a booking that exists at the vendor and is invisible to
gbSTEM. The alternative — dropping the in-portal flow and emailing candidates a
link — breaks the screening pipeline that depends on candidates being marked as
scheduled.

This remains the right answer for an organization with a managed email domain
and stable staff. gbSTEM is neither.

### 6.2 Storing availability as rules

The fuller when2meet model: persist _Mon–Fri 15:30–18:00_ as a rule and resolve
rules into bookable times on demand. More flexible, and a smaller database.

Set aside as the largest option with the worst failure modes: it needs a
transactional layer coalescing all interviewers' rules, a server-side write path,
invalidation whenever anyone edits availability, and explicit handling of
withdrawn availability that has already been booked. §4.1 covers why expanding
at save time gets the same interface for a fraction of the permanent complexity —
and why the hardest edge case simply does not arise.

### 6.3 Doing nothing

Worth stating: the current system works, and interviews are being scheduled with
it right now. The cost is entirely in interviewers' time and candidates'
experience, both of which are real but neither of which is an outage. This is
why we propose landing the prerequisite fixes during the cycle and the grid at
the semester boundary, rather than rushing.

---

## 7. Open questions

1. **Should candidates see interviewer names in the grid, or only on
   confirmation?** §2 proposes the latter for legibility; the current system
   shows names.
2. **Should candidates be able to reschedule or cancel themselves?** There is no
   such path today — rescheduling means emailing someone. A calendar interface
   will make people expect self-service, so it is worth deciding deliberately
   rather than by omission.
3. **Should "request a different time" survive the grid?** We propose yes, as an
   escape hatch rather than a workaround.

---

## 8. Sequencing

**During the current cycle:** the four prerequisite fixes (§5). Behavior-
preserving or strictly corrective, and independently valuable.

**At the semester boundary:** the grid itself. Slot generation should land when
the collection is empty, so a mistake in expansion cannot damage live bookings.
Interviews are actively being scheduled right now, and no interface improvement
justifies putting real appointments at risk.

---

_Written for review by gbSTEM leadership and whoever maintains this next. If you
are picking this up cold: §4.1 is the decision everything else follows from, and
§4.3 is the part most likely to bite you._
