package com.ledgerbloom.recurringincome;

import com.ledgerbloom.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "recurring_income")
public class RecurringIncome {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(nullable = false, length = 160)
	private String description;

	@Column(nullable = false, length = 120)
	private String source;

	@Column(nullable = false, precision = 12, scale = 2)
	private BigDecimal amount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private RecurringIncomeCadence cadence;

	@Column(name = "next_income_date", nullable = false)
	private LocalDate nextIncomeDate;

	@Column(name = "first_payment_day")
	private Integer firstPaymentDay;

	@Column(name = "second_payment_day")
	private Integer secondPaymentDay;

	@Column(nullable = false)
	private boolean active;

	@Column(columnDefinition = "TEXT")
	private String notes;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected RecurringIncome() {
	}

	public RecurringIncome(
			User user,
			String description,
			String source,
			BigDecimal amount,
			RecurringIncomeCadence cadence,
			LocalDate nextIncomeDate,
			boolean active,
			String notes) {
		this(user, description, source, amount, cadence, nextIncomeDate, active, notes, null, null);
	}

	public RecurringIncome(
			User user,
			String description,
			String source,
			BigDecimal amount,
			RecurringIncomeCadence cadence,
			LocalDate nextIncomeDate,
			boolean active,
			String notes,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
		this.user = user;
		this.description = description;
		this.source = source;
		this.amount = amount;
		this.cadence = cadence;
		this.nextIncomeDate = nextIncomeDate;
		this.active = active;
		this.notes = notes;
		this.firstPaymentDay = firstPaymentDay;
		this.secondPaymentDay = secondPaymentDay;
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		this.createdAt = now;
		this.updatedAt = now;
	}

	@PreUpdate
	void onUpdate() {
		this.updatedAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public User getUser() {
		return user;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getSource() {
		return source;
	}

	public void setSource(String source) {
		this.source = source;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public void setAmount(BigDecimal amount) {
		this.amount = amount;
	}

	public RecurringIncomeCadence getCadence() {
		return cadence;
	}

	public void setCadence(RecurringIncomeCadence cadence) {
		this.cadence = cadence;
	}

	public LocalDate getNextIncomeDate() {
		return nextIncomeDate;
	}

	public void setNextIncomeDate(LocalDate nextIncomeDate) {
		this.nextIncomeDate = nextIncomeDate;
	}

	public Integer getFirstPaymentDay() {
		return firstPaymentDay;
	}

	public void setFirstPaymentDay(Integer firstPaymentDay) {
		this.firstPaymentDay = firstPaymentDay;
	}

	public Integer getSecondPaymentDay() {
		return secondPaymentDay;
	}

	public void setSecondPaymentDay(Integer secondPaymentDay) {
		this.secondPaymentDay = secondPaymentDay;
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
