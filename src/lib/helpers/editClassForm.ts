import type ClassData from '../data/types/ClassData'

/**
 * Maps a stored class into superform-compatible values.
 *
 * See `toApplicationFormValues` for why a field missing from this allowlist is
 * both invisible and destructive. EditClassForm is the more dangerous of the
 * two shapes: it writes `{ ...values, ...formVal.data }` over a flat document,
 * so a dropped field is written back as the schema's default rather than
 * merely being omitted.
 */
export function toClassFormValues(v: ClassData) {
  return {
    course: v.course || '',
    gradeRecommendation: v.gradeRecommendation || '',
    classCap: v.classCap || 0,
    meetingLink: v.meetingLink || '',
    classDay1: v.classDay1 || '',
    classTime1: v.classTime1 || '',
    classDay2: v.classDay2 || '',
    classTime2: v.classTime2 || '',
    online: v.online !== undefined ? v.online : true,
  }
}

/**
 * The complete class document to write after a successful edit.
 *
 * Unlike the application and registration forms this really is a whole-document
 * spread: `classSchema` covers only part of `ClassData`, and everything it
 * doesn't cover - the roster, the generated schedule, the instructor's name -
 * has to survive from `values`.
 */
export function classEditedFields(values: ClassData, formData: any): ClassData {
  return {
    ...values,
    ...formData,
  }
}
