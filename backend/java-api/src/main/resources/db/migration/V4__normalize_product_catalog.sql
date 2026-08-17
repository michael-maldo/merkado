-- Introduce the SPU-level product and SKU-level variant catalogue model.
--
-- Legacy product columns and product_id foreign keys are intentionally retained
-- in this migration. Compatibility triggers populate the new variant columns
-- while the Java API is migrated in a later release.

CREATE TABLE catalog.brands (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_brands_name_ci
    ON catalog.brands (LOWER(name));

INSERT INTO catalog.brands (name, description)
VALUES ('UNBRANDED', 'Default brand used while legacy products are being classified');

ALTER TABLE catalog.categories
    ADD COLUMN code VARCHAR(80),
    ADD COLUMN parent_id BIGINT,
    ADD CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES catalog.categories(id) ON DELETE SET NULL,
    ADD CONSTRAINT ck_categories_not_own_parent
        CHECK (parent_id IS NULL OR parent_id <> id);

UPDATE catalog.categories
SET code = 'CATEGORY-' || id
WHERE code IS NULL;

ALTER TABLE catalog.categories
    ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX uk_categories_code_ci
    ON catalog.categories (LOWER(code));

INSERT INTO catalog.categories (name, code, description)
VALUES ('Uncategorized', 'UNCATEGORIZED', 'Default category used while legacy products are being classified')
ON CONFLICT (name) DO UPDATE
SET code = COALESCE(catalog.categories.code, EXCLUDED.code);

ALTER TABLE catalog.products
    ADD COLUMN master_name VARCHAR(250),
    ADD COLUMN upc VARCHAR(32),
    ADD COLUMN spu VARCHAR(80),
    ADD COLUMN brand_id BIGINT,
    ADD COLUMN condition VARCHAR(30) NOT NULL DEFAULT 'NEW',
    ADD COLUMN shelf_life_days INTEGER,
    ADD COLUMN minimum_purchase_quantity INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN short_description VARCHAR(500),
    ADD COLUMN long_description TEXT,
    ADD COLUMN has_variations BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN preorder BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN remarks_1 TEXT,
    ADD COLUMN remarks_2 TEXT,
    ADD COLUMN remarks_3 TEXT,
    ADD CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id) REFERENCES catalog.brands(id),
    ADD CONSTRAINT ck_products_condition
        CHECK (condition IN ('NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_ACCEPTABLE', 'REFURBISHED')),
    ADD CONSTRAINT ck_products_shelf_life
        CHECK (shelf_life_days IS NULL OR shelf_life_days > 0),
    ADD CONSTRAINT ck_products_minimum_purchase_quantity
        CHECK (minimum_purchase_quantity > 0);

UPDATE catalog.products p
SET master_name = p.name,
    spu = p.sku,
    brand_id = (SELECT id FROM catalog.brands WHERE name = 'UNBRANDED'),
    category_id = COALESCE(
        p.category_id,
        (SELECT id FROM catalog.categories WHERE code = 'UNCATEGORIZED')
    ),
    short_description = COALESCE(p.description, p.name),
    long_description = COALESCE(p.description, p.name);

ALTER TABLE catalog.products
    ALTER COLUMN master_name SET NOT NULL,
    ALTER COLUMN spu SET NOT NULL,
    ALTER COLUMN brand_id SET NOT NULL,
    ALTER COLUMN category_id SET NOT NULL,
    ALTER COLUMN short_description SET NOT NULL,
    ALTER COLUMN long_description SET NOT NULL;

CREATE UNIQUE INDEX uk_products_spu_ci
    ON catalog.products (LOWER(spu));

CREATE UNIQUE INDEX uk_products_upc_ci
    ON catalog.products (LOWER(upc))
    WHERE upc IS NOT NULL;

CREATE INDEX idx_products_category
    ON catalog.products (category_id);

CREATE INDEX idx_products_brand
    ON catalog.products (brand_id);

