package com.ledgerbloom.expense;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

	boolean existsByCategory_Id(Long categoryId);

	List<Expense> findAllByOrderByExpenseDateDescIdDesc();

	List<Expense> findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
			LocalDate startInclusive,
			LocalDate endExclusive);

	List<Expense> findByCategory_IdOrderByExpenseDateDescIdDesc(Long categoryId);

	List<Expense> findByCategory_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
			Long categoryId,
			LocalDate startInclusive,
			LocalDate endExclusive);
}
