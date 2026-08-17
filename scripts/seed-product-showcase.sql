\set ON_ERROR_STOP on

BEGIN;

-- This is intentionally a catalogue/transaction reset. Identity users, roles,
-- channels, permissions, commission rules, and other platform configuration remain.
TRUNCATE TABLE
    audit.audit_logs,
    clients.clients,
    carts.carts,
    orders.sales_orders,
    catalog.products,
    catalog.categories,
    catalog.brands
RESTART IDENTITY CASCADE;

CREATE TEMP TABLE seed_roots (
    root_no integer PRIMARY KEY,
    root_name text NOT NULL,
    root_code text NOT NULL,
    product_noun text NOT NULL,
    option_name text NOT NULL,
    option_values text[] NOT NULL,
    departments text[] NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_roots VALUES
    (1, 'Apparel',       'APPAREL',    'Essential',      'Size',     ARRAY['S','M','L','XL'],                         ARRAY['Women','Men','Kids','Unisex']),
    (2, 'Footwear',      'FOOTWEAR',   'Shoe',           'Size',     ARRAY['US 7','US 8','US 9','US 10'],             ARRAY['Women','Men','Kids','Performance']),
    (3, 'Beauty',        'BEAUTY',     'Care Set',       'Scent',    ARRAY['Citrus','Floral','Fresh','Unscented'],     ARRAY['Skin Care','Hair Care','Bath & Body','Fragrance']),
    (4, 'Electronics',   'ELECTRONICS','Device',         'Color',    ARRAY['Black','White','Blue','Silver'],           ARRAY['Mobile','Computing','Audio','Smart Home']),
    (5, 'Home & Living', 'HOME',       'Home Essential', 'Color',    ARRAY['Natural','White','Charcoal','Sage'],        ARRAY['Kitchen','Bedroom','Bathroom','Decor']),
    (6, 'Sports',        'SPORTS',     'Gear',           'Size',     ARRAY['Small','Medium','Large','Extra Large'],     ARRAY['Fitness','Running','Outdoor','Team Sports']),
    (7, 'Food & Grocery','GROCERY',    'Pantry Item',    'Pack Size',ARRAY['Single','Pack of 2','Pack of 4','Family'],  ARRAY['Snacks','Beverages','Pantry','Organic']),
    (8, 'Pet Supplies',  'PETS',       'Pet Essential',  'Pet Size', ARRAY['Mini','Small','Medium','Large'],            ARRAY['Dogs','Cats','Birds','Small Pets']),
    (9, 'Toys & Games',  'TOYS',       'Play Set',       'Age Group',ARRAY['3+','6+','9+','12+'],                       ARRAY['Creative','Educational','Outdoor Play','Games']),
    (10,'Automotive',    'AUTO',       'Auto Accessory', 'Fit',      ARRAY['Compact','Standard','Large','Universal'],  ARRAY['Interior','Exterior','Tools','Car Care']);

INSERT INTO catalog.categories (name, code, description, active)
SELECT root_name, root_code, root_name || ' products', TRUE
FROM seed_roots
ORDER BY root_no;

CREATE TEMP TABLE seed_departments (
    root_no integer,
    department_no integer,
    department_name text,
    category_id bigint,
    PRIMARY KEY (root_no, department_no)
) ON COMMIT DROP;

INSERT INTO catalog.categories (name, code, description, active, parent_id)
SELECT department_name,
       root_code || '-' || lpad(department_no::text, 2, '0'),
       department_name || ' within ' || root_name,
       TRUE,
       root_category.id
FROM seed_roots r
CROSS JOIN LATERAL unnest(r.departments) WITH ORDINALITY AS d(department_name, department_no)
JOIN catalog.categories root_category ON root_category.code = r.root_code
ORDER BY r.root_no, department_no;

INSERT INTO seed_departments
SELECT r.root_no, d.department_no::integer, d.department_name, child.id
FROM seed_roots r
CROSS JOIN LATERAL unnest(r.departments) WITH ORDINALITY AS d(department_name, department_no)
JOIN catalog.categories root_category ON root_category.code = r.root_code
JOIN catalog.categories child
  ON child.parent_id = root_category.id AND child.name = d.department_name;

CREATE TEMP TABLE seed_collections (
    root_no integer,
    department_no integer,
    collection_no integer,
    category_id bigint,
    PRIMARY KEY (root_no, department_no, collection_no)
) ON COMMIT DROP;

WITH collection_names(collection_no, collection_name) AS (
    VALUES (1, 'Essentials'), (2, 'Everyday'), (3, 'Premium'), (4, 'Outdoor'), (5, 'Seasonal')
), inserted AS (
    INSERT INTO catalog.categories (name, code, description, active, parent_id)
    SELECT c.collection_name,
           r.root_code || '-' || lpad(d.department_no::text, 2, '0') || '-' || lpad(c.collection_no::text, 2, '0'),
           c.collection_name || ' collection for ' || d.department_name,
           TRUE,
           d.category_id
    FROM seed_departments d
    JOIN seed_roots r USING (root_no)
    CROSS JOIN collection_names c
    ORDER BY d.root_no, d.department_no, c.collection_no
    RETURNING id, parent_id, name
)
INSERT INTO seed_collections
SELECT d.root_no, d.department_no, c.collection_no, i.id
FROM inserted i
JOIN seed_departments d ON d.category_id = i.parent_id
JOIN collection_names c ON c.collection_name = i.name;

INSERT INTO catalog.brands (name, description, active)
SELECT 'Merkado Brand ' || lpad(n::text, 2, '0'),
       'Showcase brand ' || n || ' for catalogue demonstrations',
       TRUE
FROM generate_series(1, 20) n;

CREATE TEMP TABLE seed_products (
    seed_no integer PRIMARY KEY,
    root_no integer NOT NULL,
    option_name text NOT NULL,
    option_values text[] NOT NULL,
    product_id bigint
) ON COMMIT DROP;

INSERT INTO seed_products (seed_no, root_no, option_name, option_values)
SELECT ((r.root_no - 1) * 200) + n, r.root_no, r.option_name, r.option_values
FROM seed_roots r
CROSS JOIN generate_series(1, 200) n;

INSERT INTO catalog.products (
    sku, name, price, active, category_id, description, master_name, upc, spu,
    brand_id, condition, shelf_life_days, minimum_purchase_quantity,
    short_description, long_description, has_variations, preorder,
    remarks_1, remarks_2, remarks_3
)
SELECT
    'MK-' || lpad(s.seed_no::text, 6, '0') || '-01',
    r.root_name || ' ' || r.product_noun || ' ' || lpad(s.seed_no::text, 4, '0'),
    round((12.50 + ((s.seed_no * 137) % 48000) / 100.0)::numeric, 2),
    TRUE,
    c.category_id,
    'A demonstration ' || lower(r.product_noun) || ' from the ' || r.root_name || ' catalogue.',
    r.root_name || ' ' || r.product_noun || ' ' || lpad(s.seed_no::text, 4, '0'),
    '93' || lpad(s.seed_no::text, 10, '0'),
    'SPU-' || lpad(s.seed_no::text, 6, '0'),
    ((s.seed_no - 1) % 20) + 1,
    CASE WHEN s.seed_no % 19 = 0 THEN 'REFURBISHED' ELSE 'NEW' END,
    CASE WHEN r.root_no IN (3, 7) THEN 365 + (s.seed_no % 365) ELSE NULL END,
    CASE WHEN s.seed_no % 11 = 0 THEN 2 ELSE 1 END,
    'Quality ' || lower(r.product_noun) || ' with four selectable ' || lower(r.option_name) || ' options.',
    'A fully populated showcase product used to demonstrate category navigation, variants, inventory, pricing, packaging, customs data, and purchasing information.',
    TRUE,
    (s.seed_no % 17 = 0),
    'Catalogue seed 2026',
    CASE WHEN s.seed_no % 17 = 0 THEN 'Preorder item' ELSE 'Ready stock item' END,
    'Demo product ' || s.seed_no
FROM seed_products s
JOIN seed_roots r USING (root_no)
JOIN seed_collections c
  ON c.root_no = s.root_no
 AND c.department_no = (((s.seed_no - 1) % 20) / 5) + 1
 AND c.collection_no = ((s.seed_no - 1) % 5) + 1
ORDER BY s.seed_no;

UPDATE seed_products s
SET product_id = p.id
FROM catalog.products p
WHERE p.spu = 'SPU-' || lpad(s.seed_no::text, 6, '0');

INSERT INTO catalog.variant_option_types (product_id, name, sort_order, active)
SELECT product_id, option_name, 1, TRUE
FROM seed_products;

INSERT INTO catalog.variant_option_values (option_type_id, value, sort_order, active)
SELECT t.id, value_name, ordinality::integer, TRUE
FROM seed_products s
JOIN catalog.variant_option_types t ON t.product_id = s.product_id
CROSS JOIN LATERAL unnest(s.option_values) WITH ORDINALITY AS value_list(value_name, ordinality);

-- Convert the automatically created legacy variant into option 1.
UPDATE catalog.product_variants v
SET variant_name = s.option_values[1],
    name = s.option_values[1],
    attributes = jsonb_build_object(s.option_name, s.option_values[1])
FROM seed_products s
WHERE v.product_id = s.product_id AND v.is_default;

INSERT INTO catalog.product_variants (
    product_id, sku, name, price_adjustment, attributes, active,
    barcode, variant_name, selling_price, is_default
)
SELECT s.product_id,
       'MK-' || lpad(s.seed_no::text, 6, '0') || '-' || option_no,
       s.option_values[option_no],
       (option_no - 1) * 2.50,
       jsonb_build_object(s.option_name, s.option_values[option_no]),
       TRUE,
       '93' || lpad(s.seed_no::text, 8, '0') || lpad(option_no::text, 2, '0'),
       s.option_values[option_no],
       p.price + ((option_no - 1) * 2.50),
       FALSE
FROM seed_products s
JOIN catalog.products p ON p.id = s.product_id
CROSS JOIN generate_series(2, 4) option_no;

INSERT INTO catalog.variant_option_assignments (variant_id, option_value_id, option_type_id)
SELECT v.id, ov.id, ot.id
FROM seed_products s
JOIN catalog.variant_option_types ot ON ot.product_id = s.product_id
JOIN catalog.variant_option_values ov ON ov.option_type_id = ot.id
JOIN catalog.product_variants v
  ON v.product_id = s.product_id AND v.variant_name = ov.value;

INSERT INTO catalog.variant_packaging (variant_id, length_cm, width_cm, height_cm, weight_kg)
SELECT v.id,
       12 + (s.seed_no % 28),
       8 + (s.seed_no % 20),
       4 + (v.id % 16),
       round((0.20 + (s.seed_no % 90) / 10.0)::numeric, 3)
FROM seed_products s
JOIN catalog.product_variants v ON v.product_id = s.product_id;

INSERT INTO catalog.product_customs_information (
    product_id, chinese_name, english_name, hs_code,
    invoice_amount, invoice_currency, gross_weight_kg
)
SELECT s.product_id,
       '商品 ' || s.seed_no,
       p.master_name,
       lpad((610000 + (s.seed_no % 90000))::text, 8, '0'),
       round((p.price * 0.62)::numeric, 2),
       'AUD',
       round((0.30 + (s.seed_no % 100) / 10.0)::numeric, 3)
FROM seed_products s
JOIN catalog.products p ON p.id = s.product_id;

INSERT INTO catalog.product_cost_information (
    product_id, source_url, purchase_duration_days, sales_tax_amount, tax_currency
)
SELECT s.product_id,
       'https://supplier.example/products/' || p.spu,
       3 + (s.seed_no % 28),
       round((p.price * 0.10)::numeric, 2),
       'AUD'
FROM seed_products s
JOIN catalog.products p ON p.id = s.product_id;

INSERT INTO catalog.product_images (
    product_id, image_url, alt_text, is_primary, sort_order
)
SELECT s.product_id,
       'https://picsum.photos/seed/merkado-' || lpad(s.seed_no::text, 6, '0') || '/800/800',
       p.master_name,
       TRUE,
       1
FROM seed_products s
JOIN catalog.products p ON p.id = s.product_id;

INSERT INTO catalog.product_channel_listings (
    product_id, channel_id, selling_status, external_product_id
)
SELECT s.product_id,
       channel.id,
       CASE WHEN channel.code = 'INTERNAL' THEN 'ACTIVE' ELSE 'READY' END,
       channel.code || '-' || lpad(s.seed_no::text, 6, '0')
FROM seed_products s
CROSS JOIN catalog.channels channel;

INSERT INTO inventory.stock (product_id, variant_id, quantity, reserved, version)
SELECT v.product_id, v.id, 20 + ((v.id * 17) % 480), 0, 0
FROM catalog.product_variants v;

INSERT INTO pricing.product_pricing (product_id, variant_id, price, effective_from)
SELECT v.product_id, v.id, v.selling_price, CURRENT_TIMESTAMP
FROM catalog.product_variants v;

COMMIT;

SELECT 'products' AS entity, count(*) AS count FROM catalog.products
UNION ALL SELECT 'categories', count(*) FROM catalog.categories
UNION ALL SELECT 'variants', count(*) FROM catalog.product_variants
UNION ALL SELECT 'variant assignments', count(*) FROM catalog.variant_option_assignments
UNION ALL SELECT 'stock records', count(*) FROM inventory.stock
UNION ALL SELECT 'orders', count(*) FROM orders.sales_orders
UNION ALL SELECT 'carts', count(*) FROM carts.carts
ORDER BY entity;
