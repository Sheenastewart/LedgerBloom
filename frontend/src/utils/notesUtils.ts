/**
 * System-generated ledger notes from Mark Paid / Mark Received / catch-up.
 * Notes are reserved for the user; these should not be shown or prefilled in forms.
 */
const SYSTEM_LEDGER_NOTE_PATTERN =
  /^(Received from recurring income|Caught up from recurring income|Recorded during setup of recurring income|Paid from recurring expense|Caught up from recurring expense|Recorded during setup of recurring expense)\b/i

/** Returns user-authored notes only; hides auto-generated recurring linkage text. */
export function userFacingNotes(notes: string | null | undefined): string | null {
  if (notes == null) {
    return null
  }
  const trimmed = notes.trim()
  if (!trimmed || SYSTEM_LEDGER_NOTE_PATTERN.test(trimmed)) {
    return null
  }
  return trimmed
}
