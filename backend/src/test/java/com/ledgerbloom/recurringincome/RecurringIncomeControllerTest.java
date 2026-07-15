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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.error.GlobalExceptionHandler;
import com.ledgerbloom.income.IncomeEntryResponse;
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

@WebMvcTest(controllers = RecurringIncomeController.class)
@Import(GlobalExceptionHandler.class)
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
			Instant.parse("2026-01-01T00:00:00Z")
		);
	}

	@Test
	void createReturns201WithLocation() throws Exception {
		when(recurringIncomeService.create(any(RecurringIncomeCreateRequest.class))).thenReturn(sample());

		mockMvc.perform(post("/api/recurring-income")
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

		mockMvc.perform(delete("/api/recurring-income/10"))
			.andExpect(status().isNoContent());
	}

	@Test
	void deleteMissingReturns404() throws Exception {
		doThrow(new RecurringIncomeNotFoundException(42L)).when(recurringIncomeService).delete(42L);

		mockMvc.perform(delete("/api/recurring-income/42"))
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
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

		verify(recurringIncomeService, never()).markReceived(any(), any());
	}

	@Test
	void markReceivedNullExpectedDateReturns400() throws Exception {
		mockMvc.perform(post("/api/recurring-income/10/mark-received")
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
				.contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

		verify(recurringIncomeService, never()).markReceived(any(), any());
	}
}
