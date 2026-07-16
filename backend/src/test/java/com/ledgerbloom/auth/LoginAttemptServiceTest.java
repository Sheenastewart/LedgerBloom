package com.ledgerbloom.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class LoginAttemptServiceTest {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);

	@Test
	void throttleStartsAfterMaximumFailures() {
		LoginAttemptService service = new LoginAttemptService(CLOCK, 3, Duration.ofMinutes(15), 100);

		service.recordFailure("user@example.com", "127.0.0.1");
		service.recordFailure("user@example.com", "127.0.0.1");
		assertThatCode(() -> service.assertNotThrottled("user@example.com", "127.0.0.1")).doesNotThrowAnyException();

		service.recordFailure("user@example.com", "127.0.0.1");

		assertThatThrownBy(() -> service.assertNotThrottled("user@example.com", "127.0.0.1"))
			.isInstanceOf(LoginThrottledException.class);
	}

	@Test
	void cooldownBlocksFurtherAttemptsWithoutGrowingTheFailureCount() {
		LoginAttemptService service = new LoginAttemptService(CLOCK, 2, Duration.ofMinutes(15), 100);

		service.recordFailure("user@example.com", "127.0.0.1");
		service.recordFailure("user@example.com", "127.0.0.1");
		service.recordFailure("user@example.com", "127.0.0.1");

		assertThatThrownBy(() -> service.assertNotThrottled("user@example.com", "127.0.0.1"))
			.isInstanceOf(LoginThrottledException.class);
		assertThat(service.sizeForTests()).isEqualTo(1);
	}

	@Test
	void clearRemovesFailuresAfterSuccessfulLoginPath() {
		LoginAttemptService service = new LoginAttemptService(CLOCK, 2, Duration.ofMinutes(15), 100);

		service.recordFailure("user@example.com", "127.0.0.1");
		service.clear("user@example.com", "127.0.0.1");
		service.recordFailure("user@example.com", "127.0.0.1");

		assertThatCode(() -> service.assertNotThrottled("user@example.com", "127.0.0.1")).doesNotThrowAnyException();
	}

	@Test
	void pruningKeepsAttemptMapBoundedAtConfiguredMaximum() {
		LoginAttemptService service = new LoginAttemptService(CLOCK, 5, Duration.ofMinutes(15), 3);

		for (int index = 0; index < 20; index++) {
			service.recordFailure("user" + index + "@example.com", "127.0.0.1");
		}

		assertThat(service.sizeForTests()).isLessThanOrEqualTo(3);
	}
}
