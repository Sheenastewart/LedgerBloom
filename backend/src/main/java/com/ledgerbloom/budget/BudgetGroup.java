package com.ledgerbloom.budget;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * High-level budget buckets. Detailed expense categories map into these groups.
 */
public enum BudgetGroup {
	BILLS("Bills", "2000.00"),
	SUBSCRIPTIONS("Subscriptions", "200.00"),
	GROCERIES("Groceries", "250.00"),
	EATING_OUT("Eating Out", "200.00"),
	TRANSPORTATION("Transportation", "200.00"),
	MEDICAL("Medical", "200.00"),
	CHILD_CARE("Child Care", "500.00"),
	DEBT_PAYMENTS("Debt Payments", "250.00"),
	PERSONAL_HOUSEHOLD("Personal & Household", "500.00");

	private final String label;
	private final BigDecimal presetAmount;

	BudgetGroup(String label, String presetAmount) {
		this.label = label;
		this.presetAmount = new BigDecimal(presetAmount);
	}

	public String getLabel() {
		return label;
	}

	public BigDecimal getPresetAmount() {
		return presetAmount;
	}

	public static Optional<BudgetGroup> tryParse(String raw) {
		if (raw == null || raw.isBlank()) {
			return Optional.empty();
		}
		String normalized = raw.trim().toUpperCase(Locale.ROOT).replace(' ', '_').replace('-', '_');
		return Arrays.stream(values())
			.filter(group -> group.name().equals(normalized))
			.findFirst();
	}

	public static BudgetGroup requireParse(String raw) {
		return tryParse(raw).orElseThrow(() -> new InvalidBudgetDataException(
			"Budget group must be one of: " + String.join(", ",
				Arrays.stream(values()).map(Enum::name).toList())
		));
	}

	/**
	 * Maps a detailed category name onto a budget group. Unknown names fall into
	 * {@link #PERSONAL_HOUSEHOLD}.
	 */
	public static BudgetGroup fromCategoryName(String categoryName) {
		if (categoryName == null || categoryName.isBlank()) {
			return PERSONAL_HOUSEHOLD;
		}
		return switch (categoryName.trim().toLowerCase(Locale.ROOT)) {
			case "housing", "utilities", "internet", "cell phone", "security system", "insurance"
				-> BILLS;
			case "subscriptions", "gym membership", "entertainment" -> SUBSCRIPTIONS;
			case "groceries" -> GROCERIES;
			case "dining out" -> EATING_OUT;
			case "gas", "transportation", "car payment", "car maintenance", "car insurance"
				-> TRANSPORTATION;
			case "medical" -> MEDICAL;
			case "childcare", "child care" -> CHILD_CARE;
			case "debt payments" -> DEBT_PAYMENTS;
			default -> PERSONAL_HOUSEHOLD;
		};
	}
}