ALTER TABLE catalog.product_variants
    ADD COLUMN barcode VARCHAR(64),
    ADD COLUMN variant_name VARCHAR(250),
    ADD COLUMN selling_price NUMERIC(12,2),
    ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT ck_product_variants_selling_price
        CHECK (selling_price IS NULL OR selling_price >= 0);

UPDATE catalog.product_variants v
SET barcode = v.sku,
    variant_name = v.name,
    selling_price = p.price + v.price_adjustment
FROM catalog.products p
WHERE p.id = v.product_id;

WITH first_variant AS (
    SELECT DISTINCT ON (product_id) id
    FROM catalog.product_variants
    ORDER BY product_id, id
)
UPDATE catalog.product_variants v
SET is_default = TRUE
FROM first_variant f
WHERE v.id = f.id;

INSERT INTO catalog.product_variants (
    product_id,
    sku,
    name,
    price_adjustment,
    attributes,
    active,
    barcode,
    variant_name,
    selling_price,
    is_default
)
SELECT p.id,
       p.sku,
       p.name,
       0,
       '{}'::jsonb,
       p.active,
       p.sku,
       'Default',
       p.price,
       TRUE
FROM catalog.products p
WHERE NOT EXISTS (
    SELECT 1
    FROM catalog.product_variants v
    WHERE v.product_id = p.id
);

ALTER TABLE catalog.product_variants
    ALTER COLUMN barcode SET NOT NULL,
    ALTER COLUMN variant_name SET NOT NULL,
    ALTER COLUMN selling_price SET NOT NULL;

CREATE UNIQUE INDEX uk_product_variants_barcode_ci
    ON catalog.product_variants (LOWER(barcode));

CREATE UNIQUE INDEX uk_product_variants_default
    ON catalog.product_variants (product_id)
    WHERE is_default;

CREATE UNIQUE INDEX uk_product_variants_id_product
    ON catalog.product_variants (id, product_id);

