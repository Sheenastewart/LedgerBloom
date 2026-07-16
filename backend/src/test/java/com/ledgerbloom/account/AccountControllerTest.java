package com.ledgerbloom.account;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.auth.UserResponse;
import com.ledgerbloom.error.GlobalExceptionHandler;
import com.ledgerbloom.support.SecurityTestConfig;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = AccountController.class)
@Import({GlobalExceptionHandler.class, SecurityTestConfig.class})
@WithMockUser(username = "user@example.com")
class AccountControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private AccountService accountService;

	@MockitoBean
	private CurrentUser currentUser;

	@Test
	void getAccountReturnsAuthenticatedProfile() throws Exception {
		when(currentUser.requireUserId()).thenReturn(1L);
		when(accountService.getProfile(1L)).thenReturn(sampleResponse("Jane Doe"));

		mockMvc.perform(get("/api/account"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("user@example.com"))
			.andExpect(jsonPath("$.displayName").value("Jane Doe"));
	}

	@Test
	void updateProfileReturnsUpdatedProfile() throws Exception {
		when(currentUser.requireUserId()).thenReturn(1L);
		when(accountService.updateProfile(eq(1L), any(UpdateProfileRequest.class)))
			.thenReturn(sampleResponse("Jane Updated"));

		mockMvc.perform(put("/api/account/profile")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"displayName":"Jane Updated"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.displayName").value("Jane Updated"));
	}

	@Test
	void changePasswordReturnsUpdatedProfile() throws Exception {
		when(currentUser.requireUserId()).thenReturn(1L);
		when(accountService.changePassword(eq(1L), any(ChangePasswordRequest.class), any(), any()))
			.thenReturn(sampleResponse("Jane Doe"));

		mockMvc.perform(put("/api/account/password")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "currentPassword":"supersecret12",
						  "newPassword":"brandnewpass99",
						  "confirmNewPassword":"brandnewpass99"
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("user@example.com"));
	}

	@Test
	@WithAnonymousUser
	void accountEndpointsWithoutAuthenticationReturn401() throws Exception {
		mockMvc.perform(get("/api/account"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void profileUpdateWithoutCsrfReturns403() throws Exception {
		mockMvc.perform(put("/api/account/profile")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"displayName":"Jane Updated"}
						"""))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("FORBIDDEN"));
	}

	@Test
	void passwordChangeWithoutCsrfReturns403() throws Exception {
		mockMvc.perform(put("/api/account/password")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "currentPassword":"supersecret12",
						  "newPassword":"brandnewpass99",
						  "confirmNewPassword":"brandnewpass99"
						}
						"""))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("FORBIDDEN"));
	}

	private UserResponse sampleResponse(String displayName) {
		return new UserResponse(
			1L,
			"user@example.com",
			displayName,
			Instant.parse("2026-01-01T00:00:00Z"),
			null
		);
	}
}
