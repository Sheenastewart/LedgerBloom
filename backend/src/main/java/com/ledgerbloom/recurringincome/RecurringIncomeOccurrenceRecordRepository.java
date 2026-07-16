package com.ledgerbloom.recurringincome;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecurringIncomeOccurrenceRecordRepository extends JpaRepository<RecurringIncomeOccurrenceRecord, Long> {

	boolean existsByRecurringIncome_IdAndOccurrenceDate(Long recurringIncomeId, LocalDate occurrenceDate);

	@Query("""
			SELECT r.occurrenceDate FROM RecurringIncomeOccurrenceRecord r
			WHERE r.recurringIncome.id = :recurringIncomeId
			ORDER BY r.occurrenceDate ASC
			""")
	List<LocalDate> findOccurrenceDatesByRecurringIncomeId(@Param("recurringIncomeId") Long recurringIncomeId);
}
