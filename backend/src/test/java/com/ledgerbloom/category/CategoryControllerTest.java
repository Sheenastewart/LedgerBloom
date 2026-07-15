package com.ledgerbloom.category;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.error.GlobalExceptionHandler;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = CategoryController.class)
@Import(GlobalExceptionHandler.class)
class CategoryControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private CategoryService categoryService;

	@Test
	void createReturns201WithLocation() throws Exception {
		CategoryResponse created = new CategoryResponse(
			5L,
			"Groceries",
			"Food",
			Instant.parse("2026-01-01T00:00:00Z"),
			Instant.parse("2026-01-01T00:00:00Z")
		);
		when(categoryService.create(any(CategoryCreateRequest.class))).thenReturn(created);

		mockMvc.perform(post("/api/categories")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"Groceries","description":"Food"}
						"""))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", containsString("/api/categories/5")))
			.andExpect(jsonPath("$.id").value(5))
			.andExpect(jsonPath("$.name").value("Groceries"));
	}

	@Test
	void createBlankNameReturns400WithValidationFields() throws Exception {
		mockMvc.perform(post("/api/categories")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"","description":"x"}
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
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"groceries"}
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
	void listReturnsCategories() throws Exception {
		when(categoryService.findAll()).thenReturn(List.of(
			new CategoryResponse(1L, "bills", null, Instant.now(), Instant.now()),
			new CategoryResponse(2L, "Housing", null, Instant.now(), Instant.now())
		));

		mockMvc.perform(get("/api/categories"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].name").value("bills"))
			.andExpect(jsonPath("$[1].name").value("Housing"));
	}

	@Test
	void updateReturnsUpdatedCategory() throws Exception {
		when(categoryService.update(eq(1L), any(CategoryUpdateRequest.class)))
			.thenReturn(new CategoryResponse(1L, "Housing", "Rent", Instant.now(), Instant.now()));

		mockMvc.perform(put("/api/categories/1")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"Housing","description":"Rent"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Housing"))
			.andExpect(jsonPath("$.description").value("Rent"));
	}

	@Test
	void deleteReturns204() throws Exception {
		doNothing().when(categoryService).delete(1L);

		mockMvc.perform(delete("/api/categories/1"))
			.andExpect(status().isNoContent());

		verify(categoryService).delete(1L);
	}

	@Test
	void deleteMissingReturns404() throws Exception {
		doThrow(new CategoryNotFoundException(42L)).when(categoryService).delete(42L);

		mockMvc.perform(delete("/api/categories/42"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"));
	}
}
