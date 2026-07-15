package com.ledgerbloom.budget;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryBudgetLimitRepository extends JpaRepository<CategoryBudgetLimit, Long> {

	List<CategoryBudgetLimit> findByMonthlyBudget_IdOrderByIdAsc(Long monthlyBudgetId);

	Optional<CategoryBudgetLimit> findByIdAndMonthlyBudget_Id(Long id, Long monthlyBudgetId);

	boolean existsByMonthlyBudget_IdAndCategory_Id(Long monthlyBudgetId, Long categoryId);

	boolean existsByCategory_Id(Long categoryId);
}
