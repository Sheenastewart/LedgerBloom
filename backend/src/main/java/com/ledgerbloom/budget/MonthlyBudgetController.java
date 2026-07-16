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

	@PostMapping("/generate")
	public ResponseEntity<MonthlyBudgetResponse> generate(
			@Valid @RequestBody MonthlyBudgetGenerateRequest request) {
		MonthlyBudgetResponse generated = monthlyBudgetService.generateFromSchedules(request);
		URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
			.path("/api/budgets/monthly")
			.queryParam("year", generated.year())
			.queryParam("month", generated.month())
			.build()
			.toUri();
		return ResponseEntity.created(location).body(generated);
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

	@PostMapping("/{budgetId}/groups")
	public ResponseEntity<MonthlyBudgetResponse> createGroupLimit(
			@PathVariable Long budgetId,
			@Valid @RequestBody BudgetGroupLimitCreateRequest request) {
		MonthlyBudgetResponse updated = monthlyBudgetService.createGroupLimit(budgetId, request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
			.path("/{limitId}")
			.buildAndExpand(findCreatedLimitId(updated, request.budgetGroup()))
			.toUri();
		return ResponseEntity.created(location).body(updated);
	}

	@PutMapping("/{budgetId}/groups/{limitId}")
	public MonthlyBudgetResponse updateGroupLimit(
			@PathVariable Long budgetId,
			@PathVariable Long limitId,
			@Valid @RequestBody BudgetGroupLimitUpdateRequest request) {
		return monthlyBudgetService.updateGroupLimit(budgetId, limitId, request);
	}

	@DeleteMapping("/{budgetId}/groups/{limitId}")
	public MonthlyBudgetResponse deleteGroupLimit(
			@PathVariable Long budgetId,
			@PathVariable Long limitId) {
		return monthlyBudgetService.deleteGroupLimit(budgetId, limitId);
	}

	private Long findCreatedLimitId(MonthlyBudgetResponse response, String budgetGroup) {
		BudgetGroup group = BudgetGroup.requireParse(budgetGroup);
		return response.groupLimits().stream()
			.filter(limit -> limit.group().key().equals(group.name()))
			.map(BudgetGroupLimitResponse::id)
			.findFirst()
			.orElse(response.id());
	}
}
