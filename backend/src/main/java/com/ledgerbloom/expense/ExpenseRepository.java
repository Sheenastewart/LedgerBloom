package com.ledgerbloom.expense;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

	boolean existsByCategory_Id(Long categoryId);

	Optional<Expense> findByIdAndUser_Id(Long id, Long userId);

	List<Expense> findByUser_IdOrderByExpenseDateDescIdDesc(Long userId);

	List<Expense> findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
			Long userId,
			LocalDate startInclusive,
			LocalDate endExclusive);

	List<Expense> findByUser_IdAndCategory_IdOrderByExpenseDateDescIdDesc(Long userId, Long categoryId);

	List<Expense>
			findByUser_IdAndCategory_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
					Long userId,
					Long categoryId,
					LocalDate startInclusive,
					LocalDate endExclusive);
}
