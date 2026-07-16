-- V10: Food assistance amount on category budget limits (e.g. SNAP / food stamps).
-- Covered spend is excluded from category and overall budget metrics in application math.

ALTER TABLE category_budget_limits
    ADD COLUMN assistance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE category_budget_limits
    ADD CONSTRAINT ck_category_budget_limits_assistance_non_negative
        CHECK (assistance_amount >= 0);
