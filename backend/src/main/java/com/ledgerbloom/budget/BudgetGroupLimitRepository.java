package com.ledgerbloom.budget;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetGroupLimitRepository extends JpaRepository<BudgetGroupLimit, Long> {

	List<BudgetGroupLimit> findByMonthlyBudget_IdOrderByIdAsc(Long monthlyBudgetId);

	Optional<BudgetGroupLimit> findByIdAndMonthlyBudget_IdAndUser_Id(Long id, Long monthlyBudgetId, Long userId);

	Optional<BudgetGroupLimit> findByMonthlyBudget_IdAndBudgetGroupAndUser_Id(
			Long monthlyBudgetId,
			BudgetGroup budgetGroup,
			Long userId);

	boolean existsByMonthlyBudget_IdAndBudgetGroupAndUser_Id(
			Long monthlyBudgetId,
			BudgetGroup budgetGroup,
			Long userId);

	void deleteByMonthlyBudget_Id(Long monthlyBudgetId);
}
