package com.ledgerbloom.recurring;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecurringExpenseRepository extends JpaRepository<RecurringExpense, Long> {

	boolean existsByCategory_Id(Long categoryId);

	Optional<RecurringExpense> findByIdAndUser_Id(Long id, Long userId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT r FROM RecurringExpense r WHERE r.id = :id AND r.user.id = :userId")
	Optional<RecurringExpense> findByIdAndUser_IdForUpdate(@Param("id") Long id, @Param("userId") Long userId);

	@Query("""
			SELECT r FROM RecurringExpense r
			WHERE r.user.id = :userId
			AND (:active IS NULL OR r.active = :active)
			AND (:categoryId IS NULL OR r.category.id = :categoryId)
			AND (:cadence IS NULL OR r.cadence = :cadence)
			ORDER BY r.active DESC, r.nextPaymentDate ASC, r.id ASC
			""")
	List<RecurringExpense> findFiltered(
			@Param("userId") Long userId,
			@Param("active") Boolean active,
			@Param("categoryId") Long categoryId,
			@Param("cadence") RecurringExpenseCadence cadence);

	@Query("""
			SELECT r FROM RecurringExpense r
			WHERE r.user.id = :userId
			AND r.active = true
			AND r.nextPaymentDate >= :fromInclusive
			AND r.nextPaymentDate <= :toInclusive
			ORDER BY r.nextPaymentDate ASC, r.id ASC
			""")
	List<RecurringExpense> findUpcoming(
			@Param("userId") Long userId,
			@Param("fromInclusive") LocalDate fromInclusive,
			@Param("toInclusive") LocalDate toInclusive);

	@Query("""
			SELECT r FROM RecurringExpense r
			WHERE r.user.id = :userId
			AND r.active = true
			AND r.nextPaymentDate >= :monthStart
			AND r.nextPaymentDate <= :monthEnd
			ORDER BY r.nextPaymentDate ASC, r.id ASC
			""")
	List<RecurringExpense> findActiveInMonth(
			@Param("userId") Long userId,
			@Param("monthStart") LocalDate monthStart,
			@Param("monthEnd") LocalDate monthEnd);
}
