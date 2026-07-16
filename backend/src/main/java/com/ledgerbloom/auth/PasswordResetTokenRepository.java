package com.ledgerbloom.auth;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

	Optional<PasswordResetToken> findByTokenHash(String tokenHash);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
			update PasswordResetToken t
			set t.usedAt = :usedAt
			where t.user.id = :userId and t.usedAt is null
			""")
	int markAllUnusedAsUsedForUser(@Param("userId") Long userId, @Param("usedAt") Instant usedAt);

	default int markAllUnusedAsUsedForUser(Long userId) {
		return markAllUnusedAsUsedForUser(userId, Instant.now());
	}
}
