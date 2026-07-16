package com.ledgerbloom.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

@WebMvcTest(controllers = AuthController.class)
@Import({GlobalExceptionHandler.class, SecurityTestConfig.class})
class AuthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private AuthService authService;

	@MockitoBean
	private PasswordResetService passwordResetService;

	@MockitoBean
	private CurrentUser currentUser;

	private UserResponse sampleResponse() {
		return new UserResponse(
			1L,
			"user@example.com",
			"Jane Doe",
			Instant.parse("2026-01-01T00:00:00Z"),
			null
		);
	}

	@Test
	@WithAnonymousUser
	void registerReturns201AndNeverIncludesPassword() throws Exception {
		when(authService.register(any(RegisterRequest.class))).thenReturn(sampleResponse());

		mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email":"user@example.com",
						  "password":"supersecret12",
						  "confirmPassword":"supersecret12",
						  "displayName":"Jane Doe"
						}
						"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id").value(1))
			.andExpect(jsonPath("$.email").value("user@example.com"))
			.andExpect(jsonPath("$.displayName").value("Jane Doe"))
			.andExpect(jsonPath("$.password").doesNotExist())
			.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	@WithAnonymousUser
	void registerBlankEmailReturns400WithFieldErrors() throws Exception {
		mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email":"",
						  "password":"supersecret12",
						  "confirmPassword":"supersecret12",
						  "displayName":"Jane Doe"
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	@Test
	@WithAnonymousUser
	void registerShortPasswordReturns400() throws Exception {
		mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email":"user@example.com",
						  "password":"short",
						  "confirmPassword":"short",
						  "displayName":"Jane Doe"
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	@Test
	@WithAnonymousUser
	void registerDuplicateEmailReturns409() throws Exception {
		when(authService.register(any(RegisterRequest.class)))
			.thenThrow(new EmailAlreadyExistsException("user@example.com"));

		mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email":"user@example.com",
						  "password":"supersecret12",
						  "confirmPassword":"supersecret12",
						  "displayName":"Jane Doe"
						}
						"""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"));
	}

	@Test
	@WithAnonymousUser
	void loginReturns200AndNeverIncludesPassword() throws Exception {
		when(authService.login(any(LoginRequest.class), any(), any())).thenReturn(sampleResponse());

		mockMvc.perform(post("/api/auth/login")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"user@example.com","password":"supersecret12"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("user@example.com"))
			.andExpect(jsonPath("$.password").doesNotExist());
	}

	@Test
	@WithAnonymousUser
	void loginBadPasswordReturns401() throws Exception {
		when(authService.login(any(LoginRequest.class), any(), any()))
			.thenThrow(new InvalidCredentialsException());

		mockMvc.perform(post("/api/auth/login")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"user@example.com","password":"wrongpassword"}
						"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	@Test
	@WithMockUser(username = "user@example.com")
	void meReturnsCurrentUser() throws Exception {
		when(currentUser.requireUserId()).thenReturn(1L);
		when(authService.currentUser(eq(1L))).thenReturn(sampleResponse());

		mockMvc.perform(get("/api/auth/me"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("user@example.com"));
	}

	@Test
	@WithAnonymousUser
	void loginWithoutCsrfReturns403() throws Exception {
		mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"user@example.com","password":"supersecret12"}
						"""))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("FORBIDDEN"));
	}

	@Test
	@WithAnonymousUser
	void registerWithoutCsrfReturns403() throws Exception {
		mockMvc.perform(post("/api/auth/register")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email":"user@example.com",
						  "password":"supersecret12",
						  "confirmPassword":"supersecret12",
						  "displayName":"Jane Doe"
						}
						"""))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("FORBIDDEN"));
	}

	@Test
	@WithAnonymousUser
	void forgotPasswordReturnsGenericMessage() throws Exception {
		when(passwordResetService.forgotPassword(any(ForgotPasswordRequest.class)))
			.thenReturn(ForgotPasswordResponse.generic());

		mockMvc.perform(post("/api/auth/forgot-password")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"user@example.com"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").value(ForgotPasswordResponse.GENERIC_MESSAGE))
			.andExpect(jsonPath("$.devResetToken").doesNotExist());
	}

	@Test
	@WithAnonymousUser
	void resetPasswordReturnsSuccessMessage() throws Exception {
		when(passwordResetService.resetPassword(any(ResetPasswordRequest.class)))
			.thenReturn(new MessageResponse("Your password has been updated. You can sign in with your new password."));

		mockMvc.perform(post("/api/auth/reset-password")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token":"opaque-token",
						  "newPassword":"brandnewpass99",
						  "confirmNewPassword":"brandnewpass99"
						}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").exists())
			.andExpect(jsonPath("$.password").doesNotExist());
	}

	@Test
	@WithAnonymousUser
	void resetPasswordWithInvalidTokenReturns400() throws Exception {
		when(passwordResetService.resetPassword(any(ResetPasswordRequest.class)))
			.thenThrow(new InvalidResetTokenException());

		mockMvc.perform(post("/api/auth/reset-password")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token":"invalid-token",
						  "newPassword":"brandnewpass99",
						  "confirmNewPassword":"brandnewpass99"
						}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_RESET_TOKEN"));
	}
}
