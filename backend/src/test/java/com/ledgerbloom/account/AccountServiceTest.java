package com.ledgerbloom.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.auth.AuthService;
import com.ledgerbloom.auth.InvalidPasswordChangeException;
import com.ledgerbloom.auth.PasswordResetTokenRepository;
import com.ledgerbloom.auth.UserResponse;
import com.ledgerbloom.user.User;
import com.ledgerbloom.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

	@Mock
	private UserRepository userRepository;

	@Mock
	private AuthService authService;

	@Mock
	private PasswordResetTokenRepository passwordResetTokenRepository;

	@Mock
	private HttpServletRequest httpRequest;

	@Mock
	private HttpServletResponse httpResponse;

	private PasswordEncoder passwordEncoder;
	private AccountService accountService;

	@BeforeEach
	void setUp() {
		passwordEncoder = new BCryptPasswordEncoder();
		accountService = new AccountService(userRepository, passwordEncoder, authService, passwordResetTokenRepository);
	}

	@Test
	void getProfileDelegatesToAuthenticatedUserLookup() {
		UserResponse response = sampleResponse();
		when(authService.currentUser(1L)).thenReturn(response);

		assertThat(accountService.getProfile(1L)).isSameAs(response);

		verify(authService).currentUser(1L);
	}

	@Test
	void updateProfileTrimsDisplayName() throws Exception {
		User user = sampleUser("supersecret12");
		UserResponse response = sampleResponse();
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(authService.currentUser(1L)).thenReturn(response);

		assertThat(accountService.updateProfile(1L, new UpdateProfileRequest("  Jane Updated  "))).isSameAs(response);

		assertThat(user.getDisplayName()).isEqualTo("Jane Updated");
		verify(userRepository).saveAndFlush(user);
		verify(authService).currentUser(1L);
	}

	@Test
	void updateProfileRejectsBlankDisplayName() throws Exception {
		User user = sampleUser("supersecret12");
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));

		assertThatThrownBy(() -> accountService.updateProfile(1L, new UpdateProfileRequest("   ")))
			.isInstanceOf(InvalidAccountDataException.class)
			.hasMessageContaining("required");

		verify(userRepository, never()).saveAndFlush(any());
	}

	@Test
	void changePasswordStoresBcryptHashAndRejectsOldPasswordAfterward() throws Exception {
		User user = sampleUser("supersecret12");
		UserResponse response = sampleResponse();
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(authService.currentUser(1L)).thenReturn(response);

		assertThat(accountService.changePassword(
			1L,
			new ChangePasswordRequest("supersecret12", "brandnewpass99", "brandnewpass99"),
			httpRequest,
			httpResponse
		)).isSameAs(response);

		ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
		verify(userRepository).saveAndFlush(savedUser.capture());
		String storedHash = savedUser.getValue().getPasswordHash();
		assertThat(storedHash).matches("^\\$2[aby]\\$.*");
		assertThat(passwordEncoder.matches("brandnewpass99", storedHash)).isTrue();
		assertThat(passwordEncoder.matches("supersecret12", storedHash)).isFalse();
		verify(passwordResetTokenRepository).markAllUnusedAsUsedForUser(1L);
		verify(authService).refreshAuthenticatedSession(user, httpRequest, httpResponse);
	}

	@Test
	void changePasswordRejectsIncorrectCurrentPassword() throws Exception {
		User user = sampleUser("supersecret12");
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));

		assertThatThrownBy(() -> accountService.changePassword(
			1L,
			new ChangePasswordRequest("wrongpassword", "brandnewpass99", "brandnewpass99"),
			httpRequest,
			httpResponse
		)).isInstanceOf(InvalidPasswordChangeException.class);

		verify(userRepository, never()).saveAndFlush(any());
	}

	@Test
	void changePasswordRejectsMismatchedConfirmation() throws Exception {
		User user = sampleUser("supersecret12");
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));

		assertThatThrownBy(() -> accountService.changePassword(
			1L,
			new ChangePasswordRequest("supersecret12", "brandnewpass99", "differentpassword"),
			httpRequest,
			httpResponse
		)).isInstanceOf(InvalidPasswordChangeException.class);

		verify(userRepository, never()).saveAndFlush(any());
	}

	@Test
	void changePasswordRejectsReusingCurrentPassword() throws Exception {
		User user = sampleUser("supersecret12");
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));

		assertThatThrownBy(() -> accountService.changePassword(
			1L,
			new ChangePasswordRequest("supersecret12", "supersecret12", "supersecret12"),
			httpRequest,
			httpResponse
		)).isInstanceOf(InvalidPasswordChangeException.class)
			.hasMessageContaining("different");

		verify(userRepository, never()).saveAndFlush(any());
	}

	private User sampleUser(String rawPassword) throws Exception {
		User user = new User("user@example.com", passwordEncoder.encode(rawPassword), "Jane Doe");
		Field id = User.class.getDeclaredField("id");
		id.setAccessible(true);
		id.set(user, 1L);
		return user;
	}

	private UserResponse sampleResponse() {
		return new UserResponse(1L, "user@example.com", "Jane Doe", Instant.parse("2026-01-01T00:00:00Z"), null);
	}
}
