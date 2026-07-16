package com.ledgerbloom.recurring;

import com.ledgerbloom.expense.Expense;
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
 * Idempotency record linking a recurring expense schedule to a single cadence occurrence date.
 * The unique (recurring_expense_id, occurrence_date) constraint lets catch-up and mark-paid
 * share the same idempotent insert semantics for a given schedule + date.
 */
@Entity
@Table(name = "recurring_expense_occurrence_records")
public class RecurringExpenseOccurrenceRecord {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "recurring_expense_id", nullable = false)
	private RecurringExpense recurringExpense;

	@Column(name = "occurrence_date", nullable = false)
	private LocalDate occurrenceDate;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "expense_id", nullable = false)
	private Expense expense;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected RecurringExpenseOccurrenceRecord() {
	}

	public RecurringExpenseOccurrenceRecord(
			RecurringExpense recurringExpense,
			LocalDate occurrenceDate,
			Expense expense) {
		this.recurringExpense = recurringExpense;
		this.occurrenceDate = occurrenceDate;
		this.expense = expense;
	}

	@PrePersist
	void onCreate() {
		this.createdAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public RecurringExpense getRecurringExpense() {
		return recurringExpense;
	}

	public LocalDate getOccurrenceDate() {
		return occurrenceDate;
	}

	public Expense getExpense() {
		return expense;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
