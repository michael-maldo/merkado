\set ON_ERROR_STOP on

BEGIN;

-- Replace customer and sales activity without changing the product catalogue,
-- identity, pricing rules, channels, or management configuration.
TRUNCATE TABLE clients.clients, orders.sales_orders RESTART IDENTITY CASCADE;

-- Restore the deterministic opening stock from seed-product-showcase.sql so
-- rerunning this script always produces identical inventory balances.
UPDATE inventory.stock stock
SET quantity = 20 + ((stock.variant_id * 17) % 480),
    reserved = 0,
    version = 0;

INSERT INTO clients.clients (
    name, phone, address, social_handle, email, active, created_at, updated_at
)
SELECT
    CASE n % 5
      WHEN 0 THEN 'Avery Morgan'
      WHEN 1 THEN 'Jordan Santos'
      WHEN 2 THEN 'Taylor Chen'
      WHEN 3 THEN 'Morgan Patel'
      ELSE 'Casey Williams'
    END || ' ' || lpad(n::text, 3, '0'),
    '+61 4' || lpad((10000000 + n)::text, 8, '0'),
    (10 + n) || ' Demo Street, Melbourne VIC ' || (3000 + (n % 90)),
    '@customer' || lpad(n::text, 3, '0'),
    'customer' || lpad(n::text, 3, '0') || '@example.test',
    TRUE,
    CURRENT_TIMESTAMP - ((250 - n) || ' days')::interval,
    CURRENT_TIMESTAMP - ((n % 20) || ' days')::interval
FROM generate_series(1, 250) n;

INSERT INTO clients.addresses (
    client_id, label, line1, city, state, postal_code, country, is_default
)
SELECT id, 'Home', address, 'Melbourne', 'VIC', (3000 + (id % 90))::text, 'AU', TRUE
FROM clients.clients;

CREATE TEMP TABLE seed_orders (
    seed_no integer PRIMARY KEY,
    order_id bigint,
    status varchar(32),
    created_at timestamp
) ON COMMIT DROP;

INSERT INTO seed_orders (seed_no, status, created_at)
SELECT n,
       CASE n % 7
         WHEN 0 THEN 'PAYMENT_PENDING'
         WHEN 1 THEN 'PAYMENT_VERIFIED'
         WHEN 2 THEN 'PACKED'
         WHEN 3 THEN 'DISPATCHED'
         WHEN 4 THEN 'COMPLETED'
         WHEN 5 THEN 'CANCELLED'
         ELSE 'FAILED'
       END,
       CURRENT_TIMESTAMP - ((n % 180) || ' days')::interval - ((n % 12) || ' hours')::interval
FROM generate_series(1, 600) n;

INSERT INTO orders.sales_orders (
    client_id, created_by, status, total, discount_total, notes, created_at, updated_at
)
SELECT ((seed_no * 37 - 1) % 250) + 1,
       CASE seed_no % 3 WHEN 0 THEN 'admin' WHEN 1 THEN 'sales' ELSE 'admin' END,
       status,
       0,
       0,
       CASE WHEN seed_no % 9 = 0 THEN 'Priority customer order' WHEN seed_no % 11 = 0 THEN 'Leave at reception' ELSE NULL END,
       created_at,
       created_at + interval '2 hours'
FROM seed_orders
ORDER BY seed_no;

UPDATE seed_orders seed
SET order_id = orders.id
FROM (
    SELECT id, row_number() OVER (ORDER BY id)::integer seed_no
    FROM orders.sales_orders
) orders
WHERE orders.seed_no = seed.seed_no;

CREATE TEMP TABLE seed_variants AS
SELECT id, row_number() OVER (ORDER BY id)::integer sequence_no
FROM catalog.product_variants
WHERE active;

CREATE TEMP TABLE seed_order_lines AS
SELECT seed.order_id,
       seed.seed_no,
       line_no,
       variants.id variant_id,
       1 + ((seed.seed_no + line_no) % 3) quantity
FROM seed_orders seed
CROSS JOIN LATERAL generate_series(1, 1 + (seed.seed_no % 4)) line_no
JOIN seed_variants variants
  ON variants.sequence_no = 1 + ((seed.seed_no * 13 + line_no * 997) % (SELECT count(*) FROM seed_variants));

INSERT INTO orders.order_items (
    order_id, product_id, variant_id, spu, sku, barcode,
    product_name, variant_name, variant_options,
    quantity, unit_price, line_total
)
SELECT line.order_id,
       product.id,
       variant.id,
       product.spu,
       variant.sku,
       variant.barcode,
       product.master_name,
       variant.variant_name,
       COALESCE(options.snapshot, '{}'::jsonb),
       line.quantity,
       variant.selling_price,
       variant.selling_price * line.quantity
