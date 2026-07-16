package com.ledgerbloom.budget;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryBudgetLimitRepository extends JpaRepository<CategoryBudgetLimit, Long> {

	List<CategoryBudgetLimit> findByMonthlyBudget_IdOrderByIdAsc(Long monthlyBudgetId);

	Optional<CategoryBudgetLimit> findByIdAndMonthlyBudget_IdAndUser_Id(Long id, Long monthlyBudgetId, Long userId);

	boolean existsByMonthlyBudget_IdAndCategory_IdAndUser_Id(Long monthlyBudgetId, Long categoryId, Long userId);

	boolean existsByCategory_Id(Long categoryId);
}
