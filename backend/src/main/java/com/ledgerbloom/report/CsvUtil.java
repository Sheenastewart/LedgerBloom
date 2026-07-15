package com.ledgerbloom.report;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * CSV helpers used by exports.
 *
 * <p><strong>Formula injection protection:</strong> spreadsheet applications (Excel, Google
 * Sheets, LibreOffice Calc) treat a cell as a formula when its content begins with {@code =},
 * {@code +}, {@code -}, or {@code @} after opening a CSV file. A malicious description, merchant,
 * source, or note value starting with one of those characters could execute a formula (e.g.
 * {@code =HYPERLINK(...)} or DDE payloads) when the exported file is opened. {@link #escapeCell}
 * neutralizes this by prefixing such values with a single quote {@code '}, which most spreadsheet
 * applications render literally instead of evaluating as a formula, while leaving the underlying
 * data intact for any consumer that treats the CSV as plain text.</p>
 */
public final class CsvUtil {

	private static final String FORMULA_TRIGGER_CHARS = "=+-@";

	private CsvUtil() {
	}

	/**
	 * Escapes a single CSV cell value: applies formula-injection neutralization, then quotes the
	 * cell (doubling any embedded quotes) if it contains a comma, quote, or newline.
	 *
	 * @param value the raw cell value; {@code null} is rendered as an empty cell
	 * @return the escaped cell content, safe to place between CSV delimiters
	 */
	public static String escapeCell(String value) {
		if (value == null) {
			return "";
		}

		String result = value;
		String trimmed = value.trim();
		if (!trimmed.isEmpty() && FORMULA_TRIGGER_CHARS.indexOf(trimmed.charAt(0)) >= 0) {
			result = "'" + result;
		}

		boolean needsQuoting = result.contains(",") || result.contains("\"")
			|| result.contains("\n") || result.contains("\r");
		if (needsQuoting) {
			result = "\"" + result.replace("\"", "\"\"") + "\"";
		}

		return result;
	}

	/**
	 * Joins the given cells into a single CSV line (no trailing line terminator), escaping each
	 * cell via {@link #escapeCell}.
	 */
	public static String toCsvLine(String... cells) {
		return Arrays.stream(cells)
			.map(CsvUtil::escapeCell)
			.collect(Collectors.joining(","));
	}
}
