package com.ledgerbloom.report;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.error.GlobalExceptionHandler;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = ReportController.class)
@Import(GlobalExceptionHandler.class)
class ReportControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ReportService reportService;

	@Test
	void getMonthlyComparisonReturnsPayload() throws Exception {
		when(reportService.getMonthlyComparison(2026, 1, 2026, 2)).thenReturn(sampleComparison());

		mockMvc.perform(get("/api/reports/monthly-comparison")
				.param("startYear", "2026")
				.param("startMonth", "1")
				.param("endYear", "2026")
				.param("endMonth", "2"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.startYear").value(2026))
			.andExpect(jsonPath("$.monthCount").value(2))
			.andExpect(jsonPath("$.months[0].totalIncome").value(1000.0))
			.andExpect(jsonPath("$.months[1].month").value(2));
	}

	@Test
	void getMonthlyComparisonInvalidPeriodReturns400() throws Exception {
		when(reportService.getMonthlyComparison(2026, 13, 2026, 1))
			.thenThrow(new InvalidReportPeriodException("month must be between 1 and 12"));

		mockMvc.perform(get("/api/reports/monthly-comparison")
				.param("startYear", "2026")
				.param("startMonth", "13")
				.param("endYear", "2026")
				.param("endMonth", "1"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REPORT_PERIOD"))
			.andExpect(jsonPath("$.message").value("month must be between 1 and 12"));
	}

	@Test
	void getMonthlyComparisonRangeTooLargeReturns400() throws Exception {
		when(reportService.getMonthlyComparison(2024, 1, 2026, 2))
			.thenThrow(new ReportRangeTooLargeException("Requested report range spans 26 months; max is 24 months"));

		mockMvc.perform(get("/api/reports/monthly-comparison")
				.param("startYear", "2024")
				.param("startMonth", "1")
				.param("endYear", "2026")
				.param("endMonth", "2"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("REPORT_RANGE_TOO_LARGE"))
			.andExpect(jsonPath("$.message").value("Requested report range spans 26 months; max is 24 months"));
	}

	@Test
	void getYearToDateReturnsPayload() throws Exception {
		when(reportService.getYearToDate(2025)).thenReturn(sampleYearToDate());

		mockMvc.perform(get("/api/reports/year-to-date").param("year", "2025"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.year").value(2025))
			.andExpect(jsonPath("$.totals.totalIncome").value(1000.0))
			.andExpect(jsonPath("$.monthsOverBudget").value(1));
	}

	@Test
	void getYearToDateFutureYearReturns400() throws Exception {
		when(reportService.getYearToDate(9999))
			.thenThrow(new InvalidReportPeriodException("Cannot report on a future year"));

		mockMvc.perform(get("/api/reports/year-to-date").param("year", "9999"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REPORT_PERIOD"))
			.andExpect(jsonPath("$.message").value("Cannot report on a future year"));
	}

	private MonthlyComparisonResponse sampleComparison() {
		MonthlyComparisonItem jan = new MonthlyComparisonItem(
			2026, 1,
			new BigDecimal("1000.00"), new BigDecimal("400.00"), new BigDecimal("600.00"),
			1, 1,
			null, null, null, null,
			new BigDecimal("0.00"), new BigDecimal("0.00"), new BigDecimal("600.00")
		);
		MonthlyComparisonItem feb = new MonthlyComparisonItem(
			2026, 2,
			new BigDecimal("500.00"), new BigDecimal("700.00"), new BigDecimal("-200.00"),
			1, 1,
			null, null, null, null,
			new BigDecimal("0.00"), new BigDecimal("0.00"), new BigDecimal("-200.00")
		);
		return new MonthlyComparisonResponse(2026, 1, 2026, 2, 2, List.of(jan, feb));
	}

	private YearToDateResponse sampleYearToDate() {
		MonthlyComparisonItem jan = new MonthlyComparisonItem(
			2025, 1,
			new BigDecimal("1000.00"), new BigDecimal("400.00"), new BigDecimal("600.00"),
			1, 1,
			new BigDecimal("300.00"), new BigDecimal("-100.00"), new BigDecimal("133.33"), true,
			new BigDecimal("0.00"), new BigDecimal("0.00"), new BigDecimal("600.00")
		);
		return new YearToDateResponse(
			2025,
			new YearToDateTotals(new BigDecimal("1000.00"), new BigDecimal("400.00"), new BigDecimal("600.00")),
			new YearToDateAverages(new BigDecimal("1000.00"), new BigDecimal("400.00"), new BigDecimal("600.00")),
			new MonthMetricSummary(2025, 1, new BigDecimal("1000.00")),
			new MonthMetricSummary(2025, 1, new BigDecimal("400.00")),
			new MonthMetricSummary(2025, 1, new BigDecimal("600.00")),
			new MonthMetricSummary(2025, 1, new BigDecimal("600.00")),
			new BigDecimal("300.00"),
			new BigDecimal("-100.00"),
			1,
			List.of(),
			List.of(),
			List.of(jan)
		);
	}
}
