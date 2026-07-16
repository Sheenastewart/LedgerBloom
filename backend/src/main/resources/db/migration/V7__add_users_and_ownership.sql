-- Stage 10: introduces accounts and makes every financial table user-owned.

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    last_login_at TIMESTAMPTZ NULL,
    CONSTRAINT ux_users_email UNIQUE (email)
);

-- Legacy bootstrap user: owns every row that existed before authentication shipped.
-- password_hash is a BCrypt hash of a randomly generated password that was never
-- recorded anywhere and is not intended to ever be used to log in to this account.
INSERT INTO users (email, password_hash, display_name, created_at)
VALUES (
    'legacy@local.dev',
    '$2a$10$l3lqvQA5dbI76ieXF7h77.bVvn91K8vJDzv58xhtFOxxhsa85CHca',
    'Legacy Data',
    now()
);

-- categories: user_id nullable -> backfill -> not null -> FK, and the name-uniqueness
-- constraint moves from global to per-user.
ALTER TABLE categories ADD COLUMN user_id BIGINT;
UPDATE categories SET user_id = (SELECT id FROM users WHERE email = 'legacy@local.dev');
ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE categories
    ADD CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
DROP INDEX ux_categories_name_lower;
CREATE UNIQUE INDEX ux_categories_user_id_name_lower ON categories (user_id, LOWER(name));
CREATE INDEX ix_categories_user_id ON categories (user_id);

-- expenses
ALTER TABLE expenses ADD COLUMN user_id BIGINT;
UPDATE expenses SET user_id = (SELECT id FROM users WHERE email = 'legacy@local.dev');
ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE expenses
    ADD CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
CREATE INDEX ix_expenses_user_id ON expenses (user_id);

-- income_entries
ALTER TABLE income_entries ADD COLUMN user_id BIGINT;
UPDATE income_entries SET user_id = (SELECT id FROM users WHERE email = 'legacy@local.dev');
ALTER TABLE income_entries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE income_entries
    ADD CONSTRAINT fk_income_entries_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
CREATE INDEX ix_income_entries_user_id ON income_entries (user_id);

-- monthly_budgets: year+month uniqueness moves from global to per-user.
ALTER TABLE monthly_budgets ADD COLUMN user_id BIGINT;
UPDATE monthly_budgets SET user_id = (SELECT id FROM users WHERE email = 'legacy@local.dev');
ALTER TABLE monthly_budgets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE monthly_budgets
    ADD CONSTRAINT fk_monthly_budgets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE monthly_budgets DROP CONSTRAINT ux_monthly_budgets_year_month;
ALTER TABLE monthly_budgets
    ADD CONSTRAINT ux_monthly_budgets_user_id_year_month UNIQUE (user_id, budget_year, budget_month);
CREATE INDEX ix_monthly_budgets_user_id ON monthly_budgets (user_id);

-- category_budget_limits: gets its own user_id per the ownership model, but
-- ux_category_budget_limits_budget_category (monthly_budget_id, category_id) is left
-- untouched because monthly_budget_id already uniquely belongs to one user.
ALTER TABLE category_budget_limits ADD COLUMN user_id BIGINT;
UPDATE category_budget_limits SET user_id = (SELECT id FROM users WHERE email = 'legacy@local.dev');
ALTER TABLE category_budget_limits ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE category_budget_limits
    ADD CONSTRAINT fk_category_budget_limits_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
CREATE INDEX ix_category_budget_limits_user_id ON category_budget_limits (user_id);

-- recurring_expenses
ALTER TABLE recurring_expenses ADD COLUMN user_id BIGINT;
UPDATE recurring_expenses SET user_id = (SELECT id FROM users WHERE email = 'legacy@local.dev');
ALTER TABLE recurring_expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE recurring_expenses
    ADD CONSTRAINT fk_recurring_expenses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
CREATE INDEX ix_recurring_expenses_user_id ON recurring_expenses (user_id);

-- recurring_income
ALTER TABLE recurring_income ADD COLUMN user_id BIGINT;
UPDATE recurring_income SET user_id = (SELECT id FROM users WHERE email = 'legacy@local.dev');
ALTER TABLE recurring_income ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE recurring_income
    ADD CONSTRAINT fk_recurring_income_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
CREATE INDEX ix_recurring_income_user_id ON recurring_income (user_id);
