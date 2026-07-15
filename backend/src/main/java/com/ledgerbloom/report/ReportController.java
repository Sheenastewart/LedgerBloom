package com.ledgerbloom.report;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

	private final ReportService reportService;

	public ReportController(ReportService reportService) {
		this.reportService = reportService;
	}

	@GetMapping("/monthly-comparison")
	public MonthlyComparisonResponse getMonthlyComparison(
			@RequestParam(required = false) Integer startYear,
			@RequestParam(required = false) Integer startMonth,
			@RequestParam(required = false) Integer endYear,
			@RequestParam(required = false) Integer endMonth) {
		return reportService.getMonthlyComparison(startYear, startMonth, endYear, endMonth);
	}

	@GetMapping("/year-to-date")
	public YearToDateResponse getYearToDate(@RequestParam(required = false) Integer year) {
		return reportService.getYearToDate(year);
	}
}
