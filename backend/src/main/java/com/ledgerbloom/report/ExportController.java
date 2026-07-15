package com.ledgerbloom.report;

import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exports")
public class ExportController {

	private final ExportService exportService;

	public ExportController(ExportService exportService) {
		this.exportService = exportService;
	}

	@GetMapping("/monthly-transactions.csv")
	public ResponseEntity<byte[]> monthlyTransactionsCsv(
			@RequestParam(required = false) Integer year,
			@RequestParam(required = false) Integer month) {
		return toCsvResponse(exportService.generateMonthlyTransactionsCsv(year, month));
	}

	@GetMapping("/monthly-summary.csv")
	public ResponseEntity<byte[]> monthlySummaryCsv(
			@RequestParam(required = false) Integer year,
			@RequestParam(required = false) Integer month) {
		return toCsvResponse(exportService.generateMonthlySummaryCsv(year, month));
	}

	private ResponseEntity<byte[]> toCsvResponse(CsvExport export) {
		byte[] body = export.content().getBytes(StandardCharsets.UTF_8);
		return ResponseEntity.ok()
			.header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
			.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + export.filename() + "\"")
			.body(body);
	}
}
