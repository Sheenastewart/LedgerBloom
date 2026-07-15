package com.ledgerbloom.income;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeEntryRepository extends JpaRepository<IncomeEntry, Long> {

	List<IncomeEntry> findAllByOrderByIncomeDateDescIdDesc();

	List<IncomeEntry> findByIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
			LocalDate startInclusive,
			LocalDate endExclusive);

	List<IncomeEntry> findBySourceIgnoreCaseOrderByIncomeDateDescIdDesc(String source);

	List<IncomeEntry> findBySourceIgnoreCaseAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
			String source,
			LocalDate startInclusive,
			LocalDate endExclusive);
}
