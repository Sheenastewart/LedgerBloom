package com.ledgerbloom.expense;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = ExpenseController.class)
@Import(GlobalExceptionHandler.class)
class ExpenseControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ExpenseService expenseService;

	private ExpenseResponse sampleResponse() {
		return new ExpenseResponse(
			5L,
			"Weekly shopping",
			"Market",
			new BigDecimal("45.50"),
			LocalDate.of(2026, 7, 10),
			new ExpenseCategorySummary(1L, "Groceries"),
			null,
			Instant.parse("2026-01-01T00:00:00Z"),
			Instant.parse("2026-01-01T00:00:00Z")
		);
	}

	@Test
	void createReturns201WithLocation() throws Exception {
		when(expenseService.create(any(ExpenseCreateRequest.class))).thenReturn(sampleResponse());

		mockMvc.perform(post("/api/expenses")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Weekly shopping",
						  "merchant":"Market",
						  "amount":45.50,
						  "expenseDate":"2026-07-10",
						  "categoryId":1
						}
						"""))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", containsString("/api/expenses/5")))
			.andExpect(jsonPath("$.id").value(5))
			.andExpect(jsonPath("$.category.name").value("Groceries"));
	}

	@Test
	void createBlankDescriptionReturns400() throws Exception {
		mockMvc.perform(post("/api/expenses")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"",
						  "amount":10.00,
						  "expenseDate":"2026-07-10",
						  "categoryId":1
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.fieldErrors[0].field").value("description"))
			.andExpect(jsonPath("$.path").value("/api/expenses"))
			.andExpect(jsonPath("$.timestamp").exists());
	}

	@Test
	void createInvalidAmountReturns400() throws Exception {
		mockMvc.perform(post("/api/expenses")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Milk",
						  "amount":1.234,
						  "expenseDate":"2026-07-10",
						  "categoryId":1
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	@Test
	void createMissingCategoryReturns404() throws Exception {
		when(expenseService.create(any(ExpenseCreateRequest.class)))
			.thenThrow(new CategoryNotFoundException(99L));

		mockMvc.perform(post("/api/expenses")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Milk",
						  "amount":1.00,
						  "expenseDate":"2026-07-10",
						  "categoryId":99
						}
						"""))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"));
	}

	@Test
	void createUnknownIntegrityViolationReturns500() throws Exception {
		when(expenseService.create(any(ExpenseCreateRequest.class)))
			.thenThrow(new DataIntegrityViolationException("unexpected integrity failure"));

		mockMvc.perform(post("/api/expenses")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Milk",
						  "amount":1.00,
						  "expenseDate":"2026-07-10",
						  "categoryId":1
						}
						"""))
			.andExpect(status().isInternalServerError())
			.andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"))
			.andExpect(jsonPath("$.message").value("An unexpected error occurred"));
	}

	@Test
	void getMissingExpenseReturns404() throws Exception {
		when(expenseService.findById(99L)).thenThrow(new ExpenseNotFoundException(99L));

		mockMvc.perform(get("/api/expenses/99"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("EXPENSE_NOT_FOUND"))
			.andExpect(jsonPath("$.path").value("/api/expenses/99"));
	}

	@Test
	void listReturnsExpenses() throws Exception {
		when(expenseService.findAll(isNull(), isNull(), isNull())).thenReturn(List.of(sampleResponse()));

		mockMvc.perform(get("/api/expenses"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].description").value("Weekly shopping"));
	}

	@Test
	void monthFilterRequest() throws Exception {
		when(expenseService.findAll(2026, 7, null)).thenReturn(List.of(sampleResponse()));

		mockMvc.perform(get("/api/expenses").param("year", "2026").param("month", "7"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].id").value(5));

		verify(expenseService).findAll(2026, 7, null);
	}

	@Test
	void invalidMonthFilterReturns400() throws Exception {
		when(expenseService.findAll(2026, 13, null))
			.thenThrow(new InvalidExpenseFilterException("month must be between 1 and 12"));

		mockMvc.perform(get("/api/expenses").param("year", "2026").param("month", "13"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
	}

	@Test
	void partialYearMonthFilterReturns400() throws Exception {
		when(expenseService.findAll(2026, null, null))
			.thenThrow(new InvalidExpenseFilterException("year and month must both be provided together"));

		mockMvc.perform(get("/api/expenses").param("year", "2026"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
	}

	@Test
	void updateReturnsExpense() throws Exception {
		when(expenseService.update(eq(5L), any(ExpenseUpdateRequest.class))).thenReturn(sampleResponse());

		mockMvc.perform(put("/api/expenses/5")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Weekly shopping",
						  "merchant":"Market",
						  "amount":45.50,
						  "expenseDate":"2026-07-10",
						  "categoryId":1
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(5));
	}

	@Test
	void deleteReturns204() throws Exception {
		doNothing().when(expenseService).delete(5L);

		mockMvc.perform(delete("/api/expenses/5"))
			.andExpect(status().isNoContent());

		verify(expenseService).delete(5L);
	}

	@Test
	void structuredErrorShapeOnMissingExpense() throws Exception {
		when(expenseService.findById(42L)).thenThrow(new ExpenseNotFoundException(42L));

		mockMvc.perform(get("/api/expenses/42"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.timestamp").exists())
			.andExpect(jsonPath("$.status").value(404))
			.andExpect(jsonPath("$.error").exists())
			.andExpect(jsonPath("$.code").value("EXPENSE_NOT_FOUND"))
			.andExpect(jsonPath("$.message").exists())
			.andExpect(jsonPath("$.path").value("/api/expenses/42"));
	}

	@Test
	void deleteMissingReturns404() throws Exception {
		doThrow(new ExpenseNotFoundException(42L)).when(expenseService).delete(42L);

		mockMvc.perform(delete("/api/expenses/42"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("EXPENSE_NOT_FOUND"));
	}
}
