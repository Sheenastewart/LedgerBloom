package com.ledgerbloom.report;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CsvUtilTest {

	@Test
	void nullBecomesEmptyString() {
		assertThat(CsvUtil.escapeCell(null)).isEmpty();
	}

	@Test
	void plainValuePassesThroughUnchanged() {
		assertThat(CsvUtil.escapeCell("Groceries")).isEqualTo("Groceries");
	}

	@Test
	void valueWithCommaIsQuoted() {
		assertThat(CsvUtil.escapeCell("Smith, John")).isEqualTo("\"Smith, John\"");
	}

	@Test
	void valueWithEmbeddedQuoteIsQuotedAndDoubled() {
		assertThat(CsvUtil.escapeCell("She said \"hi\"")).isEqualTo("\"She said \"\"hi\"\"\"");
	}

	@Test
	void valueWithNewlineIsQuoted() {
		assertThat(CsvUtil.escapeCell("line1\nline2")).isEqualTo("\"line1\nline2\"");
	}

	@Test
	void valueWithCarriageReturnIsQuoted() {
		assertThat(CsvUtil.escapeCell("line1\rline2")).isEqualTo("\"line1\rline2\"");
	}

	@Test
	void formulaEqualsPrefixIsNeutralized() {
		assertThat(CsvUtil.escapeCell("=SUM(A1:A2)")).isEqualTo("'=SUM(A1:A2)");
	}

	@Test
	void formulaPlusPrefixIsNeutralized() {
		assertThat(CsvUtil.escapeCell("+1234")).isEqualTo("'+1234");
	}

	@Test
	void formulaMinusPrefixIsNeutralized() {
		assertThat(CsvUtil.escapeCell("-CMD")).isEqualTo("'-CMD");
	}

	@Test
	void formulaAtPrefixIsNeutralized() {
		assertThat(CsvUtil.escapeCell("@SUM(A1)")).isEqualTo("'@SUM(A1)");
	}

	@Test
	void formulaTriggerAfterLeadingWhitespaceIsStillNeutralized() {
		assertThat(CsvUtil.escapeCell("  =evil()")).isEqualTo("'  =evil()");
	}

	@Test
	void formulaValueContainingCommaIsPrefixedAndQuoted() {
		assertThat(CsvUtil.escapeCell("=A1,B1")).isEqualTo("\"'=A1,B1\"");
	}

	@Test
	void toCsvLineJoinsEscapedCellsWithCommas() {
		assertThat(CsvUtil.toCsvLine("Type", "Date", "Amount, USD"))
			.isEqualTo("Type,Date,\"Amount, USD\"");
	}

	@Test
	void toCsvLineHandlesNullCells() {
		assertThat(CsvUtil.toCsvLine("A", null, "C")).isEqualTo("A,,C");
	}
}
