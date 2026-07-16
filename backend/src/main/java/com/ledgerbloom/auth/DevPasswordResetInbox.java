package com.ledgerbloom.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Development-only inbox for password-reset delivery verification.
 *
 * <p>Stores raw tokens in memory keyed by normalized email so local live checks and
 * automated tests can complete a reset without a real mail provider. Tokens are never
 * written to logs. Production must keep {@code ledgerbloom.password-reset.dev-inbox-enabled}
 * false so this store is unused and API responses never include tokens.
 */
@Component
public class DevPasswordResetInbox {

	private final ConcurrentHashMap<String, Entry> entries = new ConcurrentHashMap<>();

	public void store(String normalizedEmail, String rawToken, Instant expiresAt) {
		entries.put(normalizedEmail, new Entry(rawToken, expiresAt, Instant.now()));
	}

	public Optional<String> consume(String normalizedEmail) {
		Entry entry = entries.remove(normalizedEmail);
		if (entry == null) {
			return Optional.empty();
		}
		if (entry.expiresAt().isBefore(Instant.now())) {
			return Optional.empty();
		}
		return Optional.of(entry.rawToken());
	}

	public Optional<String> peek(String normalizedEmail) {
		Entry entry = entries.get(normalizedEmail);
		if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
			return Optional.empty();
		}
		return Optional.of(entry.rawToken());
	}

	public void clear() {
		entries.clear();
	}

	public record Entry(String rawToken, Instant expiresAt, Instant createdAt) {
	}
}
