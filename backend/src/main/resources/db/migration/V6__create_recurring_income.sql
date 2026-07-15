CREATE TABLE recurring_income (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(160) NOT NULL,
    source VARCHAR(120) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    cadence VARCHAR(20) NOT NULL,
    next_income_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_recurring_income_amount_positive CHECK (amount > 0),
    CONSTRAINT ck_recurring_income_cadence
        CHECK (cadence IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'))
);

CREATE INDEX ix_recurring_income_next_income_date ON recurring_income (next_income_date);
CREATE INDEX ix_recurring_income_active ON recurring_income (active);
CREATE INDEX ix_recurring_income_cadence ON recurring_income (cadence);
CREATE INDEX ix_recurring_income_source ON recurring_income (source);
CREATE INDEX ix_recurring_income_active_next_income_date ON recurring_income (active, next_income_date);
