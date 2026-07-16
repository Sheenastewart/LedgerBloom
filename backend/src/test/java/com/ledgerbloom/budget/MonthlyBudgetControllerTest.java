package com.ledgerbloom.budget;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.error.GlobalExceptionHandler;
import com.ledgerbloom.support.SecurityTestConfig;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = MonthlyBudgetController.class)
@Import({GlobalExceptionHandler.class, SecurityTestConfig.class})
@WithMockUser(username = "user@example.com")
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
			new BigDecimal("4300.00"),
			new BigDecimal("200.00"),
			new BigDecimal("200.00"),
			new BigDecimal("0.00"),
			new BigDecimal("4100.00"),
			new BigDecimal("4.65"),
			false,
			false,
			2,
			List.of(new BudgetGroupLimitResponse(
				50L,
				BudgetGroupSummary.from(BudgetGroup.GROCERIES),
				new BigDecimal("250.00"),
				new BigDecimal("0.00"),
				new BigDecimal("80.00"),
				new BigDecimal("80.00"),
				new BigDecimal("170.00"),
				new BigDecimal("32.00"),
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
			.andExpect(jsonPath("$.userModified").value(false))
			.andExpect(jsonPath("$.groupLimits[0].group.label").value("Groceries"));
	}

	@Test
	void getMissingBudgetReturns404() throws Exception {
		when(monthlyBudgetService.getByYearAndMonth(2026, 8))
			.thenThrow(new MonthlyBudgetNotFoundException(2026, 8));

		mockMvc.perform(get("/api/budgets/monthly").param("year", "2026").param("month", "8"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("BUDGET_NOT_FOUND"));
	}

	@Test
	@WithAnonymousUser
	void getUnauthorizedReturns401() throws Exception {
		mockMvc.perform(get("/api/budgets/monthly").param("year", "2026").param("month", "7"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void generateCreatesBudget() throws Exception {
		when(monthlyBudgetService.generateFromSchedules(any(MonthlyBudgetGenerateRequest.class)))
			.thenReturn(sampleResponse());

		mockMvc.perform(post("/api/budgets/monthly/generate").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"year":2026,"month":7}
					"""))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", containsString("/api/budgets/monthly")))
			.andExpect(jsonPath("$.groupLimits[0].group.key").value("GROCERIES"));
	}

	@Test
	void createGroupLimit() throws Exception {
		when(monthlyBudgetService.createGroupLimit(eq(10L), any(BudgetGroupLimitCreateRequest.class)))
			.thenReturn(sampleResponse());

		mockMvc.perform(post("/api/budgets/monthly/10/groups").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"budgetGroup":"GROCERIES","limitAmount":250.00,"assistanceAmount":0}
					"""))
			.andExpect(status().isCreated());
	}

	@Test
	void createGroupLimitInvalidAmountReturns400() throws Exception {
		mockMvc.perform(post("/api/budgets/monthly/10/groups").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"budgetGroup":"GROCERIES","limitAmount":0,"assistanceAmount":0}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	@Test
	void createGroupLimitInvalidGroupReturns400() throws Exception {
		when(monthlyBudgetService.createGroupLimit(eq(10L), any(BudgetGroupLimitCreateRequest.class)))
			.thenThrow(new InvalidBudgetDataException("Budget group must be one of: BILLS, SUBSCRIPTIONS"));

		mockMvc.perform(post("/api/budgets/monthly/10/groups").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"budgetGroup":"NOT_A_GROUP","limitAmount":250.00,"assistanceAmount":0}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_BUDGET_DATA"));
	}

	@Test
	void createGroupLimitMalformedRequestReturns400() throws Exception {
		mockMvc.perform(post("/api/budgets/monthly/10/groups").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"budgetGroup":"GROCERIES","limitAmount":"not-a-number"}
					"""))
			.andExpect(status().isBadRequest());
	}

	@Test
	void updateGroupLimit() throws Exception {
		when(monthlyBudgetService.updateGroupLimit(eq(10L), eq(50L), any(BudgetGroupLimitUpdateRequest.class)))
			.thenReturn(sampleResponse());

		mockMvc.perform(put("/api/budgets/monthly/10/groups/50").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"limitAmount":300.00,"assistanceAmount":0}
					"""))
			.andExpect(status().isOk());
	}

	@Test
	void deleteGroupLimitSuccess() throws Exception {
		when(monthlyBudgetService.deleteGroupLimit(10L, 50L)).thenReturn(sampleResponse());

		mockMvc.perform(delete("/api/budgets/monthly/10/groups/50").with(csrf()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(10));
	}

	@Test
	void deleteMissingGroupLimitReturns404() throws Exception {
		when(monthlyBudgetService.deleteGroupLimit(10L, 99L))
			.thenThrow(new BudgetGroupLimitNotFoundException(10L, 99L));

		mockMvc.perform(delete("/api/budgets/monthly/10/groups/99").with(csrf()))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("CATEGORY_BUDGET_LIMIT_NOT_FOUND"));
	}

	@Test
	void deleteGroupLimitCrossUserReturns404() throws Exception {
		when(monthlyBudgetService.deleteGroupLimit(10L, 50L))
			.thenThrow(new MonthlyBudgetNotFoundException(10L));

		mockMvc.perform(delete("/api/budgets/monthly/10/groups/50").with(csrf()))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("BUDGET_NOT_FOUND"));
	}

	@Test
	@WithAnonymousUser
	void deleteGroupLimitUnauthorizedReturns401() throws Exception {
		mockMvc.perform(delete("/api/budgets/monthly/10/groups/50").with(csrf()))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void restoreDefaultsSuccess() throws Exception {
		when(monthlyBudgetService.restoreDefaultGroupLimits(10L)).thenReturn(
			new BudgetGroupRestoreDefaultsResponse(
				sampleResponse(),
				List.of(BudgetGroupSummary.from(BudgetGroup.BILLS)),
				List.of(BudgetGroupSummary.from(BudgetGroup.GROCERIES))
			)
		);

		mockMvc.perform(post("/api/budgets/monthly/10/groups/restore-defaults").with(csrf()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.restored[0].key").value("BILLS"))
			.andExpect(jsonPath("$.skipped[0].key").value("GROCERIES"))
			.andExpect(jsonPath("$.budget.id").value(10));
	}

	@Test
	void restoreDefaultsIdempotent() throws Exception {
		when(monthlyBudgetService.restoreDefaultGroupLimits(10L)).thenReturn(
			new BudgetGroupRestoreDefaultsResponse(
				sampleResponse(),
				List.of(),
				List.of(BudgetGroupSummary.from(BudgetGroup.GROCERIES))
			)
		);

		mockMvc.perform(post("/api/budgets/monthly/10/groups/restore-defaults").with(csrf()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.restored").isEmpty())
			.andExpect(jsonPath("$.skipped[0].key").value("GROCERIES"));
	}

	@Test
	void restoreDefaultsMissingBudgetReturns404() throws Exception {
		when(monthlyBudgetService.restoreDefaultGroupLimits(99L))
			.thenThrow(new MonthlyBudgetNotFoundException(99L));

		mockMvc.perform(post("/api/budgets/monthly/99/groups/restore-defaults").with(csrf()))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("BUDGET_NOT_FOUND"));
	}

	@Test
	void deleteBudget() throws Exception {
		doNothing().when(monthlyBudgetService).delete(10L);

		mockMvc.perform(delete("/api/budgets/monthly/10").with(csrf()))
			.andExpect(status().isNoContent());
	}

	@Test
	void deleteMissingBudgetReturns404() throws Exception {
		doThrow(new MonthlyBudgetNotFoundException(99L)).when(monthlyBudgetService).delete(99L);

		mockMvc.perform(delete("/api/budgets/monthly/99").with(csrf()))
			.andExpect(status().isNotFound());
	}
}
