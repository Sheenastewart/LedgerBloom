package com.ledgerbloom.dashboard;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.error.GlobalExceptionHandler;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = MonthlyDashboardController.class)
@Import(GlobalExceptionHandler.class)
class MonthlyDashboardControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private MonthlyDashboardService monthlyDashboardService;

	@Test
	void getMonthlyReturnsDashboardPayload() throws Exception {
		when(monthlyDashboardService.getMonthlyDashboard(2026, 7)).thenReturn(sampleResponse());

		mockMvc.perform(get("/api/dashboard/monthly").param("year", "2026").param("month", "7"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.year").value(2026))
			.andExpect(jsonPath("$.month").value(7))
			.andExpect(jsonPath("$.totalIncome").value(3250.5))
			.andExpect(jsonPath("$.totalExpenses").value(200.25))
			.andExpect(jsonPath("$.netCashFlow").value(3050.25))
			.andExpect(jsonPath("$.incomeEntryCount").value(2))
			.andExpect(jsonPath("$.expenseEntryCount").value(2))
			.andExpect(jsonPath("$.spendingByCategory[0].categoryName").value("Utilities"))
			.andExpect(jsonPath("$.incomeBySource[0].source").value("Salary"))
			.andExpect(jsonPath("$.largestExpense.description").value("Power"))
			.andExpect(jsonPath("$.largestIncome.description").value("Paycheck"));
	}

	@Test
	void getMonthlyMissingParamsReturns400() throws Exception {
		when(monthlyDashboardService.getMonthlyDashboard(isNull(), eq(7)))
			.thenThrow(new InvalidDashboardFilterException("year and month must both be provided"));

		mockMvc.perform(get("/api/dashboard/monthly").param("month", "7"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
			.andExpect(jsonPath("$.message").value("year and month must both be provided"))
			.andExpect(jsonPath("$.path").value("/api/dashboard/monthly"));
	}

	@Test
	void getMonthlyInvalidMonthReturns400() throws Exception {
		when(monthlyDashboardService.getMonthlyDashboard(2026, 13))
			.thenThrow(new InvalidDashboardFilterException("month must be between 1 and 12"));

		mockMvc.perform(get("/api/dashboard/monthly").param("year", "2026").param("month", "13"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
			.andExpect(jsonPath("$.message").value("month must be between 1 and 12"));
	}

	@Test
	void getMonthlyEmptyMonthReturnsZeros() throws Exception {
		when(monthlyDashboardService.getMonthlyDashboard(2026, 1)).thenReturn(
			new MonthlyDashboardResponse(
				2026,
				1,
				new BigDecimal("0.00"),
				new BigDecimal("0.00"),
				new BigDecimal("0.00"),
				0,
				0,
				List.of(),
				List.of(),
				null,
				null
			)
		);

		mockMvc.perform(get("/api/dashboard/monthly").param("year", "2026").param("month", "1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalIncome").value(0.0))
			.andExpect(jsonPath("$.totalExpenses").value(0.0))
			.andExpect(jsonPath("$.netCashFlow").value(0.0))
			.andExpect(jsonPath("$.incomeEntryCount").value(0))
			.andExpect(jsonPath("$.expenseEntryCount").value(0))
			.andExpect(jsonPath("$.largestExpense").value(nullValue()))
			.andExpect(jsonPath("$.largestIncome").value(nullValue()));
	}

	private MonthlyDashboardResponse sampleResponse() {
		return new MonthlyDashboardResponse(
			2026,
			7,
			new BigDecimal("3250.50"),
			new BigDecimal("200.25"),
			new BigDecimal("3050.25"),
			2,
			2,
			List.of(new CategorySpendingTotal(2L, "Utilities", new BigDecimal("120.25"), 1)),
			List.of(new SourceIncomeTotal("Salary", new BigDecimal("3000.00"), 1)),
			new LargestExpenseSummary(
				21L,
				"Power",
				new BigDecimal("120.25"),
				LocalDate.of(2026, 7, 5),
				"Utilities"
			),
			new LargestIncomeSummary(
				10L,
				"Paycheck",
				new BigDecimal("3000.00"),
				LocalDate.of(2026, 7, 1),
				"Salary"
			)
		);
	}
}
