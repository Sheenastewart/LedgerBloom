package com.ledgerbloom.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.user.User;
import com.ledgerbloom.user.UserRepository;
import java.lang.reflect.Field;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
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
class PasswordResetServiceTest {

	private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

	@Mock
	private UserRepository userRepository;

	@Mock
	private PasswordResetTokenRepository tokenRepository;

	@Mock
	private DevPasswordResetInbox devPasswordResetInbox;

	private PasswordEncoder passwordEncoder;
	private Clock clock;

	@BeforeEach
	void setUp() {
		passwordEncoder = new BCryptPasswordEncoder();
		clock = Clock.fixed(NOW, ZoneOffset.UTC);
	}

	@Test
	void forgotPasswordReturnsTheSameGenericResponseForUnknownAndKnownEmails() throws Exception {
		PasswordResetService service = service(false);
		User user = sampleUser("supersecret12");
		when(userRepository.findByEmailIgnoreCase("known@example.com")).thenReturn(Optional.of(user));
		when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

		ForgotPasswordResponse known = service.forgotPassword(new ForgotPasswordRequest(" Known@Example.com "));
		ForgotPasswordResponse unknown = service.forgotPassword(new ForgotPasswordRequest("missing@example.com"));

		assertThat(known).isEqualTo(ForgotPasswordResponse.generic());
		assertThat(unknown).isEqualTo(ForgotPasswordResponse.generic());
		assertThat(known.devResetToken()).isNull();
		verify(tokenRepository).markAllUnusedAsUsedForUser(1L);
	}

	@Test
	void forgotPasswordStoresSha256HexHashInsteadOfRawToken() throws Exception {
		PasswordResetService service = service(true);
		User user = sampleUser("supersecret12");
		when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

		ForgotPasswordResponse response = service.forgotPassword(new ForgotPasswordRequest("user@example.com"));

		ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
		verify(tokenRepository).saveAndFlush(tokenCaptor.capture());
		PasswordResetToken stored = tokenCaptor.getValue();
		assertThat(response.devResetToken()).isNotBlank();
		assertThat(stored.getTokenHash()).matches("[0-9a-f]{64}");
		assertThat(stored.getTokenHash()).isEqualTo(service.hashTokenForTests(response.devResetToken()));
		assertThat(stored.getTokenHash()).isNotEqualTo(response.devResetToken());
		assertThat(stored.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofHours(1)));
	}

	@Test
	void resetPasswordRejectsExpiredToken() throws Exception {
		PasswordResetService service = service(false);
		PasswordResetToken token = new PasswordResetToken(
			sampleUser("supersecret12"),
			service.hashTokenForTests("expired-token"),
			NOW
		);
		when(tokenRepository.findByTokenHash(service.hashTokenForTests("expired-token"))).thenReturn(Optional.of(token));

		assertThatThrownBy(() -> service.resetPassword(
			new ResetPasswordRequest("expired-token", "brandnewpass99", "brandnewpass99")
		)).isInstanceOf(InvalidResetTokenException.class);

		verify(userRepository, never()).saveAndFlush(any());
	}

	@Test
	void resetPasswordRejectsInvalidToken() {
		PasswordResetService service = service(false);
		when(tokenRepository.findByTokenHash(service.hashTokenForTests("invalid-token"))).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.resetPassword(
			new ResetPasswordRequest("invalid-token", "brandnewpass99", "brandnewpass99")
		)).isInstanceOf(InvalidResetTokenException.class);
	}

	@Test
	void resetPasswordChangesHashRejectsOldPasswordAndMakesTokenSingleUse() throws Exception {
		PasswordResetService service = service(false);
		User user = sampleUser("supersecret12");
		String rawToken = "valid-reset-token";
		PasswordResetToken token = new PasswordResetToken(
			user,
			service.hashTokenForTests(rawToken),
			NOW.plus(Duration.ofHours(1))
		);
		when(tokenRepository.findByTokenHash(service.hashTokenForTests(rawToken))).thenReturn(Optional.of(token));

		MessageResponse response = service.resetPassword(
			new ResetPasswordRequest(rawToken, "brandnewpass99", "brandnewpass99")
		);

		assertThat(response.message()).contains("updated");
		assertThat(passwordEncoder.matches("brandnewpass99", user.getPasswordHash())).isTrue();
		assertThat(passwordEncoder.matches("supersecret12", user.getPasswordHash())).isFalse();
		assertThat(token.isUsed()).isTrue();
		assertThat(token.getUsedAt()).isEqualTo(NOW);
		verify(tokenRepository).markAllUnusedAsUsedForUser(eq(1L), eq(NOW));

		assertThatThrownBy(() -> service.resetPassword(
			new ResetPasswordRequest(rawToken, "brandnewpass99", "brandnewpass99")
		)).isInstanceOf(InvalidResetTokenException.class);
	}

	private PasswordResetService service(boolean devReturnToken) {
		return new PasswordResetService(
			userRepository,
			tokenRepository,
			passwordEncoder,
			devPasswordResetInbox,
			clock,
			Duration.ofHours(1),
			devReturnToken,
			false
		);
	}

	private User sampleUser(String rawPassword) throws Exception {
		User user = new User("user@example.com", passwordEncoder.encode(rawPassword), "Jane Doe");
		Field id = User.class.getDeclaredField("id");
		id.setAccessible(true);
		id.set(user, 1L);
		return user;
	}
}
