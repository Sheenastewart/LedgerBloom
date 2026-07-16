package com.ledgerbloom.budget;

import com.ledgerbloom.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(name = "monthly_budgets")
public class MonthlyBudget {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(name = "budget_year", nullable = false)
	private Integer budgetYear;

	@Column(name = "budget_month", nullable = false)
	private Integer budgetMonth;

	@Column(name = "total_limit", nullable = false, precision = 12, scale = 2)
	private BigDecimal totalLimit;

	/** When true, auto-generation / auto-refresh will not change this budget. */
	@Column(name = "user_modified", nullable = false)
	private boolean userModified = false;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected MonthlyBudget() {
	}

	public MonthlyBudget(User user, Integer budgetYear, Integer budgetMonth, BigDecimal totalLimit) {
		this(user, budgetYear, budgetMonth, totalLimit, false);
	}

	public MonthlyBudget(
			User user,
			Integer budgetYear,
			Integer budgetMonth,
			BigDecimal totalLimit,
			boolean userModified) {
		this.user = user;
		this.budgetYear = budgetYear;
		this.budgetMonth = budgetMonth;
		this.totalLimit = totalLimit;
		this.userModified = userModified;
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

	public Integer getBudgetYear() {
		return budgetYear;
	}

	public void setBudgetYear(Integer budgetYear) {
		this.budgetYear = budgetYear;
	}

	public Integer getBudgetMonth() {
		return budgetMonth;
	}

	public void setBudgetMonth(Integer budgetMonth) {
		this.budgetMonth = budgetMonth;
	}

	public BigDecimal getTotalLimit() {
		return totalLimit;
	}

	public void setTotalLimit(BigDecimal totalLimit) {
		this.totalLimit = totalLimit;
	}

	public boolean isUserModified() {
		return userModified;
	}

	public void setUserModified(boolean userModified) {
		this.userModified = userModified;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
