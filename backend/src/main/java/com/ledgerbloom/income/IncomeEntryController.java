package com.ledgerbloom.income;

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
@RequestMapping("/api/income")
public class IncomeEntryController {

	private final IncomeEntryService incomeEntryService;

	public IncomeEntryController(IncomeEntryService incomeEntryService) {
		this.incomeEntryService = incomeEntryService;
	}

	@GetMapping
	public List<IncomeEntryResponse> list(
			@RequestParam(required = false) Integer year,
			@RequestParam(required = false) Integer month,
			@RequestParam(required = false) String source) {
		return incomeEntryService.findAll(year, month, source);
	}

	@GetMapping("/{id}")
	public IncomeEntryResponse getById(@PathVariable Long id) {
		return incomeEntryService.findById(id);
	}

	@PostMapping
	public ResponseEntity<IncomeEntryResponse> create(@Valid @RequestBody IncomeEntryCreateRequest request) {
		IncomeEntryResponse created = incomeEntryService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
			.path("/{id}")
			.buildAndExpand(created.id())
			.toUri();
		return ResponseEntity.created(location).body(created);
	}

	@PutMapping("/{id}")
	public IncomeEntryResponse update(
			@PathVariable Long id,
			@Valid @RequestBody IncomeEntryUpdateRequest request) {
		return incomeEntryService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		incomeEntryService.delete(id);
	}
}
