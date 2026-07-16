package com.ledgerbloom.recurring.support;

import java.time.LocalDate;
import java.util.List;

/**
 * Occurrences from the requested startDate through today (inclusive), plus the date the
 * schedule's next-due pointer would land on if the caller chooses {@code TRACK_FROM_NOW}.
 */
public record OccurrencePreviewResponse(
		List<OccurrencePreviewItem> occurrences,
		LocalDate suggestedNextOnOrAfterToday
) {
}
