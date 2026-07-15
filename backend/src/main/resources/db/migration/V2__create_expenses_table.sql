CREATE TABLE expenses (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(160) NOT NULL,
    merchant VARCHAR(120),
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    notes TEXT,
    category_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_expenses_amount_positive CHECK (amount > 0),
    CONSTRAINT fk_expenses_category
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
);

CREATE INDEX ix_expenses_expense_date ON expenses (expense_date);
CREATE INDEX ix_expenses_category_id ON expenses (category_id);
CREATE INDEX ix_expenses_expense_date_category_id ON expenses (expense_date, category_id);
