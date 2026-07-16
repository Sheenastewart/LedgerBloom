ALTER TABLE categories
    ADD COLUMN color VARCHAR(7);

COMMENT ON COLUMN categories.color IS 'Optional #RRGGBB accent for lists and charts; null uses a name-based default in the UI.';
