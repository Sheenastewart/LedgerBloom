package com.ledgerbloom.recurringincome;

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
import com.ledgerbloom.income.IncomeEntryResponse;
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

@WebMvcTest(controllers = RecurringIncomeController.class)
@Import({GlobalExceptionHandler.class, SecurityTestConfig.class})
@WithMockUser(username = "user@example.com")
class RecurringIncomeControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private RecurringIncomeService recurringIncomeService;

	private RecurringIncomeResponse sample() {
		return new RecurringIncomeResponse(
			10L,
			"Salary",
			"Acme Corp",
			new BigDecimal("5000.00"),
			RecurringIncomeCadence.MONTHLY,
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
		when(recurringIncomeService.create(any(RecurringIncomeCreateRequest.class))).thenReturn(sample());

		mockMvc.perform(post("/api/recurring-income")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Salary",
						  "source":"Acme Corp",
						  "amount":5000.00,
						  "cadence":"MONTHLY",
						  "nextIncomeDate":"2026-08-01",
						  "active":true
						}
						"""))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", containsString("/api/recurring-income/10")))
			.andExpect(jsonPath("$.id").value(10));
	}

	@Test
	void createValidationReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-income")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"",
						  "source":"Acme Corp",
						  "amount":5000.00,
						  "cadence":"MONTHLY",
						  "nextIncomeDate":"2026-08-01",
						  "active":true
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.timestamp").exists());
	}

	@Test
	void listWithoutFiltersReturnsOk() throws Exception {
		when(recurringIncomeService.findAll(isNull(), isNull(), isNull())).thenReturn(List.of(sample()));

		mockMvc.perform(get("/api/recurring-income"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].description").value("Salary"));

		verify(recurringIncomeService).findAll(isNull(), isNull(), isNull());
	}

	@Test
	void listForwardsFilters() throws Exception {
		when(recurringIncomeService.findAll(true, "MONTHLY", "Acme Corp")).thenReturn(List.of(sample()));

		mockMvc.perform(get("/api/recurring-income")
				.param("active", "true")
				.param("cadence", "MONTHLY")
				.param("source", "Acme Corp"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].description").value("Salary"));

		verify(recurringIncomeService).findAll(true, "MONTHLY", "Acme Corp");
	}

	@Test
	void upcomingEndpoint() throws Exception {
		when(recurringIncomeService.findUpcoming(isNull())).thenReturn(List.of(sample()));

		mockMvc.perform(get("/api/recurring-income/upcoming"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].id").value(10));
	}

	@Test
	void upcomingInvalidDaysReturns400() throws Exception {
		when(recurringIncomeService.findUpcoming(0))
			.thenThrow(new InvalidRecurringIncomeFilterException("days must be a positive integer"));

		mockMvc.perform(get("/api/recurring-income/upcoming").param("days", "0"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_RECURRING_INCOME_FILTER"));
	}

	@Test
	void getMissingReturns404() throws Exception {
		when(recurringIncomeService.findById(99L)).thenThrow(new RecurringIncomeNotFoundException(99L));

		mockMvc.perform(get("/api/recurring-income/99"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("RECURRING_INCOME_NOT_FOUND"))
			.andExpect(jsonPath("$.path").value("/api/recurring-income/99"));
	}

	@Test
	void updateReturnsItem() throws Exception {
		when(recurringIncomeService.update(eq(10L), any(RecurringIncomeUpdateRequest.class))).thenReturn(sample());

		mockMvc.perform(put("/api/recurring-income/10")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Salary",
						  "source":"Acme Corp",
						  "amount":5000.00,
						  "cadence":"MONTHLY",
						  "nextIncomeDate":"2026-08-01",
						  "active":true
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(10));
	}

	@Test
	void deleteReturns204() throws Exception {
		doNothing().when(recurringIncomeService).delete(10L);

		mockMvc.perform(delete("/api/recurring-income/10").with(csrf()))
			.andExpect(status().isNoContent());
	}

	@Test
	void deleteMissingReturns404() throws Exception {
		doThrow(new RecurringIncomeNotFoundException(42L)).when(recurringIncomeService).delete(42L);

		mockMvc.perform(delete("/api/recurring-income/42").with(csrf()))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("RECURRING_INCOME_NOT_FOUND"));
	}

	@Test
	void markReceivedReturnsBothResources() throws Exception {
		when(recurringIncomeService.markReceived(eq(10L), any(MarkReceivedRequest.class))).thenReturn(
			new MarkReceivedResponse(
				new IncomeEntryResponse(
					50L,
					"Salary",
					"Acme Corp",
					new BigDecimal("5000.00"),
					LocalDate.of(2026, 8, 1),
					"Received from recurring income #10",
					Instant.parse("2026-01-01T00:00:00Z"),
					Instant.parse("2026-01-01T00:00:00Z")
				),
				sample()
			)
		);

		mockMvc.perform(post("/api/recurring-income/10/mark-received")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "expectedNextIncomeDate":"2026-08-01"
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.createdIncomeEntry.id").value(50))
			.andExpect(jsonPath("$.updatedRecurringIncome.id").value(10));
	}

	@Test
	void markReceivedConflictReturns409() throws Exception {
		when(recurringIncomeService.markReceived(eq(10L), any(MarkReceivedRequest.class)))
			.thenThrow(new RecurringIncomeReceiptConflictException("Recurring income was already updated; refresh and try again"));

		mockMvc.perform(post("/api/recurring-income/10/mark-received")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "expectedNextIncomeDate":"2026-07-01"
						}
						"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("RECURRING_INCOME_RECEIPT_CONFLICT"));
	}

	@Test
	void markReceivedMissingExpectedDateReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-income/10/mark-received")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringIncomeService, never()).markReceived(any(), any());
	}

	@Test
	void markReceivedNullExpectedDateReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-income/10/mark-received")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "expectedNextIncomeDate": null
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringIncomeService, never()).markReceived(any(), any());
	}

	@Test
	void markReceivedMalformedExpectedDateReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-income/10/mark-received")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "expectedNextIncomeDate":"not-a-date"
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

		verify(recurringIncomeService, never()).markReceived(any(), any());
	}

	@Test
	void markReceivedMissingBodyReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-income/10/mark-received")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

		verify(recurringIncomeService, never()).markReceived(any(), any());
	}

	@Test
	void previewOccurrencesReturnsOccurrencesAndSuggestedNext() throws Exception {
		when(recurringIncomeService.previewOccurrences(any(OccurrencePreviewRequest.class))).thenReturn(
			new OccurrencePreviewResponse(
				List.of(new OccurrencePreviewItem(LocalDate.of(2026, 6, 1), new BigDecimal("5000.00"))),
				LocalDate.of(2026, 8, 1)
			)
		);

		mockMvc.perform(post("/api/recurring-income/preview-occurrences")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "cadence":"MONTHLY",
						  "startDate":"2026-06-01",
						  "amount":5000.00
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.occurrences[0].occurrenceDate").value("2026-06-01"))
			.andExpect(jsonPath("$.suggestedNextOnOrAfterToday").value("2026-08-01"));
	}

	@Test
	void previewOccurrencesValidationReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-income/preview-occurrences")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "cadence":"SEMIMONTHLY",
						  "startDate":"2026-06-01",
						  "amount":5000.00,
						  "firstPaymentDay":50
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringIncomeService, never()).previewOccurrences(any());
	}

	@Test
	void catchUpReturnsCreatedSummary() throws Exception {
		when(recurringIncomeService.catchUp(eq(10L), any(CatchUpRequest.class))).thenReturn(
			new RecurringIncomeCatchUpResponse(
				2,
				List.of(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 7, 1)),
				LocalDate.of(2026, 8, 1),
				sample(),
				List.of(
					new IncomeEntryResponse(
						51L, "Salary", "Acme Corp", new BigDecimal("5000.00"), LocalDate.of(2026, 6, 1),
						"Caught up from recurring income #10",
						Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z")
					),
					new IncomeEntryResponse(
						52L, "Salary", "Acme Corp", new BigDecimal("5000.00"), LocalDate.of(2026, 7, 1),
						"Caught up from recurring income #10",
						Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z")
					)
				)
			)
		);

		mockMvc.perform(post("/api/recurring-income/10/catch-up")
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
			.andExpect(jsonPath("$.updatedRecurringIncome.id").value(10))
			.andExpect(jsonPath("$.createdIncomeEntries[1].id").value(52));
	}

	@Test
	void catchUpEmptyDatesReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-income/10/catch-up")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "occurrenceDates":[]
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringIncomeService, never()).catchUp(any(), any());
	}

	@Test
	void catchUpInvalidDatesReturns400WithServiceErrorCode() throws Exception {
		when(recurringIncomeService.catchUp(eq(10L), any(CatchUpRequest.class)))
			.thenThrow(new InvalidRecurringIncomeDataException(
				"occurrenceDates must be a subset of the pending occurrences on or before today"));

		mockMvc.perform(post("/api/recurring-income/10/catch-up")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "occurrenceDates":["2099-01-01"]
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_RECURRING_INCOME_DATA"));
	}
}
