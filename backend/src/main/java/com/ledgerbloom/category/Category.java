package com.ledgerbloom.category;

import com.ledgerbloom.budget.BudgetGroup;
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
import java.time.Instant;

@Entity
@Table(name = "categories")
public class Category {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(nullable = false, length = 80)
	private String name;

	@Column(length = 255)
	private String description;

	/** Optional #RRGGBB accent; null means the client picks a default from the name. */
	@Column(length = 7)
	private String color;

	@Enumerated(EnumType.STRING)
	@Column(name = "budget_group", nullable = false, length = 40)
	private BudgetGroup budgetGroup = BudgetGroup.PERSONAL_HOUSEHOLD;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Category() {
	}

	public Category(User user, String name, String description) {
		this(user, name, description, BudgetGroup.fromCategoryName(name));
	}

	public Category(User user, String name, String description, BudgetGroup budgetGroup) {
		this.user = user;
		this.name = name;
		this.description = description;
		this.budgetGroup = budgetGroup != null ? budgetGroup : BudgetGroup.fromCategoryName(name);
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		this.createdAt = now;
		this.updatedAt = now;
		if (this.budgetGroup == null) {
			this.budgetGroup = BudgetGroup.fromCategoryName(this.name);
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

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getColor() {
		return color;
	}

	public void setColor(String color) {
		this.color = color;
	}

	public BudgetGroup getBudgetGroup() {
		return budgetGroup;
	}

	public void setBudgetGroup(BudgetGroup budgetGroup) {
		this.budgetGroup = budgetGroup;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