FROM seed_order_lines line
JOIN catalog.product_variants variant ON variant.id = line.variant_id
JOIN catalog.products product ON product.id = variant.product_id
LEFT JOIN LATERAL (
    SELECT jsonb_object_agg(option_type.name, option_value.value) snapshot
    FROM catalog.variant_option_assignments assignment
    JOIN catalog.variant_option_types option_type ON option_type.id = assignment.option_type_id
    JOIN catalog.variant_option_values option_value ON option_value.id = assignment.option_value_id
    WHERE assignment.variant_id = variant.id
) options ON TRUE;

INSERT INTO orders.order_discounts (order_id, code, description, amount, created_at)
SELECT seed.order_id,
       CASE WHEN seed.seed_no % 10 = 0 THEN 'LOYALTY10' ELSE 'WELCOME5' END,
       'Seeded approved discount',
       round(sum(item.line_total) * CASE WHEN seed.seed_no % 10 = 0 THEN 0.10 ELSE 0.05 END, 2),
       seed.created_at + interval '5 minutes'
FROM seed_orders seed
JOIN orders.order_items item ON item.order_id = seed.order_id
WHERE seed.seed_no % 5 = 0
GROUP BY seed.order_id, seed.seed_no, seed.created_at;

UPDATE orders.sales_orders sales_order
SET discount_total = totals.discount_total,
    total = greatest(totals.subtotal - totals.discount_total, 0)
FROM (
    SELECT item.order_id,
           sum(item.line_total) subtotal,
           COALESCE((SELECT sum(discount.amount) FROM orders.order_discounts discount WHERE discount.order_id = item.order_id), 0) discount_total
    FROM orders.order_items item
    GROUP BY item.order_id
) totals
WHERE totals.order_id = sales_order.id;

INSERT INTO orders.order_history (order_id, from_status, to_status, changed_by, note, created_at)
SELECT id, NULL, 'PAYMENT_PENDING', created_by, 'Order created', created_at
FROM orders.sales_orders;

INSERT INTO orders.order_history (order_id, from_status, to_status, changed_by, note, created_at)
SELECT id, 'PAYMENT_PENDING', status, 'admin', 'Seeded workflow state', created_at + interval '1 hour'
FROM orders.sales_orders
WHERE status <> 'PAYMENT_PENDING';

INSERT INTO warehouse.shipments (
    order_id, status, tracking_number, carrier,
    packed_at, dispatched_at, delivered_at, created_at, updated_at
)
SELECT id,
       CASE status WHEN 'PAYMENT_VERIFIED' THEN 'CREATED' WHEN 'PACKED' THEN 'PACKED' WHEN 'DISPATCHED' THEN 'DISPATCHED' ELSE 'DELIVERED' END,
       CASE WHEN status IN ('DISPATCHED', 'COMPLETED') THEN 'MK' || lpad(id::text, 10, '0') ELSE NULL END,
       CASE WHEN status IN ('DISPATCHED', 'COMPLETED') THEN CASE id % 3 WHEN 0 THEN 'Australia Post' WHEN 1 THEN 'DHL' ELSE 'StarTrack' END ELSE NULL END,
       CASE WHEN status IN ('PACKED', 'DISPATCHED', 'COMPLETED') THEN created_at + interval '4 hours' END,
       CASE WHEN status IN ('DISPATCHED', 'COMPLETED') THEN created_at + interval '1 day' END,
       CASE WHEN status = 'COMPLETED' THEN created_at + interval '4 days' END,
       created_at + interval '2 hours',
       created_at + interval '4 hours'
FROM orders.sales_orders
WHERE status IN ('PAYMENT_VERIFIED', 'PACKED', 'DISPATCHED', 'COMPLETED');

-- Reserve stock for open orders and consume stock for dispatched/completed orders.
WITH effects AS (
    SELECT item.variant_id,
           sum(item.quantity) FILTER (WHERE sales_order.status IN ('PAYMENT_PENDING','PAYMENT_VERIFIED','PACKED')) reserved,
           sum(item.quantity) FILTER (WHERE sales_order.status IN ('DISPATCHED','COMPLETED')) consumed
    FROM orders.order_items item
    JOIN orders.sales_orders sales_order ON sales_order.id = item.order_id
    GROUP BY item.variant_id
)
UPDATE inventory.stock stock
SET reserved = COALESCE(effects.reserved, 0),
    quantity = stock.quantity - COALESCE(effects.consumed, 0),
    version = 0
FROM effects
WHERE effects.variant_id = stock.variant_id;

COMMIT;

SELECT 'clients' entity, count(*) count FROM clients.clients
UNION ALL SELECT 'orders', count(*) FROM orders.sales_orders
UNION ALL SELECT 'order lines', count(*) FROM orders.order_items
UNION ALL SELECT 'discounts', count(*) FROM orders.order_discounts
UNION ALL SELECT 'shipments', count(*) FROM warehouse.shipments
ORDER BY entity;

SELECT status, count(*) orders
FROM orders.sales_orders
GROUP BY status
ORDER BY status;
