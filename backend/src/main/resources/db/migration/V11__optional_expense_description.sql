-- V11: Allow expenses and recurring expenses without a description.
-- When blank, the UI falls back to the category name as the display title.

ALTER TABLE expenses
    ALTER COLUMN description DROP NOT NULL;

ALTER TABLE recurring_expenses
    ALTER COLUMN description DROP NOT NULL;
