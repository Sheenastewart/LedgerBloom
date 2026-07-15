package com.ledgerbloom.budget;

import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/budgets/monthly")
public class MonthlyBudgetController {

	private final MonthlyBudgetService monthlyBudgetService;

	public MonthlyBudgetController(MonthlyBudgetService monthlyBudgetService) {
		this.monthlyBudgetService = monthlyBudgetService;
	}

	@GetMapping
	public MonthlyBudgetResponse getByPeriod(
			@RequestParam Integer year,
			@RequestParam Integer month) {
		return monthlyBudgetService.getByYearAndMonth(year, month);
	}

	@PostMapping
	public ResponseEntity<MonthlyBudgetResponse> create(@Valid @RequestBody MonthlyBudgetCreateRequest request) {
		MonthlyBudgetResponse created = monthlyBudgetService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
			.queryParam("year", created.year())
			.queryParam("month", created.month())
			.build()
			.toUri();
		return ResponseEntity.created(location).body(created);
	}

	@PutMapping("/{id}")
	public MonthlyBudgetResponse update(
			@PathVariable Long id,
			@Valid @RequestBody MonthlyBudgetUpdateRequest request) {
		return monthlyBudgetService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		monthlyBudgetService.delete(id);
	}

	@PostMapping("/{budgetId}/categories")
	public ResponseEntity<MonthlyBudgetResponse> createCategoryLimit(
			@PathVariable Long budgetId,
			@Valid @RequestBody CategoryBudgetLimitCreateRequest request) {
		MonthlyBudgetResponse updated = monthlyBudgetService.createCategoryLimit(budgetId, request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
			.path("/{limitId}")
			.buildAndExpand(findCreatedLimitId(updated, request.categoryId()))
			.toUri();
		return ResponseEntity.created(location).body(updated);
	}

	@PutMapping("/{budgetId}/categories/{limitId}")
	public MonthlyBudgetResponse updateCategoryLimit(
			@PathVariable Long budgetId,
			@PathVariable Long limitId,
			@Valid @RequestBody CategoryBudgetLimitUpdateRequest request) {
		return monthlyBudgetService.updateCategoryLimit(budgetId, limitId, request);
	}

	@DeleteMapping("/{budgetId}/categories/{limitId}")
	public MonthlyBudgetResponse deleteCategoryLimit(
			@PathVariable Long budgetId,
			@PathVariable Long limitId) {
		return monthlyBudgetService.deleteCategoryLimit(budgetId, limitId);
	}

	private Long findCreatedLimitId(MonthlyBudgetResponse response, Long categoryId) {
		return response.categoryLimits().stream()
			.filter(limit -> limit.category().id().equals(categoryId))
			.map(CategoryBudgetLimitResponse::id)
			.findFirst()
			.orElse(response.id());
	}
}
