package com.ledgerbloom.budget;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.error.GlobalExceptionHandler;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = MonthlyBudgetController.class)
@Import(GlobalExceptionHandler.class)
class MonthlyBudgetControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private MonthlyBudgetService monthlyBudgetService;

	private MonthlyBudgetResponse sampleResponse() {
		return new MonthlyBudgetResponse(
			10L,
			2026,
			7,
			new BigDecimal("1000.00"),
			new BigDecimal("200.00"),
			new BigDecimal("800.00"),
			new BigDecimal("20.00"),
			false,
			2,
			List.of(new CategoryBudgetLimitResponse(
				50L,
				new BudgetCategorySummary(1L, "Groceries"),
				new BigDecimal("300.00"),
				new BigDecimal("150.00"),
				new BigDecimal("150.00"),
				new BigDecimal("50.00"),
				false
			)),
			Instant.parse("2026-01-01T00:00:00Z"),
			Instant.parse("2026-01-01T00:00:00Z")
		);
	}

	@Test
	void getByPeriodReturnsBudget() throws Exception {
		when(monthlyBudgetService.getByYearAndMonth(2026, 7)).thenReturn(sampleResponse());

		mockMvc.perform(get("/api/budgets/monthly").param("year", "2026").param("month", "7"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(10))
			.andExpect(jsonPath("$.totalLimit").value(1000.0))
			.andExpect(jsonPath("$.categoryLimits[0].category.name").value("Groceries"));
	}

	@Test
	void getMissingBudgetReturns404() throws Exception {
		when(monthlyBudgetService.getByYearAndMonth(2026, 8))
			.thenThrow(new MonthlyBudgetNotFoundException(2026, 8));

		mockMvc.perform(get("/api/budgets/monthly").param("year", "2026").param("month", "8"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("BUDGET_NOT_FOUND"))
			.andExpect(jsonPath("$.path").value("/api/budgets/monthly"))
			.andExpect(jsonPath("$.timestamp").exists());
	}

	@Test
	void invalidPeriodReturns400() throws Exception {
		when(monthlyBudgetService.getByYearAndMonth(2026, 13))
			.thenThrow(new InvalidBudgetFilterException("month must be between 1 and 12"));

		mockMvc.perform(get("/api/budgets/monthly").param("year", "2026").param("month", "13"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
	}

	@Test
	void createReturns201WithLocation() throws Exception {
		when(monthlyBudgetService.create(any(MonthlyBudgetCreateRequest.class))).thenReturn(sampleResponse());

		mockMvc.perform(post("/api/budgets/monthly")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "year": 2026,
						  "month": 7,
						  "totalLimit": 1000.00
						}
						"""))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", containsString("year=2026")))
			.andExpect(header().string("Location", containsString("month=7")))
			.andExpect(jsonPath("$.id").value(10));
	}

	@Test
	void createDuplicateReturns409() throws Exception {
		when(monthlyBudgetService.create(any(MonthlyBudgetCreateRequest.class)))
			.thenThrow(new MonthlyBudgetAlreadyExistsException(2026, 7));

		mockMvc.perform(post("/api/budgets/monthly")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "year": 2026,
						  "month": 7,
						  "totalLimit": 1000.00
						}
						"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("BUDGET_ALREADY_EXISTS"));
	}

	@Test
	void createInvalidAmountReturns400() throws Exception {
		mockMvc.perform(post("/api/budgets/monthly")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "year": 2026,
						  "month": 7,
						  "totalLimit": 0
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.fieldErrors[0].field").value("totalLimit"));
	}

	@Test
	void updateReturnsBudget() throws Exception {
		when(monthlyBudgetService.update(eq(10L), any(MonthlyBudgetUpdateRequest.class))).thenReturn(sampleResponse());

		mockMvc.perform(put("/api/budgets/monthly/10")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "totalLimit": 1500.00
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(10));
	}

	@Test
	void deleteReturns204() throws Exception {
		doNothing().when(monthlyBudgetService).delete(10L);

		mockMvc.perform(delete("/api/budgets/monthly/10"))
			.andExpect(status().isNoContent());

		verify(monthlyBudgetService).delete(10L);
	}

	@Test
	void deleteMissingReturns404() throws Exception {
		doThrow(new MonthlyBudgetNotFoundException(42L)).when(monthlyBudgetService).delete(42L);

		mockMvc.perform(delete("/api/budgets/monthly/42"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("BUDGET_NOT_FOUND"));
	}

	@Test
	void createCategoryLimitReturns201WithLocation() throws Exception {
		when(monthlyBudgetService.createCategoryLimit(eq(10L), any(CategoryBudgetLimitCreateRequest.class)))
			.thenReturn(sampleResponse());

		mockMvc.perform(post("/api/budgets/monthly/10/categories")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "categoryId": 1,
						  "limitAmount": 300.00
						}
						"""))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", containsString("/api/budgets/monthly/10/categories/50")))
			.andExpect(jsonPath("$.categoryLimits[0].id").value(50));
	}

	@Test
	void createDuplicateCategoryLimitReturns409() throws Exception {
		when(monthlyBudgetService.createCategoryLimit(eq(10L), any(CategoryBudgetLimitCreateRequest.class)))
			.thenThrow(new CategoryBudgetAlreadyExistsException(10L, 1L));

		mockMvc.perform(post("/api/budgets/monthly/10/categories")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "categoryId": 1,
						  "limitAmount": 300.00
						}
						"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("CATEGORY_BUDGET_ALREADY_EXISTS"));
	}

	@Test
	void createCategoryLimitMissingCategoryReturns404() throws Exception {
		when(monthlyBudgetService.createCategoryLimit(eq(10L), any(CategoryBudgetLimitCreateRequest.class)))
			.thenThrow(new CategoryNotFoundException(99L));

		mockMvc.perform(post("/api/budgets/monthly/10/categories")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "categoryId": 99,
						  "limitAmount": 300.00
						}
						"""))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"));
	}

	@Test
	void updateCategoryLimitReturnsBudget() throws Exception {
		when(monthlyBudgetService.updateCategoryLimit(eq(10L), eq(50L), any(CategoryBudgetLimitUpdateRequest.class)))
			.thenReturn(sampleResponse());

		mockMvc.perform(put("/api/budgets/monthly/10/categories/50")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "limitAmount": 350.00
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(10));
	}

	@Test
	void missingCategoryLimitReturns404() throws Exception {
		when(monthlyBudgetService.updateCategoryLimit(eq(10L), eq(99L), any(CategoryBudgetLimitUpdateRequest.class)))
			.thenThrow(new CategoryBudgetLimitNotFoundException(10L, 99L));

		mockMvc.perform(put("/api/budgets/monthly/10/categories/99")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "limitAmount": 350.00
						}
						"""))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("CATEGORY_BUDGET_LIMIT_NOT_FOUND"));
	}

	@Test
	void deleteCategoryLimitReturnsBudget() throws Exception {
		when(monthlyBudgetService.deleteCategoryLimit(10L, 50L)).thenReturn(sampleResponse());

		mockMvc.perform(delete("/api/budgets/monthly/10/categories/50"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(10));
	}

	@Test
	void invalidBudgetDataReturns400() throws Exception {
		when(monthlyBudgetService.update(eq(10L), any(MonthlyBudgetUpdateRequest.class)))
			.thenThrow(new InvalidBudgetDataException("Total limit must be greater than zero"));

		mockMvc.perform(put("/api/budgets/monthly/10")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "totalLimit": 100.00
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_BUDGET_DATA"));
	}
}
