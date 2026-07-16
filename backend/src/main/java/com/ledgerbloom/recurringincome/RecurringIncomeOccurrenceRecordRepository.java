package com.ledgerbloom.recurringincome;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecurringIncomeOccurrenceRecordRepository extends JpaRepository<RecurringIncomeOccurrenceRecord, Long> {

	boolean existsByRecurringIncome_IdAndOccurrenceDate(Long recurringIncomeId, LocalDate occurrenceDate);

	Optional<RecurringIncomeOccurrenceRecord> findByIncomeEntry_IdAndRecurringIncome_User_Id(
			Long incomeEntryId,
			Long userId);

	@Query("""
			SELECT r FROM RecurringIncomeOccurrenceRecord r
			JOIN FETCH r.recurringIncome ri
			WHERE r.incomeEntry.id IN :entryIds AND ri.user.id = :userId
			""")
	List<RecurringIncomeOccurrenceRecord> findByIncomeEntryIdsForUser(
			@Param("entryIds") List<Long> entryIds,
			@Param("userId") Long userId);

	@Query("""
			SELECT r.occurrenceDate FROM RecurringIncomeOccurrenceRecord r
			WHERE r.recurringIncome.id = :recurringIncomeId
			ORDER BY r.occurrenceDate ASC
			""")
	List<LocalDate> findOccurrenceDatesByRecurringIncomeId(@Param("recurringIncomeId") Long recurringIncomeId);
}
