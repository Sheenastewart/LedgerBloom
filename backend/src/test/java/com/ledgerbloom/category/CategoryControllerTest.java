package com.ledgerbloom.category;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.error.GlobalExceptionHandler;
import com.ledgerbloom.support.SecurityTestConfig;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = CategoryController.class)
@Import({GlobalExceptionHandler.class, SecurityTestConfig.class})
@WithMockUser(username = "user@example.com")
class CategoryControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private CategoryService categoryService;

	private static CategoryResponse sample(
			Long id,
			String name,
			String description,
			String budgetGroup,
			String budgetGroupLabel) {
		return new CategoryResponse(
			id,
			name,
			description,
			null,
			budgetGroup,
			budgetGroupLabel,
			Instant.parse("2026-01-01T00:00:00Z"),
			Instant.parse("2026-01-01T00:00:00Z")
		);
	}

	@Test
	void createReturns201WithLocation() throws Exception {
		when(categoryService.create(any(CategoryCreateRequest.class)))
			.thenReturn(sample(5L, "Groceries", "Food", "GROCERIES", "Groceries"));

		mockMvc.perform(post("/api/categories")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"Groceries","description":"Food","budgetGroup":"GROCERIES"}
						"""))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", containsString("/api/categories/5")))
			.andExpect(jsonPath("$.id").value(5))
			.andExpect(jsonPath("$.name").value("Groceries"))
			.andExpect(jsonPath("$.budgetGroup").value("GROCERIES"));
	}

	@Test
	void createBlankNameReturns400WithValidationFields() throws Exception {
		mockMvc.perform(post("/api/categories")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"","description":"x","budgetGroup":"GROCERIES"}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.status").value(400))
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.path").value("/api/categories"))
			.andExpect(jsonPath("$.timestamp").exists())
			.andExpect(jsonPath("$.error").exists())
			.andExpect(jsonPath("$.message").exists())
			.andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
	}

	@Test
	void createDuplicateReturns409() throws Exception {
		when(categoryService.create(any(CategoryCreateRequest.class)))
			.thenThrow(new CategoryNameAlreadyExistsException("Groceries"));

		mockMvc.perform(post("/api/categories")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"groceries","budgetGroup":"GROCERIES"}
						"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("CATEGORY_NAME_ALREADY_EXISTS"))
			.andExpect(jsonPath("$.status").value(409));
	}

	@Test
	void getMissingReturns404() throws Exception {
		when(categoryService.findById(99L)).thenThrow(new CategoryNotFoundException(99L));

		mockMvc.perform(get("/api/categories/99"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"))
			.andExpect(jsonPath("$.path").value("/api/categories/99"));
	}

	@Test
	@WithAnonymousUser
	void listWithoutAuthenticationReturns401() throws Exception {
		mockMvc.perform(get("/api/categories"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void listReturnsCategories() throws Exception {
		when(categoryService.findAll()).thenReturn(List.of(
			sample(1L, "bills", null, "BILLS", "Bills"),
			sample(2L, "Housing", null, "BILLS", "Bills")
		));

		mockMvc.perform(get("/api/categories"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].name").value("bills"))
			.andExpect(jsonPath("$[1].name").value("Housing"));
	}

	@Test
	void updateReturnsUpdatedCategory() throws Exception {
		when(categoryService.update(eq(1L), any(CategoryUpdateRequest.class)))
			.thenReturn(sample(1L, "Housing", "Rent", "BILLS", "Bills"));

		mockMvc.perform(put("/api/categories/1")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"Housing","description":"Rent","budgetGroup":"BILLS"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Housing"))
			.andExpect(jsonPath("$.description").value("Rent"))
			.andExpect(jsonPath("$.budgetGroup").value("BILLS"));
	}

	@Test
	void deleteReturns204() throws Exception {
		doNothing().when(categoryService).delete(1L);

		mockMvc.perform(delete("/api/categories/1").with(csrf()))
			.andExpect(status().isNoContent());

		verify(categoryService).delete(1L);
	}

	@Test
	void deleteInUseReturns409() throws Exception {
		doThrow(new CategoryInUseException(1L)).when(categoryService).delete(1L);

		mockMvc.perform(delete("/api/categories/1").with(csrf()))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("CATEGORY_IN_USE"))
			.andExpect(jsonPath("$.status").value(409));
	}

	@Test
	void deleteMissingReturns404() throws Exception {
		doThrow(new CategoryNotFoundException(42L)).when(categoryService).delete(42L);

		mockMvc.perform(delete("/api/categories/42").with(csrf()))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"));
	}

	@Test
	void addStarterSetReturnsCreatedAndSkippedSummary() throws Exception {
		when(categoryService.addStarterSet()).thenReturn(new StarterCategoriesResponse(
			2,
			List.of("Housing", "Utilities"),
			1,
			List.of("Groceries")
		));

		mockMvc.perform(post("/api/categories/starter-set").with(csrf()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.createdCount").value(2))
			.andExpect(jsonPath("$.createdNames[0]").value("Housing"))
			.andExpect(jsonPath("$.createdNames[1]").value("Utilities"))
			.andExpect(jsonPath("$.skippedCount").value(1))
			.andExpect(jsonPath("$.skippedNames[0]").value("Groceries"));
	}
}
