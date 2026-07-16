package com.ledgerbloom.recurring;

import com.ledgerbloom.recurring.support.CatchUpRequest;
import com.ledgerbloom.recurring.support.OccurrencePreviewRequest;
import com.ledgerbloom.recurring.support.OccurrencePreviewResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/recurring-expenses")
public class RecurringExpenseController {

	private final RecurringExpenseService recurringExpenseService;

	public RecurringExpenseController(RecurringExpenseService recurringExpenseService) {
		this.recurringExpenseService = recurringExpenseService;
	}

	@GetMapping
	public List<RecurringExpenseResponse> list(
			@RequestParam(required = false) Boolean active,
			@RequestParam(required = false) Long categoryId,
			@RequestParam(required = false) String cadence) {
		return recurringExpenseService.findAll(active, categoryId, cadence);
	}

	@GetMapping("/upcoming")
	public List<RecurringExpenseResponse> upcoming(@RequestParam(required = false) Integer days) {
		return recurringExpenseService.findUpcoming(days);
	}

	@GetMapping("/{id}")
	public RecurringExpenseResponse getById(@PathVariable Long id) {
		return recurringExpenseService.findById(id);
	}

	@PostMapping
	public ResponseEntity<RecurringExpenseResponse> create(
			@Valid @RequestBody RecurringExpenseCreateRequest request) {
		RecurringExpenseResponse created = recurringExpenseService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
			.path("/{id}")
			.buildAndExpand(created.id())
			.toUri();
		return ResponseEntity.created(location).body(created);
	}

	@PutMapping("/{id}")
	public RecurringExpenseResponse update(
			@PathVariable Long id,
			@Valid @RequestBody RecurringExpenseUpdateRequest request) {
		return recurringExpenseService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		recurringExpenseService.delete(id);
	}

	@PostMapping("/{id}/mark-paid")
	public MarkPaidResponse markPaid(
			@PathVariable Long id,
			@Valid @RequestBody MarkPaidRequest request) {
		return recurringExpenseService.markPaid(id, request);
	}

	@PostMapping("/preview-occurrences")
	public OccurrencePreviewResponse previewOccurrences(
			@Valid @RequestBody OccurrencePreviewRequest request) {
		return recurringExpenseService.previewOccurrences(request);
	}

	@PostMapping("/{id}/catch-up")
	public RecurringExpenseCatchUpResponse catchUp(
			@PathVariable Long id,
			@Valid @RequestBody CatchUpRequest request) {
		return recurringExpenseService.catchUp(id, request);
	}
}
