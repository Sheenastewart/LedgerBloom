package com.ledgerbloom.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import com.ledgerbloom.user.User;
import com.ledgerbloom.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Password-reset flow.
 *
 * <p>Production email delivery: inject a mail sender that implements the same notify path
 * used by {@link #forgotPassword} (look up user, create hashed token, deliver link containing
 * the raw token out-of-band). Keep {@code ledgerbloom.password-reset.dev-return-token} and
 * {@code ledgerbloom.password-reset.dev-inbox-enabled} false in production so raw tokens
 * never appear in API responses. Never log raw tokens.
 */
@Service
@Transactional
public class PasswordResetService {

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private final UserRepository userRepository;
	private final PasswordResetTokenRepository tokenRepository;
	private final PasswordEncoder passwordEncoder;
	private final DevPasswordResetInbox devPasswordResetInbox;
	private final Clock clock;
	private final Duration tokenTtl;
	private final boolean devReturnToken;
	private final boolean devInboxEnabled;

	public PasswordResetService(
			UserRepository userRepository,
			PasswordResetTokenRepository tokenRepository,
			PasswordEncoder passwordEncoder,
			DevPasswordResetInbox devPasswordResetInbox,
			Clock clock,
			@Value("${ledgerbloom.password-reset.token-ttl:1h}") Duration tokenTtl,
			@Value("${ledgerbloom.password-reset.dev-return-token:false}") boolean devReturnToken,
			@Value("${ledgerbloom.password-reset.dev-inbox-enabled:false}") boolean devInboxEnabled) {
		this.userRepository = userRepository;
		this.tokenRepository = tokenRepository;
		this.passwordEncoder = passwordEncoder;
		this.devPasswordResetInbox = devPasswordResetInbox;
		this.clock = clock;
		this.tokenTtl = tokenTtl;
		this.devReturnToken = devReturnToken;
		this.devInboxEnabled = devInboxEnabled;
	}

	public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
		String email = normalizeEmail(request.email());
		Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
		if (userOpt.isEmpty()) {
			return ForgotPasswordResponse.generic();
		}

		User user = userOpt.get();
		tokenRepository.markAllUnusedAsUsedForUser(user.getId());

		String rawToken = generateRawToken();
		String tokenHash = hashToken(rawToken);
		Instant expiresAt = clock.instant().plus(tokenTtl);
		tokenRepository.saveAndFlush(new PasswordResetToken(user, tokenHash, expiresAt));

		if (devInboxEnabled) {
			devPasswordResetInbox.store(email, rawToken, expiresAt);
		}

		if (devReturnToken) {
			return ForgotPasswordResponse.withDevToken(rawToken);
		}
		return ForgotPasswordResponse.generic();
	}

	public MessageResponse resetPassword(ResetPasswordRequest request) {
		PasswordPolicy.validateNewPassword(request.newPassword(), request.confirmNewPassword());

		String tokenHash = hashToken(request.token() == null ? "" : request.token().trim());
		PasswordResetToken token = tokenRepository.findByTokenHash(tokenHash)
			.orElseThrow(InvalidResetTokenException::new);

		Instant now = clock.instant();
		if (token.isUsed() || token.isExpired(now)) {
			throw new InvalidResetTokenException();
		}

		User user = token.getUser();
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		userRepository.saveAndFlush(user);

		token.markUsed(now);
		tokenRepository.saveAndFlush(token);
		tokenRepository.markAllUnusedAsUsedForUser(user.getId(), now);

		return new MessageResponse("Your password has been updated. You can sign in with your new password.");
	}

	/**
	 * Package-visible for tests: hash the same way production stores tokens.
	 */
	String hashTokenForTests(String rawToken) {
		return hashToken(rawToken);
	}

	private String generateRawToken() {
		byte[] bytes = new byte[32];
		SECURE_RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String hashToken(String rawToken) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hashed);
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 is required for password reset tokens", ex);
		}
	}

	private String normalizeEmail(String email) {
		return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
	}
}
