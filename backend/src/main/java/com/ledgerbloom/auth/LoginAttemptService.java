package com.ledgerbloom.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Lightweight in-memory login abuse protection.
 *
 * <p>Suitable only for a single application instance. When LedgerBloom is horizontally
 * scaled, move failure counters and cooldowns to shared infrastructure (for example Redis
 * or a database-backed rate limiter) so all instances enforce the same policy.
 */
@Service
public class LoginAttemptService {

	private final Clock clock;
	private final int maxFailures;
	private final Duration cooldown;
	private final int maxEntries;
	private final ConcurrentHashMap<String, AttemptState> attempts = new ConcurrentHashMap<>();

	public LoginAttemptService(
			Clock clock,
			@Value("${ledgerbloom.login-throttle.max-failures:5}") int maxFailures,
			@Value("${ledgerbloom.login-throttle.cooldown:15m}") Duration cooldown,
			@Value("${ledgerbloom.login-throttle.max-entries:10000}") int maxEntries) {
		this.clock = clock;
		this.maxFailures = maxFailures;
		this.cooldown = cooldown;
		this.maxEntries = maxEntries;
	}

	public void assertNotThrottled(String email, String clientAddress) {
		pruneIfNeeded();
		AttemptState state = attempts.get(key(email, clientAddress));
		if (state == null) {
			return;
		}
		Instant now = clock.instant();
		if (state.cooldownUntil != null && now.isBefore(state.cooldownUntil)) {
			throw new LoginThrottledException();
		}
		if (state.cooldownUntil != null && !now.isBefore(state.cooldownUntil)) {
			attempts.remove(key(email, clientAddress), state);
		}
	}

	public void recordFailure(String email, String clientAddress) {
		pruneIfNeeded();
		String mapKey = key(email, clientAddress);
		attempts.compute(mapKey, (ignored, existing) -> {
			Instant now = clock.instant();
			AttemptState state = existing == null ? new AttemptState() : existing;
			if (state.cooldownUntil != null && now.isBefore(state.cooldownUntil)) {
				return state;
			}
			state.failures += 1;
			state.lastFailureAt = now;
			if (state.failures >= maxFailures) {
				state.cooldownUntil = now.plus(cooldown);
				state.failures = 0;
			}
			return state;
		});
	}

	public void clear(String email, String clientAddress) {
		attempts.remove(key(email, clientAddress));
	}

	int sizeForTests() {
		return attempts.size();
	}

	private String key(String email, String clientAddress) {
		String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
		String address = clientAddress == null || clientAddress.isBlank() ? "unknown" : clientAddress.trim();
		return normalizedEmail + "|" + address;
	}

	private void pruneIfNeeded() {
		if (attempts.size() < maxEntries) {
			return;
		}
		Instant cutoff = clock.instant().minus(cooldown.multipliedBy(2));
		Iterator<Map.Entry<String, AttemptState>> iterator = attempts.entrySet().iterator();
		while (iterator.hasNext()) {
			Map.Entry<String, AttemptState> entry = iterator.next();
			AttemptState state = entry.getValue();
			boolean cooldownExpired = state.cooldownUntil != null && !clock.instant().isBefore(state.cooldownUntil);
			boolean staleFailure = state.lastFailureAt != null && state.lastFailureAt.isBefore(cutoff);
			if ((cooldownExpired && state.failures == 0) || staleFailure) {
				iterator.remove();
			}
		}
		while (attempts.size() >= maxEntries) {
			Iterator<String> keys = attempts.keys().asIterator();
			if (!keys.hasNext()) {
				break;
			}
			attempts.remove(keys.next());
		}
	}

	private static final class AttemptState {
		private int failures;
		private Instant lastFailureAt;
		private Instant cooldownUntil;
	}
}
