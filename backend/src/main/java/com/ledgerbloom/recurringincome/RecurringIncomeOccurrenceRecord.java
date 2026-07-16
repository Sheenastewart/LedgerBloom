package com.ledgerbloom.recurringincome;

import com.ledgerbloom.income.IncomeEntry;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Idempotency record linking a recurring income schedule to a single cadence occurrence date.
 * The unique (recurring_income_id, occurrence_date) constraint lets catch-up and mark-received
 * share the same idempotent insert semantics for a given schedule + date.
 */
@Entity
@Table(name = "recurring_income_occurrence_records")
public class RecurringIncomeOccurrenceRecord {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "recurring_income_id", nullable = false)
	private RecurringIncome recurringIncome;

	@Column(name = "occurrence_date", nullable = false)
	private LocalDate occurrenceDate;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "income_entry_id", nullable = false)
	private IncomeEntry incomeEntry;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected RecurringIncomeOccurrenceRecord() {
	}

	public RecurringIncomeOccurrenceRecord(
			RecurringIncome recurringIncome,
			LocalDate occurrenceDate,
			IncomeEntry incomeEntry) {
		this.recurringIncome = recurringIncome;
		this.occurrenceDate = occurrenceDate;
		this.incomeEntry = incomeEntry;
	}

	@PrePersist
	void onCreate() {
		this.createdAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public RecurringIncome getRecurringIncome() {
		return recurringIncome;
	}

	public LocalDate getOccurrenceDate() {
		return occurrenceDate;
	}

	public IncomeEntry getIncomeEntry() {
		return incomeEntry;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
