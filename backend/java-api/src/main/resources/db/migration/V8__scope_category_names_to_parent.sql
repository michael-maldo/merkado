-- Category labels describe a position in the hierarchy. The same label may
-- therefore appear in different branches (for example Men / Shoes and
-- Women / Shoes), but not twice beneath the same parent.
ALTER TABLE catalog.categories
    DROP CONSTRAINT IF EXISTS categories_name_key;

CREATE UNIQUE INDEX uk_categories_root_name_ci
    ON catalog.categories (LOWER(name))
    WHERE parent_id IS NULL;

CREATE UNIQUE INDEX uk_categories_sibling_name_ci
    ON catalog.categories (parent_id, LOWER(name))
    WHERE parent_id IS NOT NULL;
