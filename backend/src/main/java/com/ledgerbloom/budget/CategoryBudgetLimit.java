package com.ledgerbloom.budget;

import com.ledgerbloom.category.Category;
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
@Table(name = "category_budget_limits")
public class CategoryBudgetLimit {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "monthly_budget_id", nullable = false)
	private MonthlyBudget monthlyBudget;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id", nullable = false)
	private Category category;

	@Column(name = "limit_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal limitAmount;

	@Column(name = "assistance_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal assistanceAmount = BigDecimal.ZERO;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected CategoryBudgetLimit() {
	}

	public CategoryBudgetLimit(
			User user,
			MonthlyBudget monthlyBudget,
			Category category,
			BigDecimal limitAmount,
			BigDecimal assistanceAmount) {
		this.user = user;
		this.monthlyBudget = monthlyBudget;
		this.category = category;
		this.limitAmount = limitAmount;
		this.assistanceAmount = assistanceAmount != null ? assistanceAmount : BigDecimal.ZERO;
	}

	public CategoryBudgetLimit(User user, MonthlyBudget monthlyBudget, Category category, BigDecimal limitAmount) {
		this(user, monthlyBudget, category, limitAmount, BigDecimal.ZERO);
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

	public void setMonthlyBudget(MonthlyBudget monthlyBudget) {
		this.monthlyBudget = monthlyBudget;
	}

	public Category getCategory() {
		return category;
	}

	public void setCategory(Category category) {
		this.category = category;
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
