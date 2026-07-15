CREATE TABLE income_entries (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(160) NOT NULL,
    source VARCHAR(120) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    income_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_income_entries_amount_positive CHECK (amount > 0)
);

CREATE INDEX ix_income_entries_income_date ON income_entries (income_date);
CREATE INDEX ix_income_entries_source ON income_entries (source);
CREATE INDEX ix_income_entries_income_date_source ON income_entries (income_date, source);