CREATE TABLE catalog.variant_option_types (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_variant_option_types_product_name_ci
    ON catalog.variant_option_types (product_id, LOWER(name));

CREATE TABLE catalog.variant_option_values (
    id BIGSERIAL PRIMARY KEY,
    option_type_id BIGINT NOT NULL REFERENCES catalog.variant_option_types(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_variant_option_values_type_value_ci
    ON catalog.variant_option_values (option_type_id, LOWER(value));

CREATE TABLE catalog.variant_option_assignments (
    variant_id BIGINT NOT NULL REFERENCES catalog.product_variants(id) ON DELETE CASCADE,
    option_value_id BIGINT NOT NULL REFERENCES catalog.variant_option_values(id) ON DELETE CASCADE,
    PRIMARY KEY (variant_id, option_value_id)
);

-- A variant can select only one value from any one option type. The denormalized
-- option_type_id lets PostgreSQL enforce that rule directly.
ALTER TABLE catalog.variant_option_assignments
    ADD COLUMN option_type_id BIGINT NOT NULL REFERENCES catalog.variant_option_types(id) ON DELETE CASCADE,
    ADD CONSTRAINT uk_variant_option_type UNIQUE (variant_id, option_type_id);

CREATE TABLE catalog.product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    variant_id BIGINT,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(250),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_images_variant_product
        FOREIGN KEY (variant_id, product_id)
        REFERENCES catalog.product_variants(id, product_id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX uk_product_images_primary_master
    ON catalog.product_images (product_id)
    WHERE is_primary AND variant_id IS NULL;

CREATE UNIQUE INDEX uk_product_images_primary_variant
    ON catalog.product_images (variant_id)
    WHERE is_primary AND variant_id IS NOT NULL;

CREATE TABLE catalog.variant_packaging (
    variant_id BIGINT PRIMARY KEY REFERENCES catalog.product_variants(id) ON DELETE CASCADE,
    length_cm NUMERIC(10,2) NOT NULL CHECK (length_cm > 0),
    width_cm NUMERIC(10,2) NOT NULL CHECK (width_cm > 0),
    height_cm NUMERIC(10,2) NOT NULL CHECK (height_cm > 0),
    weight_kg NUMERIC(10,3) NOT NULL CHECK (weight_kg > 0),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE catalog.product_customs_information (
    product_id BIGINT PRIMARY KEY REFERENCES catalog.products(id) ON DELETE CASCADE,
    chinese_name VARCHAR(250),
    english_name VARCHAR(250),
    hs_code VARCHAR(20),
    invoice_amount NUMERIC(12,2) CHECK (invoice_amount IS NULL OR invoice_amount >= 0),
    invoice_currency CHAR(3),
    gross_weight_kg NUMERIC(10,3) CHECK (gross_weight_kg IS NULL OR gross_weight_kg > 0),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_customs_invoice_currency
        CHECK (invoice_amount IS NULL OR invoice_currency IS NOT NULL),
    CONSTRAINT ck_customs_currency_format
        CHECK (invoice_currency IS NULL OR invoice_currency ~ '^[A-Z]{3}$')
);

CREATE TABLE catalog.product_cost_information (
    product_id BIGINT PRIMARY KEY REFERENCES catalog.products(id) ON DELETE CASCADE,
    source_url TEXT,
    purchase_duration_days INTEGER CHECK (purchase_duration_days IS NULL OR purchase_duration_days >= 0),
    sales_tax_amount NUMERIC(12,2) CHECK (sales_tax_amount IS NULL OR sales_tax_amount >= 0),
    tax_currency CHAR(3),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_cost_tax_currency
        CHECK (sales_tax_amount IS NULL OR tax_currency IS NOT NULL),
    CONSTRAINT ck_cost_currency_format
        CHECK (tax_currency IS NULL OR tax_currency ~ '^[A-Z]{3}$')
);

CREATE TABLE catalog.channels (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE catalog.product_channel_listings (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL REFERENCES catalog.channels(id),
    selling_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    external_product_id VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_product_channel_listing UNIQUE (product_id, channel_id),
    CONSTRAINT ck_product_channel_selling_status
        CHECK (selling_status IN ('DRAFT', 'READY', 'ACTIVE', 'PAUSED', 'REJECTED', 'ARCHIVED'))
);

INSERT INTO catalog.channels (code, name)
VALUES ('INTERNAL', 'Internal Sales'),
       ('SHOPEE', 'Shopee'),
       ('LAZADA', 'Lazada'),
       ('TIKTOK_SHOP', 'TikTok Shop');

-- Add the new SKU-level relationships while retaining product_id for the
-- currently deployed API. Existing rows are linked to each product's default
-- variant, and compatibility triggers do the same for new legacy writes.
ALTER TABLE inventory.stock
    ADD COLUMN variant_id BIGINT REFERENCES catalog.product_variants(id);

ALTER TABLE inventory.stock_movements
    ADD COLUMN variant_id BIGINT REFERENCES catalog.product_variants(id);

ALTER TABLE inventory.reservations
    ADD COLUMN variant_id BIGINT REFERENCES catalog.product_variants(id);

ALTER TABLE carts.cart_items
    ADD COLUMN variant_id BIGINT REFERENCES catalog.product_variants(id);

ALTER TABLE pricing.product_pricing
    ADD COLUMN variant_id BIGINT REFERENCES catalog.product_variants(id);

ALTER TABLE orders.order_items
    ADD COLUMN variant_id BIGINT REFERENCES catalog.product_variants(id),
    ADD COLUMN spu VARCHAR(80),
    ADD COLUMN barcode VARCHAR(64),
    ADD COLUMN variant_name VARCHAR(250);

UPDATE inventory.stock s
SET variant_id = v.id
FROM catalog.product_variants v
WHERE v.product_id = s.product_id
  AND v.is_default;

UPDATE inventory.stock_movements m
SET variant_id = v.id
FROM catalog.product_variants v
WHERE v.product_id = m.product_id
  AND v.is_default;

UPDATE inventory.reservations r
SET variant_id = v.id
FROM catalog.product_variants v
WHERE v.product_id = r.product_id
  AND v.is_default;

UPDATE carts.cart_items i
SET variant_id = v.id
FROM catalog.product_variants v
WHERE v.product_id = i.product_id
  AND v.is_default;

UPDATE pricing.product_pricing pp
SET variant_id = v.id
FROM catalog.product_variants v
WHERE v.product_id = pp.product_id
  AND v.is_default;

UPDATE orders.order_items i
SET variant_id = v.id,
    spu = p.spu,
    barcode = v.barcode,
    variant_name = v.variant_name
FROM catalog.products p
JOIN catalog.product_variants v
  ON v.product_id = p.id
 AND v.is_default
WHERE i.product_id = p.id;

CREATE UNIQUE INDEX uk_inventory_stock_variant
    ON inventory.stock (variant_id);

CREATE INDEX idx_stock_movements_variant
    ON inventory.stock_movements (variant_id, created_at DESC);

CREATE INDEX idx_reservations_variant_status
    ON inventory.reservations (variant_id, status);

CREATE UNIQUE INDEX uk_cart_items_cart_variant
    ON carts.cart_items (cart_id, variant_id);

CREATE UNIQUE INDEX uk_product_pricing_variant
    ON pricing.product_pricing (variant_id);

CREATE INDEX idx_order_items_variant
    ON orders.order_items (variant_id);

CREATE OR REPLACE FUNCTION catalog.sync_legacy_product_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.name IS DISTINCT FROM OLD.name AND NEW.master_name = OLD.master_name THEN
            NEW.master_name := NEW.name;
        END IF;
        IF NEW.sku IS DISTINCT FROM OLD.sku AND NEW.spu = OLD.spu THEN
            NEW.spu := NEW.sku;
        END IF;
        IF NEW.description IS DISTINCT FROM OLD.description THEN
            IF NEW.short_description = OLD.short_description THEN
                NEW.short_description := COALESCE(NEW.description, NEW.name);
            END IF;
            IF NEW.long_description = OLD.long_description THEN
                NEW.long_description := COALESCE(NEW.description, NEW.name);
            END IF;
        END IF;
    END IF;

    NEW.master_name := COALESCE(NEW.master_name, NEW.name);
    NEW.spu := COALESCE(NEW.spu, NEW.sku);
    NEW.brand_id := COALESCE(
        NEW.brand_id,
        (SELECT id FROM catalog.brands WHERE name = 'UNBRANDED')
    );
    NEW.category_id := COALESCE(
        NEW.category_id,
        (SELECT id FROM catalog.categories WHERE code = 'UNCATEGORIZED')
    );
    NEW.short_description := COALESCE(NEW.short_description, NEW.description, NEW.name);
    NEW.long_description := COALESCE(NEW.long_description, NEW.description, NEW.name);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_sync_legacy_fields
BEFORE INSERT OR UPDATE ON catalog.products
FOR EACH ROW
EXECUTE FUNCTION catalog.sync_legacy_product_fields();

CREATE OR REPLACE FUNCTION catalog.sync_legacy_variant_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    product_price NUMERIC(12,2);
BEGIN
    SELECT price INTO product_price
    FROM catalog.products
    WHERE id = NEW.product_id;

    NEW.barcode := COALESCE(NEW.barcode, NEW.sku);
    NEW.variant_name := COALESCE(NEW.variant_name, NEW.name);
    NEW.selling_price := COALESCE(
        NEW.selling_price,
        product_price + COALESCE(NEW.price_adjustment, 0)
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_variants_sync_legacy_fields
BEFORE INSERT OR UPDATE ON catalog.product_variants
FOR EACH ROW
EXECUTE FUNCTION catalog.sync_legacy_variant_fields();

CREATE OR REPLACE FUNCTION catalog.create_legacy_default_variant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO catalog.product_variants (
        product_id,
        sku,
        name,
        price_adjustment,
        attributes,
        active,
        barcode,
        variant_name,
        selling_price,
        is_default
    )
    VALUES (
        NEW.id,
        NEW.sku,
        NEW.name,
        0,
        '{}'::jsonb,
        NEW.active,
        NEW.sku,
        'Default',
        NEW.price,
        TRUE
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_create_default_variant
AFTER INSERT ON catalog.products
FOR EACH ROW
EXECUTE FUNCTION catalog.create_legacy_default_variant();

CREATE OR REPLACE FUNCTION catalog.default_variant_id(product BIGINT)
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
    SELECT id
    FROM catalog.product_variants
    WHERE product_id = product
      AND is_default
$$;

CREATE OR REPLACE FUNCTION catalog.populate_legacy_variant_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.variant_id := COALESCE(
        NEW.variant_id,
        catalog.default_variant_id(NEW.product_id)
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_populate_variant
BEFORE INSERT OR UPDATE ON inventory.stock
FOR EACH ROW
EXECUTE FUNCTION catalog.populate_legacy_variant_reference();

CREATE TRIGGER trg_stock_movements_populate_variant
BEFORE INSERT OR UPDATE ON inventory.stock_movements
FOR EACH ROW
EXECUTE FUNCTION catalog.populate_legacy_variant_reference();

CREATE TRIGGER trg_reservations_populate_variant
BEFORE INSERT OR UPDATE ON inventory.reservations
FOR EACH ROW
EXECUTE FUNCTION catalog.populate_legacy_variant_reference();

CREATE TRIGGER trg_cart_items_populate_variant
BEFORE INSERT OR UPDATE ON carts.cart_items
FOR EACH ROW
EXECUTE FUNCTION catalog.populate_legacy_variant_reference();

CREATE TRIGGER trg_product_pricing_populate_variant
BEFORE INSERT OR UPDATE ON pricing.product_pricing
FOR EACH ROW
EXECUTE FUNCTION catalog.populate_legacy_variant_reference();

CREATE OR REPLACE FUNCTION catalog.populate_order_item_variant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    selected_variant catalog.product_variants%ROWTYPE;
    product_spu VARCHAR(80);
BEGIN
    NEW.variant_id := COALESCE(
        NEW.variant_id,
        catalog.default_variant_id(NEW.product_id)
    );

    SELECT * INTO selected_variant
    FROM catalog.product_variants
    WHERE id = NEW.variant_id;

    SELECT spu INTO product_spu
    FROM catalog.products
    WHERE id = NEW.product_id;

    NEW.spu := COALESCE(NEW.spu, product_spu);
    NEW.barcode := COALESCE(NEW.barcode, selected_variant.barcode);
    NEW.variant_name := COALESCE(NEW.variant_name, selected_variant.variant_name);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_items_populate_variant
BEFORE INSERT OR UPDATE ON orders.order_items
FOR EACH ROW
EXECUTE FUNCTION catalog.populate_order_item_variant();

COMMENT ON COLUMN catalog.products.sku IS
    'Legacy compatibility field; canonical SKU is catalog.product_variants.sku';
COMMENT ON COLUMN catalog.products.price IS
    'Legacy compatibility field; canonical selling price is variant-level';
COMMENT ON COLUMN catalog.product_variants.attributes IS
    'Legacy compatibility field; canonical options use variant_option_* tables';
COMMENT ON COLUMN inventory.stock.product_id IS
    'Legacy compatibility field; canonical inventory owner is variant_id';
COMMENT ON COLUMN orders.order_items.product_id IS
    'Master product reference retained alongside the exact variant_id';
