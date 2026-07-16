package com.ledgerbloom.budget;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonthlyBudgetRepository extends JpaRepository<MonthlyBudget, Long> {

	Optional<MonthlyBudget> findByUser_IdAndBudgetYearAndBudgetMonth(Long userId, Integer budgetYear, Integer budgetMonth);

	boolean existsByUser_IdAndBudgetYearAndBudgetMonth(Long userId, Integer budgetYear, Integer budgetMonth);

	Optional<MonthlyBudget> findByIdAndUser_Id(Long id, Long userId);
}
