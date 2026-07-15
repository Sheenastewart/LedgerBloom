CREATE TABLE recurring_expenses (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(160) NOT NULL,
    merchant VARCHAR(120),
    amount NUMERIC(12, 2) NOT NULL,
    category_id BIGINT NOT NULL,
    cadence VARCHAR(20) NOT NULL,
    next_payment_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_recurring_expenses_amount_positive CHECK (amount > 0),
    CONSTRAINT ck_recurring_expenses_cadence
        CHECK (cadence IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL')),
    CONSTRAINT fk_recurring_expenses_category
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
);

CREATE INDEX ix_recurring_expenses_category_id ON recurring_expenses (category_id);
CREATE INDEX ix_recurring_expenses_next_payment_date ON recurring_expenses (next_payment_date);
CREATE INDEX ix_recurring_expenses_active ON recurring_expenses (active);
CREATE INDEX ix_recurring_expenses_cadence ON recurring_expenses (cadence);
CREATE INDEX ix_recurring_expenses_active_next_payment_date ON recurring_expenses (active, next_payment_date);
