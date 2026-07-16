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
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.error.GlobalExceptionHandler;
import com.ledgerbloom.expense.ExpenseCategorySummary;
import com.ledgerbloom.expense.ExpenseResponse;
import com.ledgerbloom.recurring.support.CatchUpRequest;
import com.ledgerbloom.recurring.support.OccurrencePreviewItem;
import com.ledgerbloom.recurring.support.OccurrencePreviewRequest;
import com.ledgerbloom.recurring.support.OccurrencePreviewResponse;
import com.ledgerbloom.support.SecurityTestConfig;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = RecurringExpenseController.class)
@Import({GlobalExceptionHandler.class, SecurityTestConfig.class})
@WithMockUser(username = "user@example.com")
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
			Instant.parse("2026-01-01T00:00:00Z"),
			null,
			null
		);
	}

	@Test
	void createReturns201WithLocation() throws Exception {
		when(recurringExpenseService.create(any(RecurringExpenseCreateRequest.class))).thenReturn(sample());

		mockMvc.perform(post("/api/recurring-expenses")
				.with(csrf())
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
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Netflix",
						  "amount":0,
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
	void createBlankDescriptionIsAllowed() throws Exception {
		when(recurringExpenseService.create(any(RecurringExpenseCreateRequest.class))).thenReturn(
			new RecurringExpenseResponse(
				10L,
				null,
				null,
				new BigDecimal("15.99"),
				new RecurringExpenseCategorySummary(1L, "Entertainment"),
				RecurringExpenseCadence.MONTHLY,
				LocalDate.of(2026, 8, 1),
				true,
				null,
				Instant.parse("2026-01-01T00:00:00Z"),
				Instant.parse("2026-01-01T00:00:00Z"),
				null,
				null
			)
		);

		mockMvc.perform(post("/api/recurring-expenses")
				.with(csrf())
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
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id").value(10));
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
				.with(csrf())
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

		mockMvc.perform(delete("/api/recurring-expenses/10").with(csrf()))
			.andExpect(status().isNoContent());
	}

	@Test
	void deleteMissingReturns404() throws Exception {
		doThrow(new RecurringExpenseNotFoundException(42L)).when(recurringExpenseService).delete(42L);

		mockMvc.perform(delete("/api/recurring-expenses/42").with(csrf()))
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
					null,
					Instant.parse("2026-01-01T00:00:00Z"),
					Instant.parse("2026-01-01T00:00:00Z")
				),
				sample()
			)
		);

		mockMvc.perform(post("/api/recurring-expenses/10/mark-paid")
				.with(csrf())
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
				.with(csrf())
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
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringExpenseService, never()).markPaid(any(), any());
	}

	@Test
	void markPaidNullExpectedDateReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-expenses/10/mark-paid")
				.with(csrf())
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
				.with(csrf())
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
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

		verify(recurringExpenseService, never()).markPaid(any(), any());
	}

	@Test
	void previewOccurrencesReturnsOccurrencesAndSuggestedNext() throws Exception {
		when(recurringExpenseService.previewOccurrences(any(OccurrencePreviewRequest.class))).thenReturn(
			new OccurrencePreviewResponse(
				List.of(new OccurrencePreviewItem(LocalDate.of(2026, 6, 1), new BigDecimal("15.99"))),
				LocalDate.of(2026, 8, 1)
			)
		);

		mockMvc.perform(post("/api/recurring-expenses/preview-occurrences")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "cadence":"MONTHLY",
						  "startDate":"2026-06-01",
						  "amount":15.99
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.occurrences[0].occurrenceDate").value("2026-06-01"))
			.andExpect(jsonPath("$.suggestedNextOnOrAfterToday").value("2026-08-01"));
	}

	@Test
	void previewOccurrencesValidationReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-expenses/preview-occurrences")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "cadence":"SEMIMONTHLY",
						  "startDate":"2026-06-01",
						  "amount":15.99,
						  "firstPaymentDay":50
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringExpenseService, never()).previewOccurrences(any());
	}

	@Test
	void catchUpReturnsCreatedSummary() throws Exception {
		when(recurringExpenseService.catchUp(eq(10L), any(CatchUpRequest.class))).thenReturn(
			new RecurringExpenseCatchUpResponse(
				2,
				List.of(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 7, 1)),
				LocalDate.of(2026, 8, 1),
				sample(),
				List.of(
					new ExpenseResponse(
						51L, "Netflix", "Netflix Inc", new BigDecimal("15.99"), LocalDate.of(2026, 6, 1),
						new ExpenseCategorySummary(1L, "Entertainment"),
						null,
						Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z")
					),
					new ExpenseResponse(
						52L, "Netflix", "Netflix Inc", new BigDecimal("15.99"), LocalDate.of(2026, 7, 1),
						new ExpenseCategorySummary(1L, "Entertainment"),
						null,
						Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z")
					)
				)
			)
		);

		mockMvc.perform(post("/api/recurring-expenses/10/catch-up")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "occurrenceDates":["2026-06-01","2026-07-01"]
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.createdCount").value(2))
			.andExpect(jsonPath("$.createdDates[0]").value("2026-06-01"))
			.andExpect(jsonPath("$.nextOccurrenceDate").value("2026-08-01"))
			.andExpect(jsonPath("$.updatedRecurringExpense.id").value(10))
			.andExpect(jsonPath("$.createdExpenses[1].id").value(52));
	}

	@Test
	void catchUpEmptyDatesReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-expenses/10/catch-up")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "occurrenceDates":[]
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringExpenseService, never()).catchUp(any(), any());
	}

	@Test
	void catchUpInvalidDatesReturns400WithServiceErrorCode() throws Exception {
		when(recurringExpenseService.catchUp(eq(10L), any(CatchUpRequest.class)))
			.thenThrow(new InvalidRecurringExpenseDataException(
				"occurrenceDates must be a subset of the pending occurrences on or before today"));

		mockMvc.perform(post("/api/recurring-expenses/10/catch-up")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "occurrenceDates":["2099-01-01"]
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_RECURRING_EXPENSE_DATA"));
	}
}
