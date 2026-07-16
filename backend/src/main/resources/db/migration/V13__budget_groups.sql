-- Budget groups roll detailed expense categories into a smaller set of budget buckets.
-- Auto-managed budgets stay unlocked (user_modified = false) until the user edits them.

ALTER TABLE monthly_budgets
    ADD COLUMN user_modified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE categories
    ADD COLUMN budget_group VARCHAR(40);

UPDATE categories SET budget_group = CASE lower(name)
    WHEN 'housing' THEN 'BILLS'
    WHEN 'utilities' THEN 'BILLS'
    WHEN 'internet' THEN 'BILLS'
    WHEN 'cell phone' THEN 'BILLS'
    WHEN 'security system' THEN 'BILLS'
    WHEN 'insurance' THEN 'BILLS'
    WHEN 'subscriptions' THEN 'SUBSCRIPTIONS'
    WHEN 'gym membership' THEN 'SUBSCRIPTIONS'
    WHEN 'entertainment' THEN 'SUBSCRIPTIONS'
    WHEN 'groceries' THEN 'GROCERIES'
    WHEN 'dining out' THEN 'EATING_OUT'
    WHEN 'gas' THEN 'TRANSPORTATION'
    WHEN 'transportation' THEN 'TRANSPORTATION'
    WHEN 'car payment' THEN 'TRANSPORTATION'
    WHEN 'car maintenance' THEN 'TRANSPORTATION'
    WHEN 'car insurance' THEN 'TRANSPORTATION'
    WHEN 'medical' THEN 'MEDICAL'
    WHEN 'childcare' THEN 'CHILD_CARE'
    WHEN 'debt payments' THEN 'DEBT_PAYMENTS'
    ELSE 'PERSONAL_HOUSEHOLD'
END
WHERE budget_group IS NULL;

ALTER TABLE categories
    ALTER COLUMN budget_group SET NOT NULL;

ALTER TABLE categories
    ADD CONSTRAINT ck_categories_budget_group CHECK (
        budget_group IN (
            'BILLS',
            'SUBSCRIPTIONS',
            'GROCERIES',
            'EATING_OUT',
            'TRANSPORTATION',
            'MEDICAL',
            'CHILD_CARE',
            'DEBT_PAYMENTS',
            'PERSONAL_HOUSEHOLD'
        )
    );

CREATE TABLE budget_group_limits (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    monthly_budget_id BIGINT NOT NULL,
    budget_group VARCHAR(40) NOT NULL,
    limit_amount NUMERIC(12, 2) NOT NULL,
    assistance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_budget_group_limits_amount_positive CHECK (limit_amount > 0),
    CONSTRAINT ck_budget_group_limits_assistance_non_negative CHECK (assistance_amount >= 0),
    CONSTRAINT ck_budget_group_limits_group CHECK (
        budget_group IN (
            'BILLS',
            'SUBSCRIPTIONS',
            'GROCERIES',
            'EATING_OUT',
            'TRANSPORTATION',
            'MEDICAL',
            'CHILD_CARE',
            'DEBT_PAYMENTS',
            'PERSONAL_HOUSEHOLD'
        )
    ),
    CONSTRAINT fk_budget_group_limits_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_budget_group_limits_monthly_budget
        FOREIGN KEY (monthly_budget_id) REFERENCES monthly_budgets (id) ON DELETE CASCADE,
    CONSTRAINT ux_budget_group_limits_budget_group UNIQUE (monthly_budget_id, budget_group)
);

CREATE INDEX ix_budget_group_limits_monthly_budget_id ON budget_group_limits (monthly_budget_id);
CREATE INDEX ix_budget_group_limits_user_id ON budget_group_limits (user_id);

-- Roll any existing per-category limits into group limits, then lock those budgets.
INSERT INTO budget_group_limits (
    user_id,
    monthly_budget_id,
    budget_group,
    limit_amount,
    assistance_amount,
    created_at,
    updated_at
)
SELECT
    cbl.user_id,
    cbl.monthly_budget_id,
    c.budget_group,
    SUM(cbl.limit_amount),
    SUM(cbl.assistance_amount),
    MIN(cbl.created_at),
    MAX(cbl.updated_at)
FROM category_budget_limits cbl
JOIN categories c ON c.id = cbl.category_id
GROUP BY cbl.user_id, cbl.monthly_budget_id, c.budget_group;

UPDATE monthly_budgets mb
SET user_modified = TRUE
WHERE EXISTS (
    SELECT 1 FROM category_budget_limits cbl WHERE cbl.monthly_budget_id = mb.id
);

DROP TABLE category_budget_limits;
