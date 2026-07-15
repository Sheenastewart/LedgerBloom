package com.ledgerbloom.income;

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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = IncomeEntryController.class)
@Import(GlobalExceptionHandler.class)
class IncomeEntryControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private IncomeEntryService incomeEntryService;

	private IncomeEntryResponse sampleResponse() {
		return new IncomeEntryResponse(
			5L,
			"Freelance payment",
			"Acme Corp",
			new BigDecimal("500.00"),
			LocalDate.of(2026, 7, 10),
			null,
			Instant.parse("2026-01-01T00:00:00Z"),
			Instant.parse("2026-01-01T00:00:00Z")
		);
	}

	@Test
	void createReturns201WithLocation() throws Exception {
		when(incomeEntryService.create(any(IncomeEntryCreateRequest.class))).thenReturn(sampleResponse());

		mockMvc.perform(post("/api/income")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Freelance payment",
						  "source":"Acme Corp",
						  "amount":500.00,
						  "incomeDate":"2026-07-10"
						}
						"""))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", containsString("/api/income/5")))
			.andExpect(jsonPath("$.id").value(5))
			.andExpect(jsonPath("$.source").value("Acme Corp"));
	}

	@Test
	void createBlankDescriptionReturns400() throws Exception {
		mockMvc.perform(post("/api/income")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"",
						  "source":"Acme Corp",
						  "amount":10.00,
						  "incomeDate":"2026-07-10"
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.fieldErrors[0].field").value("description"))
			.andExpect(jsonPath("$.path").value("/api/income"))
			.andExpect(jsonPath("$.timestamp").exists());
	}

	@Test
	void createBlankSourceReturns400() throws Exception {
		mockMvc.perform(post("/api/income")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Freelance payment",
						  "source":"",
						  "amount":10.00,
						  "incomeDate":"2026-07-10"
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	@Test
	void createInvalidAmountReturns400() throws Exception {
		mockMvc.perform(post("/api/income")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Freelance payment",
						  "source":"Acme Corp",
						  "amount":0,
						  "incomeDate":"2026-07-10"
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	@Test
	void listReturnsIncomeEntries() throws Exception {
		when(incomeEntryService.findAll(isNull(), isNull(), isNull())).thenReturn(List.of(sampleResponse()));

		mockMvc.perform(get("/api/income"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].description").value("Freelance payment"));
	}

	@Test
	void filterRequestForwardsQueryParams() throws Exception {
		when(incomeEntryService.findAll(2026, 7, "Acme Corp")).thenReturn(List.of(sampleResponse()));

		mockMvc.perform(get("/api/income")
				.param("year", "2026")
				.param("month", "7")
				.param("source", "Acme Corp"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].id").value(5));

		verify(incomeEntryService).findAll(2026, 7, "Acme Corp");
	}

	@Test
	void invalidPartialMonthFilterReturns400() throws Exception {
		when(incomeEntryService.findAll(2026, null, null))
			.thenThrow(new InvalidIncomeFilterException("year and month must both be provided together"));

		mockMvc.perform(get("/api/income").param("year", "2026"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
	}

	@Test
	void getMissingIncomeEntryReturns404() throws Exception {
		when(incomeEntryService.findById(99L)).thenThrow(new IncomeEntryNotFoundException(99L));

		mockMvc.perform(get("/api/income/99"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("INCOME_ENTRY_NOT_FOUND"))
			.andExpect(jsonPath("$.path").value("/api/income/99"));
	}

	@Test
	void updateReturnsIncomeEntry() throws Exception {
		when(incomeEntryService.update(eq(5L), any(IncomeEntryUpdateRequest.class))).thenReturn(sampleResponse());

		mockMvc.perform(put("/api/income/5")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "description":"Freelance payment",
						  "source":"Acme Corp",
						  "amount":500.00,
						  "incomeDate":"2026-07-10"
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(5));
	}

	@Test
	void deleteReturns204() throws Exception {
		doNothing().when(incomeEntryService).delete(5L);

		mockMvc.perform(delete("/api/income/5"))
			.andExpect(status().isNoContent());

		verify(incomeEntryService).delete(5L);
	}

	@Test
	void deleteMissingReturns404() throws Exception {
		doThrow(new IncomeEntryNotFoundException(42L)).when(incomeEntryService).delete(42L);

		mockMvc.perform(delete("/api/income/42"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("INCOME_ENTRY_NOT_FOUND"));
	}

	@Test
	void structuredErrorShapeOnMissingIncomeEntry() throws Exception {
		when(incomeEntryService.findById(42L)).thenThrow(new IncomeEntryNotFoundException(42L));

		mockMvc.perform(get("/api/income/42"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.timestamp").exists())
			.andExpect(jsonPath("$.status").value(404))
			.andExpect(jsonPath("$.error").exists())
			.andExpect(jsonPath("$.code").value("INCOME_ENTRY_NOT_FOUND"))
			.andExpect(jsonPath("$.message").exists())
			.andExpect(jsonPath("$.path").value("/api/income/42"));
	}
}
