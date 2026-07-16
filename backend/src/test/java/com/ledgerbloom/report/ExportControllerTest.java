package com.ledgerbloom.report;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.error.GlobalExceptionHandler;
import com.ledgerbloom.support.SecurityTestConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = ExportController.class)
@Import({GlobalExceptionHandler.class, SecurityTestConfig.class})
@WithMockUser(username = "user@example.com")
class ExportControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private ExportService exportService;

	@Test
	void monthlyTransactionsCsvReturnsFileWithHeaders() throws Exception {
		String csv = "Type,Date,Description,SourceOrMerchant,Category,Amount,Notes\r\n"
			+ "INCOME,2026-07-01,Paycheck,Salary,,3000.00,\r\n";
		when(exportService.generateMonthlyTransactionsCsv(2026, 7))
			.thenReturn(new CsvExport("ledgerbloom-transactions-2026-07.csv", csv));

		mockMvc.perform(get("/api/exports/monthly-transactions.csv")
				.param("year", "2026")
				.param("month", "7"))
			.andExpect(status().isOk())
			.andExpect(header().string("Content-Type", "text/csv; charset=UTF-8"))
			.andExpect(header().string(
				"Content-Disposition",
				"attachment; filename=\"ledgerbloom-transactions-2026-07.csv\""
			))
			.andExpect(content().string(csv));
	}

	@Test
	void monthlySummaryCsvReturnsFileWithHeaders() throws Exception {
		String csv = "Monthly Summary,2026,07\r\n\r\nMetric,Value\r\nTotal Income,0.00\r\n";
		when(exportService.generateMonthlySummaryCsv(2026, 7))
			.thenReturn(new CsvExport("ledgerbloom-summary-2026-07.csv", csv));

		mockMvc.perform(get("/api/exports/monthly-summary.csv")
				.param("year", "2026")
				.param("month", "7"))
			.andExpect(status().isOk())
			.andExpect(header().string(
				"Content-Disposition",
				"attachment; filename=\"ledgerbloom-summary-2026-07.csv\""
			))
			.andExpect(content().string(csv));
	}

	@Test
	void monthlyTransactionsCsvInvalidPeriodReturns400() throws Exception {
		when(exportService.generateMonthlyTransactionsCsv(2026, 13))
			.thenThrow(new InvalidReportPeriodException("month must be between 1 and 12"));

		mockMvc.perform(get("/api/exports/monthly-transactions.csv")
				.param("year", "2026")
				.param("month", "13"))
			.andExpect(status().isBadRequest());
	}

	@Test
	void monthlySummaryCsvGenerationFailureReturns500() throws Exception {
		when(exportService.generateMonthlySummaryCsv(2026, 7))
			.thenThrow(new ExportGenerationFailedException("Failed to generate monthly summary export"));

		mockMvc.perform(get("/api/exports/monthly-summary.csv")
				.param("year", "2026")
				.param("month", "7"))
			.andExpect(status().isInternalServerError());
	}

	@Test
	void monthlyTransactionsCsvEmptyExportReturnsHeaderOnly() throws Exception {
		String csv = "Type,Date,Description,SourceOrMerchant,Category,Amount,Notes\r\n";
		when(exportService.generateMonthlyTransactionsCsv(2026, 1))
			.thenReturn(new CsvExport("ledgerbloom-transactions-2026-01.csv", csv));

		mockMvc.perform(get("/api/exports/monthly-transactions.csv")
				.param("year", "2026")
				.param("month", "1"))
			.andExpect(status().isOk())
			.andExpect(content().string(csv));
	}
}
