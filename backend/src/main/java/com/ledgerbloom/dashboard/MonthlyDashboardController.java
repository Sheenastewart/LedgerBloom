package com.ledgerbloom.dashboard;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class MonthlyDashboardController {

	private final MonthlyDashboardService monthlyDashboardService;

	public MonthlyDashboardController(MonthlyDashboardService monthlyDashboardService) {
		this.monthlyDashboardService = monthlyDashboardService;
	}

	@GetMapping("/monthly")
	public MonthlyDashboardResponse getMonthly(
			@RequestParam(required = false) Integer year,
			@RequestParam(required = false) Integer month) {
		return monthlyDashboardService.getMonthlyDashboard(year, month);
	}
}
