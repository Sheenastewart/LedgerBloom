package com.ledgerbloom.recurring.support;

/**
 * Chosen behavior when a recurring schedule is created with a startDate in the past.
 */
public enum HistorySetupMode {
	/** Skip all historical occurrences; the schedule's next date jumps to the first occurrence on/after today. */
	TRACK_FROM_NOW,
	/** Create ledger entries + occurrence records for the caller-selected historical dates. */
	RECORD_SELECTED
}
