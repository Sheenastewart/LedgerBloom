package com.ledgerbloom.recurring;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.error.GlobalExceptionHandler;
import com.ledgerbloom.expense.ExpenseCategorySummary;
import com.ledgerbloom.expense.ExpenseResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = RecurringExpenseController.class)
@Import(GlobalExceptionHandler.class)
class RecurringExpenseControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private RecurringExpenseService recurringExpenseService;

	private RecurringExpenseResponse sample() {
		return new RecurringExpenseResponse(
			10L,
			"Netflix",
			"Netflix Inc",
			new BigDecimal("15.99"),
			new RecurringExpenseCategorySummary(1L, "Entertainment"),
			RecurringExpenseCadence.MONTHLY,
			LocalDate.of(2026, 8, 1),
			true,
			null,
			Instant.parse("2026-01-01T00:00:00Z"),
			Instant.parse("2026-01-01T00:00:00Z")
		);
	}

	@Test
	void createReturns201WithLocation() throws Exception {
		when(recurringExpenseService.create(any(RecurringExpenseCreateRequest.class))).thenReturn(sample());

		mockMvc.perform(post("/api/recurring-expenses")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Netflix",
						  "merchant":"Netflix Inc",
						  "amount":15.99,
						  "categoryId":1,
						  "cadence":"MONTHLY",
						  "nextPaymentDate":"2026-08-01",
						  "active":true
						}
						"""))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", containsString("/api/recurring-expenses/10")))
			.andExpect(jsonPath("$.id").value(10));
	}

	@Test
	void createValidationReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-expenses")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"",
						  "amount":15.99,
						  "categoryId":1,
						  "cadence":"MONTHLY",
						  "nextPaymentDate":"2026-08-01",
						  "active":true
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.timestamp").exists());
	}

	@Test
	void listForwardsFilters() throws Exception {
		when(recurringExpenseService.findAll(true, 1L, "MONTHLY")).thenReturn(List.of(sample()));

		mockMvc.perform(get("/api/recurring-expenses")
				.param("active", "true")
				.param("categoryId", "1")
				.param("cadence", "MONTHLY"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].description").value("Netflix"));

		verify(recurringExpenseService).findAll(true, 1L, "MONTHLY");
	}

	@Test
	void upcomingEndpoint() throws Exception {
		when(recurringExpenseService.findUpcoming(isNull())).thenReturn(List.of(sample()));

		mockMvc.perform(get("/api/recurring-expenses/upcoming"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].id").value(10));
	}

	@Test
	void upcomingInvalidDaysReturns400() throws Exception {
		when(recurringExpenseService.findUpcoming(0))
			.thenThrow(new InvalidRecurringExpenseFilterException("days must be a positive integer"));

		mockMvc.perform(get("/api/recurring-expenses/upcoming").param("days", "0"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_RECURRING_EXPENSE_FILTER"));
	}

	@Test
	void getMissingReturns404() throws Exception {
		when(recurringExpenseService.findById(99L)).thenThrow(new RecurringExpenseNotFoundException(99L));

		mockMvc.perform(get("/api/recurring-expenses/99"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("RECURRING_EXPENSE_NOT_FOUND"))
			.andExpect(jsonPath("$.path").value("/api/recurring-expenses/99"));
	}

	@Test
	void updateReturnsItem() throws Exception {
		when(recurringExpenseService.update(eq(10L), any(RecurringExpenseUpdateRequest.class))).thenReturn(sample());

		mockMvc.perform(put("/api/recurring-expenses/10")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Netflix",
						  "amount":15.99,
						  "categoryId":1,
						  "cadence":"MONTHLY",
						  "nextPaymentDate":"2026-08-01",
						  "active":true
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(10));
	}

	@Test
	void deleteReturns204() throws Exception {
		doNothing().when(recurringExpenseService).delete(10L);

		mockMvc.perform(delete("/api/recurring-expenses/10"))
			.andExpect(status().isNoContent());
	}

	@Test
	void deleteMissingReturns404() throws Exception {
		doThrow(new RecurringExpenseNotFoundException(42L)).when(recurringExpenseService).delete(42L);

		mockMvc.perform(delete("/api/recurring-expenses/42"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("RECURRING_EXPENSE_NOT_FOUND"));
	}

	@Test
	void markPaidReturnsBothResources() throws Exception {
		when(recurringExpenseService.markPaid(eq(10L), any(MarkPaidRequest.class))).thenReturn(
			new MarkPaidResponse(
				new ExpenseResponse(
					50L,
					"Netflix",
					"Netflix Inc",
					new BigDecimal("15.99"),
					LocalDate.of(2026, 8, 1),
					new ExpenseCategorySummary(1L, "Entertainment"),
					"Paid from recurring expense #10",
					Instant.parse("2026-01-01T00:00:00Z"),
					Instant.parse("2026-01-01T00:00:00Z")
				),
				sample()
			)
		);

		mockMvc.perform(post("/api/recurring-expenses/10/mark-paid")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "expectedNextPaymentDate":"2026-08-01"
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.createdExpense.id").value(50))
			.andExpect(jsonPath("$.updatedRecurringExpense.id").value(10));
	}

	@Test
	void markPaidConflictReturns409() throws Exception {
		when(recurringExpenseService.markPaid(eq(10L), any(MarkPaidRequest.class)))
			.thenThrow(new RecurringExpensePaymentConflictException("Recurring expense was already updated; refresh and try again"));

		mockMvc.perform(post("/api/recurring-expenses/10/mark-paid")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "expectedNextPaymentDate":"2026-07-01"
						}
						"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("RECURRING_EXPENSE_PAYMENT_CONFLICT"));
	}

	@Test
	void markPaidMissingExpectedDateReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-expenses/10/mark-paid")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringExpenseService, never()).markPaid(any(), any());
	}

	@Test
	void markPaidNullExpectedDateReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-expenses/10/mark-paid")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "expectedNextPaymentDate": null
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringExpenseService, never()).markPaid(any(), any());
	}

	@Test
	void markPaidMalformedExpectedDateReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-expenses/10/mark-paid")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "expectedNextPaymentDate":"not-a-date"
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

		verify(recurringExpenseService, never()).markPaid(any(), any());
	}

	@Test
	void markPaidMissingBodyReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-expenses/10/mark-paid")
				.contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

		verify(recurringExpenseService, never()).markPaid(any(), any());
	}
}
