package com.ledgerbloom.income;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeEntryRepository extends JpaRepository<IncomeEntry, Long> {

	Optional<IncomeEntry> findByIdAndUser_Id(Long id, Long userId);

	List<IncomeEntry> findByUser_IdOrderByIncomeDateDescIdDesc(Long userId);

	List<IncomeEntry> findByUser_IdAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
			Long userId,
			LocalDate startInclusive,
			LocalDate endExclusive);

	List<IncomeEntry> findByUser_IdAndSourceIgnoreCaseOrderByIncomeDateDescIdDesc(Long userId, String source);

	List<IncomeEntry>
			findByUser_IdAndSourceIgnoreCaseAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
					Long userId,
					String source,
					LocalDate startInclusive,
					LocalDate endExclusive);
}
