import { describe, expect, it } from 'vitest'
import { userFacingNotes } from './notesUtils'

describe('userFacingNotes', () => {
  it('hides system-generated recurring linkage notes', () => {
    expect(userFacingNotes('Received from recurring income #7')).toBeNull()
    expect(userFacingNotes('Caught up from recurring income #3')).toBeNull()
    expect(userFacingNotes('Paid from recurring expense #10')).toBeNull()
    expect(userFacingNotes('Recorded during setup of recurring expense #2')).toBeNull()
  })

  it('keeps user-authored notes', () => {
    expect(userFacingNotes('Direct deposit')).toBe('Direct deposit')
    expect(userFacingNotes('  bonus  ')).toBe('bonus')
  })

  it('treats empty notes as absent', () => {
    expect(userFacingNotes(null)).toBeNull()
    expect(userFacingNotes('')).toBeNull()
    expect(userFacingNotes('   ')).toBeNull()
  })
})
