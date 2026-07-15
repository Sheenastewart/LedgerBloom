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

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT r FROM RecurringIncome r WHERE r.id = :id")
	Optional<RecurringIncome> findByIdForUpdate(@Param("id") Long id);

	@Query("""
			SELECT r FROM RecurringIncome r
			WHERE (:active IS NULL OR r.active = :active)
			AND (:cadence IS NULL OR r.cadence = :cadence)
			AND (:source IS NULL OR LOWER(r.source) = LOWER(:source))
			ORDER BY r.active DESC, r.nextIncomeDate ASC, r.id ASC
			""")
	List<RecurringIncome> findFiltered(
			@Param("active") Boolean active,
			@Param("cadence") RecurringIncomeCadence cadence,
			@Param("source") String source);

	@Query("""
			SELECT r FROM RecurringIncome r
			WHERE r.active = true
			AND r.nextIncomeDate >= :fromInclusive
			AND r.nextIncomeDate <= :toInclusive
			ORDER BY r.nextIncomeDate ASC, r.id ASC
			""")
	List<RecurringIncome> findUpcoming(
			@Param("fromInclusive") LocalDate fromInclusive,
			@Param("toInclusive") LocalDate toInclusive);

	@Query("""
			SELECT r FROM RecurringIncome r
			WHERE r.active = true
			AND r.nextIncomeDate >= :monthStart
			AND r.nextIncomeDate <= :monthEnd
			ORDER BY r.nextIncomeDate ASC, r.id ASC
			""")
	List<RecurringIncome> findActiveInMonth(
			@Param("monthStart") LocalDate monthStart,
			@Param("monthEnd") LocalDate monthEnd);
}
