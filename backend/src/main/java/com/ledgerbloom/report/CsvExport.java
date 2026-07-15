package com.ledgerbloom.report;

/** A generated CSV export payload paired with the filename it should be served under. */
public record CsvExport(String filename, String content) {
}
