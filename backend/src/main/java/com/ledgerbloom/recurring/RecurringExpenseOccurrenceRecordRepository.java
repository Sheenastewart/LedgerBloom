package com.ledgerbloom.recurring;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecurringExpenseOccurrenceRecordRepository
		extends JpaRepository<RecurringExpenseOccurrenceRecord, Long> {

	boolean existsByRecurringExpense_IdAndOccurrenceDate(Long recurringExpenseId, LocalDate occurrenceDate);

	@Query("""
			SELECT r.occurrenceDate FROM RecurringExpenseOccurrenceRecord r
			WHERE r.recurringExpense.id = :recurringExpenseId
			ORDER BY r.occurrenceDate ASC
			""")
	List<LocalDate> findOccurrenceDatesByRecurringExpenseId(@Param("recurringExpenseId") Long recurringExpenseId);
}
