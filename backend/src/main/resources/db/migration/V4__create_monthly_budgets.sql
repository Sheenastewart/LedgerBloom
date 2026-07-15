CREATE TABLE monthly_budgets (
    id BIGSERIAL PRIMARY KEY,
    budget_year INTEGER NOT NULL,
    budget_month INTEGER NOT NULL,
    total_limit NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_monthly_budgets_year_positive CHECK (budget_year > 0),
    CONSTRAINT ck_monthly_budgets_month_range CHECK (budget_month BETWEEN 1 AND 12),
    CONSTRAINT ck_monthly_budgets_total_limit_positive CHECK (total_limit > 0),
    CONSTRAINT ux_monthly_budgets_year_month UNIQUE (budget_year, budget_month)
);

CREATE INDEX ix_monthly_budgets_year_month ON monthly_budgets (budget_year, budget_month);

CREATE TABLE category_budget_limits (
    id BIGSERIAL PRIMARY KEY,
    monthly_budget_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    limit_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_category_budget_limits_amount_positive CHECK (limit_amount > 0),
    CONSTRAINT fk_category_budget_limits_monthly_budget
        FOREIGN KEY (monthly_budget_id) REFERENCES monthly_budgets (id) ON DELETE CASCADE,
    CONSTRAINT fk_category_budget_limits_category
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
    CONSTRAINT ux_category_budget_limits_budget_category UNIQUE (monthly_budget_id, category_id)
);

CREATE INDEX ix_category_budget_limits_monthly_budget_id ON category_budget_limits (monthly_budget_id);
CREATE INDEX ix_category_budget_limits_category_id ON category_budget_limits (category_id);
