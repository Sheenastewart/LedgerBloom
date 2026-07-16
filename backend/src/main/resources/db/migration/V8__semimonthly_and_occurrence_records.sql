-- V8: SEMIMONTHLY cadence fields + occurrence idempotency tables for catch-up.

ALTER TABLE recurring_income
    DROP CONSTRAINT ck_recurring_income_cadence;

ALTER TABLE recurring_income
    ADD CONSTRAINT ck_recurring_income_cadence CHECK (
        cadence IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'SEMIMONTHLY')
    );

ALTER TABLE recurring_income
    ADD COLUMN first_payment_day INTEGER NULL,
    ADD COLUMN second_payment_day INTEGER NULL;

ALTER TABLE recurring_income
    ADD CONSTRAINT ck_recurring_income_semimonthly_days CHECK (
        (cadence <> 'SEMIMONTHLY' AND first_payment_day IS NULL AND second_payment_day IS NULL)
        OR (
            cadence = 'SEMIMONTHLY'
            AND first_payment_day IS NOT NULL
            AND second_payment_day IS NOT NULL
            AND first_payment_day >= 1 AND first_payment_day <= 31
            AND second_payment_day >= 1 AND second_payment_day <= 31
            AND first_payment_day <> second_payment_day
            AND first_payment_day < second_payment_day
        )
    );

ALTER TABLE recurring_expenses
    DROP CONSTRAINT ck_recurring_expenses_cadence;

ALTER TABLE recurring_expenses
    ADD CONSTRAINT ck_recurring_expenses_cadence CHECK (
        cadence IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'SEMIMONTHLY')
    );

ALTER TABLE recurring_expenses
    ADD COLUMN first_payment_day INTEGER NULL,
    ADD COLUMN second_payment_day INTEGER NULL;

ALTER TABLE recurring_expenses
    ADD CONSTRAINT ck_recurring_expenses_semimonthly_days CHECK (
        (cadence <> 'SEMIMONTHLY' AND first_payment_day IS NULL AND second_payment_day IS NULL)
        OR (
            cadence = 'SEMIMONTHLY'
            AND first_payment_day IS NOT NULL
            AND second_payment_day IS NOT NULL
            AND first_payment_day >= 1 AND first_payment_day <= 31
            AND second_payment_day >= 1 AND second_payment_day <= 31
            AND first_payment_day <> second_payment_day
            AND first_payment_day < second_payment_day
        )
    );

CREATE TABLE recurring_income_occurrence_records (
    id BIGSERIAL PRIMARY KEY,
    recurring_income_id BIGINT NOT NULL REFERENCES recurring_income (id) ON DELETE CASCADE,
    occurrence_date DATE NOT NULL,
    income_entry_id BIGINT NOT NULL REFERENCES income_entries (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ux_recurring_income_occurrence UNIQUE (recurring_income_id, occurrence_date)
);

CREATE INDEX ix_recurring_income_occurrence_income_entry
    ON recurring_income_occurrence_records (income_entry_id);

CREATE TABLE recurring_expense_occurrence_records (
    id BIGSERIAL PRIMARY KEY,
    recurring_expense_id BIGINT NOT NULL REFERENCES recurring_expenses (id) ON DELETE CASCADE,
    occurrence_date DATE NOT NULL,
    expense_id BIGINT NOT NULL REFERENCES expenses (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ux_recurring_expense_occurrence UNIQUE (recurring_expense_id, occurrence_date)
);

CREATE INDEX ix_recurring_expense_occurrence_expense
    ON recurring_expense_occurrence_records (expense_id);
