package com.ledgerbloom.category;

import java.util.List;

public record StarterCategoriesResponse(
		int createdCount,
		List<String> createdNames,
		int skippedCount,
		List<String> skippedNames
) {
}
