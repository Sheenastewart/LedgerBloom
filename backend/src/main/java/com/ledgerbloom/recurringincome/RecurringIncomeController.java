package com.ledgerbloom.recurringincome;

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
@RequestMapping("/api/recurring-income")
public class RecurringIncomeController {

	private final RecurringIncomeService recurringIncomeService;

	public RecurringIncomeController(RecurringIncomeService recurringIncomeService) {
		this.recurringIncomeService = recurringIncomeService;
	}

	@GetMapping
	public List<RecurringIncomeResponse> list(
			@RequestParam(required = false) Boolean active,
			@RequestParam(required = false) String cadence,
			@RequestParam(required = false) String source) {
		return recurringIncomeService.findAll(active, cadence, source);
	}

	@GetMapping("/upcoming")
	public List<RecurringIncomeResponse> upcoming(@RequestParam(required = false) Integer days) {
		return recurringIncomeService.findUpcoming(days);
	}

	@GetMapping("/{id}")
	public RecurringIncomeResponse getById(@PathVariable Long id) {
		return recurringIncomeService.findById(id);
	}

	@PostMapping
	public ResponseEntity<RecurringIncomeResponse> create(
			@Valid @RequestBody RecurringIncomeCreateRequest request) {
		RecurringIncomeResponse created = recurringIncomeService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
			.path("/{id}")
			.buildAndExpand(created.id())
			.toUri();
		return ResponseEntity.created(location).body(created);
	}

	@PutMapping("/{id}")
	public RecurringIncomeResponse update(
			@PathVariable Long id,
			@Valid @RequestBody RecurringIncomeUpdateRequest request) {
		return recurringIncomeService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		recurringIncomeService.delete(id);
	}

	@PostMapping("/{id}/mark-received")
	public MarkReceivedResponse markReceived(
			@PathVariable Long id,
			@Valid @RequestBody MarkReceivedRequest request) {
		return recurringIncomeService.markReceived(id, request);
	}
}
