package com.ledgerbloom.budget;

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

@Entity
@Table(name = "budget_group_limits")
public class BudgetGroupLimit {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "monthly_budget_id", nullable = false)
	private MonthlyBudget monthlyBudget;

	@Enumerated(EnumType.STRING)
	@Column(name = "budget_group", nullable = false, length = 40)
	private BudgetGroup budgetGroup;

	@Column(name = "limit_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal limitAmount;

	@Column(name = "assistance_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal assistanceAmount = BigDecimal.ZERO;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected BudgetGroupLimit() {
	}

	public BudgetGroupLimit(
			User user,
			MonthlyBudget monthlyBudget,
			BudgetGroup budgetGroup,
			BigDecimal limitAmount,
			BigDecimal assistanceAmount) {
		this.user = user;
		this.monthlyBudget = monthlyBudget;
		this.budgetGroup = budgetGroup;
		this.limitAmount = limitAmount;
		this.assistanceAmount = assistanceAmount != null ? assistanceAmount : BigDecimal.ZERO;
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		this.createdAt = now;
		this.updatedAt = now;
		if (this.assistanceAmount == null) {
			this.assistanceAmount = BigDecimal.ZERO;
		}
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

	public MonthlyBudget getMonthlyBudget() {
		return monthlyBudget;
	}

	public BudgetGroup getBudgetGroup() {
		return budgetGroup;
	}

	public void setBudgetGroup(BudgetGroup budgetGroup) {
		this.budgetGroup = budgetGroup;
	}

	public BigDecimal getLimitAmount() {
		return limitAmount;
	}

	public void setLimitAmount(BigDecimal limitAmount) {
		this.limitAmount = limitAmount;
	}

	public BigDecimal getAssistanceAmount() {
		return assistanceAmount;
	}

	public void setAssistanceAmount(BigDecimal assistanceAmount) {
		this.assistanceAmount = assistanceAmount;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
