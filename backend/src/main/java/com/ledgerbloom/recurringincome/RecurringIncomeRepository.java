package com.ledgerbloom.recurringincome;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecurringIncomeRepository extends JpaRepository<RecurringIncome, Long> {

	Optional<RecurringIncome> findByIdAndUser_Id(Long id, Long userId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT r FROM RecurringIncome r WHERE r.id = :id AND r.user.id = :userId")
	Optional<RecurringIncome> findByIdAndUser_IdForUpdate(@Param("id") Long id, @Param("userId") Long userId);

	@Query("""
			SELECT r FROM RecurringIncome r
			WHERE r.user.id = :userId
			AND (:active IS NULL OR r.active = :active)
			AND (:cadence IS NULL OR r.cadence = :cadence)
			AND (:source IS NULL OR LOWER(r.source) = LOWER(:source))
			ORDER BY r.active DESC, r.nextIncomeDate ASC, r.id ASC
			""")
	List<RecurringIncome> findFiltered(
			@Param("userId") Long userId,
			@Param("active") Boolean active,
			@Param("cadence") RecurringIncomeCadence cadence,
			@Param("source") String source);

	@Query("""
			SELECT r FROM RecurringIncome r
			WHERE r.user.id = :userId
			AND r.active = true
			AND r.nextIncomeDate >= :fromInclusive
			AND r.nextIncomeDate <= :toInclusive
			ORDER BY r.nextIncomeDate ASC, r.id ASC
			""")
	List<RecurringIncome> findUpcoming(
			@Param("userId") Long userId,
			@Param("fromInclusive") LocalDate fromInclusive,
			@Param("toInclusive") LocalDate toInclusive);

	/**
	 * Active schedules whose next due date is on or before the period end.
	 * Callers project all cadence occurrences inside the month from that next due date.
	 */
	@Query("""
			SELECT r FROM RecurringIncome r
			WHERE r.user.id = :userId
			AND r.active = true
			AND r.nextIncomeDate <= :monthEnd
			ORDER BY r.nextIncomeDate ASC, r.id ASC
			""")
	List<RecurringIncome> findActiveDueOnOrBefore(
			@Param("userId") Long userId,
			@Param("monthEnd") LocalDate monthEnd);
}
