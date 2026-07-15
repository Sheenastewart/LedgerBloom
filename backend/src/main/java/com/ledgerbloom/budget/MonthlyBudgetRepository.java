package com.ledgerbloom.budget;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonthlyBudgetRepository extends JpaRepository<MonthlyBudget, Long> {

	Optional<MonthlyBudget> findByBudgetYearAndBudgetMonth(Integer budgetYear, Integer budgetMonth);

	boolean existsByBudgetYearAndBudgetMonth(Integer budgetYear, Integer budgetMonth);
}
